#!/usr/bin/env python3
"""Parameter sweep: window x K x alpha x C x epsilon_mode -> sweep_results.csv

Execution structure:
  For each epsilon_mode (fixed, adaptive):
    For each window:        train Word2Vec + compute homology (once per window+mode)
      For each K:           build feature matrix (once per window+K+mode)
        For each alpha x C: validate (fast, alpha applied in memory)

Results appended to results/sweep_results.csv (original) or sweep_results_extended.csv.
Resume-safe: existing (window, K, alpha, C, epsilon_mode) rows are skipped.

Usage:
  python scripts/07_sweep.py                                   # full sweep, fixed only
  python scripts/07_sweep.py --windows 15,20 --k-values 200,300 --epsilon-modes fixed,adaptive
  python scripts/07_sweep.py --windows 5,10 --k-values 50 --alphas 0.7 --c-values 10
"""

import sys
import csv
import json
import time
import argparse
import subprocess
from pathlib import Path
from itertools import product

import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


SCRIPTS = Path(__file__).parent
RESULTS_DIR = Path(__file__).parent.parent / 'results'
FEATURES_DIR = Path(__file__).parent.parent / 'data' / 'features'

CSV_FIELDS = [
    'window', 'k', 'alpha', 'C', 'epsilon_mode', 'accuracy', 'p_value',
    'acc_romance', 'acc_mystery', 'acc_western', 'acc_fantasy',
    'acc_scifi', 'acc_horror', 'acc_historical', 'acc_literary',
    'acc_adventure', 'acc_gothic',
]


def run_script(script_name, extra_args):
    """Run a pipeline script as a subprocess, streaming output live."""
    cmd = [sys.executable, str(SCRIPTS / script_name)] + extra_args
    result = subprocess.run(cmd, check=False)
    return result.returncode == 0


def load_existing_results(csv_path):
    """Return set of (window, k, alpha, C, epsilon_mode) tuples already in the CSV."""
    done = set()
    if not csv_path.exists():
        return done
    with open(csv_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                key = (int(row['window']), int(row['k']),
                       float(row['alpha']), float(row['C']),
                       row.get('epsilon_mode', 'fixed'))
                done.add(key)
            except (KeyError, ValueError):
                pass
    return done


def run_validate_inprocess(window, k, alpha, C, epsilon_mode, params):
    """Run validation in-process (faster than subprocess for sweep inner loop)."""
    features_dir = FEATURES_DIR
    suffix = '_adap' if epsilon_mode == 'adaptive' else ''
    matrix_path = features_dir / f'feature_matrix_w{window}_k{k}{suffix}.npy'
    if not matrix_path.exists():
        return None

    X_raw = np.load(str(matrix_path))
    y = np.load(str(features_dir / 'labels.npy'))
    with open(features_dir / 'book_order.json') as f:
        book_order = json.load(f)

    # Filter out unknown-genre books (label == -1)
    mask = y != -1
    if mask.sum() < len(y):
        X_raw = X_raw[mask]
        y = y[mask]
        book_order = [e for e in book_order if e['label'] != -1]

    # Apply alpha
    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)

    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.feature_selection import VarianceThreshold
    from sklearn.svm import SVC
    from sklearn.model_selection import LeaveOneOut, permutation_test_score
    from sklearn.model_selection import cross_val_predict

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('vt', VarianceThreshold(threshold=1e-4)),
        ('svm', SVC(
            kernel=params['validation']['svm_kernel'],
            C=C,
            gamma=params['validation']['svm_gamma'],
            class_weight=params['validation']['svm_class_weight'],
        ))
    ])

    loo = LeaveOneOut()
    y_pred = cross_val_predict(pipe, X, y, cv=loo)
    overall_accuracy = float(np.mean(y_pred == y))

    perm_n = params['validation']['permutation_n']
    _, _, p_value = permutation_test_score(
        pipe, X, y, cv=LeaveOneOut(),
        n_permutations=perm_n,
        scoring='accuracy',
        n_jobs=-1,
        random_state=42,
    )
    p_value = float(p_value)

    label_to_genre = {e['label']: e['genre'] for e in book_order}
    genre_stats = {}
    for true, pred in zip(y, y_pred):
        genre = label_to_genre.get(int(true), 'unknown')
        if genre not in genre_stats:
            genre_stats[genre] = {'correct': 0, 'total': 0}
        genre_stats[genre]['total'] += 1
        if true == pred:
            genre_stats[genre]['correct'] += 1

    row = {
        'window': window, 'k': k, 'alpha': alpha, 'C': C,
        'epsilon_mode': epsilon_mode,
        'accuracy': overall_accuracy, 'p_value': p_value,
    }
    for genre, stats in genre_stats.items():
        acc = stats['correct'] / stats['total'] if stats['total'] > 0 else 0.0
        row[f'acc_{genre}'] = round(acc, 4)

    return row


def append_csv(csv_path, row):
    write_header = not csv_path.exists()
    with open(csv_path, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction='ignore')
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def print_summary(csv_path, top_n=10):
    if not csv_path.exists():
        return
    rows = []
    with open(csv_path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                rows.append({
                    'window': int(row['window']),
                    'k': int(row['k']),
                    'alpha': float(row['alpha']),
                    'C': float(row['C']),
                    'epsilon_mode': row.get('epsilon_mode', 'fixed'),
                    'accuracy': float(row['accuracy']),
                    'p_value': float(row['p_value']),
                    'acc_horror': float(row.get('acc_horror', 0)),
                })
            except (KeyError, ValueError):
                pass

    if not rows:
        return

    rows_sorted = sorted(rows, key=lambda r: (-r['accuracy'], r['p_value']))

    print("\n== Top configs by overall accuracy ==")
    print(f"{'window':>6} {'k':>4} {'alpha':>5} {'C':>5} {'mode':>8}  {'acc':>6}  {'p':>6}  {'horror':>7}")
    for r in rows_sorted[:top_n]:
        print(f"{r['window']:>6} {r['k']:>4} {r['alpha']:>5.1f} {r['C']:>5.0f} {r['epsilon_mode']:>8}  "
              f"{r['accuracy']*100:>5.1f}%  {r['p_value']:>6.3f}  {r['acc_horror']*100:>6.1f}%")

    go_rows = [r for r in rows_sorted if r['p_value'] < 0.05]
    print(f"\nGO configs (p<0.05): {len(go_rows)}/{len(rows)}")
    if go_rows:
        best = go_rows[0]
        print(f"Best: window={best['window']} k={best['k']} alpha={best['alpha']} "
              f"C={best['C']} mode={best['epsilon_mode']} "
              f"acc={best['accuracy']*100:.1f}% p={best['p_value']:.3f}")


def main():
    parser = argparse.ArgumentParser(description="Full parameter sweep")
    parser.add_argument('--windows',  type=str, help='Comma-separated window values')
    parser.add_argument('--k-values', type=str, help='Comma-separated K values')
    parser.add_argument('--alphas',   type=str, help='Comma-separated alpha values')
    parser.add_argument('--c-values', type=str, help='Comma-separated C values')
    parser.add_argument('--epsilon-modes', type=str, default='fixed',
                        help='Comma-separated epsilon modes: fixed,adaptive (default: fixed)')
    parser.add_argument('--skip-train',    action='store_true')
    parser.add_argument('--skip-homology', action='store_true')
    parser.add_argument('--skip-features', action='store_true')
    parser.add_argument('--csv', type=str, default='sweep_results_extended.csv',
                        help='Output CSV filename in results/ (default: sweep_results_extended.csv)')
    args = parser.parse_args()

    params = load_params()

    windows       = [int(x)   for x in args.windows.split(',')]       if args.windows  \
                    else params['word2vec']['windows']
    k_values      = [int(x)   for x in args.k_values.split(',')]      if args.k_values \
                    else params['features']['k_clusters_sweep']
    alphas        = [float(x) for x in args.alphas.split(',')]        if args.alphas   \
                    else params['features']['alpha_sweep']
    c_values      = [float(x) for x in args.c_values.split(',')]      if args.c_values \
                    else params['validation']['svm_C_sweep']
    epsilon_modes = [x.strip() for x in args.epsilon_modes.split(',')]

    total_combos = len(epsilon_modes) * len(windows) * len(k_values) * len(alphas) * len(c_values)
    print(f"Sweep: {len(epsilon_modes)} modes x {len(windows)} windows x {len(k_values)} K x "
          f"{len(alphas)} alphas x {len(c_values)} C = {total_combos} combinations")
    print(f"  epsilon_modes={epsilon_modes}")
    print(f"  windows={windows}")
    print(f"  K={k_values}")
    print(f"  alpha={alphas}")
    print(f"  C={c_values}")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = RESULTS_DIR / args.csv
    done = load_existing_results(csv_path)
    if done:
        print(f"Resuming: {len(done)} combinations already complete, skipping.")

    t_sweep_start = time.time()

    for epsilon_mode in epsilon_modes:
        adap_flag = ['--adaptive'] if epsilon_mode == 'adaptive' else []
        tqdm.write(f"\n=== Epsilon mode: {epsilon_mode} ===")

        for window in tqdm(windows, desc=f"Windows [{epsilon_mode}]", unit="window"):

            # --- Script 03: train Word2Vec ---
            if not args.skip_train:
                tqdm.write(f"\n[window={window}] Training Word2Vec...")
                ok = run_script('03_train_embeddings.py', ['--window', str(window)])
                if not ok:
                    tqdm.write(f"  ERROR: script 03 failed for window={window}, skipping.")
                    continue
            else:
                tqdm.write(f"[window={window}] Skipping Word2Vec training.")

            # --- Script 04: compute homology ---
            suffix = '_adap' if epsilon_mode == 'adaptive' else ''
            existing_diags = list(FEATURES_DIR.glob(f'diagrams_*_w{window}{suffix}.npy'))
            if not args.skip_homology or not existing_diags:
                tqdm.write(f"[window={window}] Computing homology ({epsilon_mode})...")
                ok = run_script('04_compute_homology.py',
                                ['--window', str(window)] + adap_flag)
                if not ok:
                    tqdm.write(f"  ERROR: script 04 failed for window={window}, skipping.")
                    continue
            else:
                tqdm.write(f"[window={window}] Homology ({epsilon_mode}) exists, skipping.")

            for k in tqdm(k_values, desc=f"  K (w={window} [{epsilon_mode}])", unit="K", leave=False):

                # --- Script 05: build feature matrix ---
                matrix_path = FEATURES_DIR / f'feature_matrix_w{window}_k{k}{suffix}.npy'
                if not args.skip_features or not matrix_path.exists():
                    tqdm.write(f"  [w={window} k={k} {epsilon_mode}] Building features...")
                    ok = run_script('05_build_features.py',
                                    ['--window', str(window), '--k-clusters', str(k)] + adap_flag)
                    if not ok:
                        tqdm.write(f"    ERROR: script 05 failed for w={window} k={k}, skipping K.")
                        continue
                else:
                    tqdm.write(f"  [w={window} k={k} {epsilon_mode}] Feature matrix exists, skipping.")

                # --- Inner sweep: alpha x C ---
                combos = list(product(alphas, c_values))
                combo_bar = tqdm(combos, desc=f"    alpha x C (w={window} k={k} [{epsilon_mode}])",
                                 unit="combo", leave=False)
                for alpha, C in combo_bar:
                    key = (window, k, alpha, C, epsilon_mode)
                    if key in done:
                        combo_bar.set_postfix(status="skip")
                        continue

                    combo_bar.set_postfix(alpha=alpha, C=C, status="running")
                    t0 = time.time()
                    row = run_validate_inprocess(window, k, alpha, C, epsilon_mode, params)
                    elapsed = time.time() - t0

                    if row is None:
                        tqdm.write(f"    WARN: validation failed for {key}")
                        continue

                    done.add(key)
                    append_csv(csv_path, row)
                    acc = row['accuracy']
                    p = row['p_value']
                    verdict = "GO" if p < 0.05 else "no-go"
                    combo_bar.set_postfix(acc=f"{acc*100:.0f}%", p=f"{p:.3f}",
                                          verdict=verdict, t=f"{elapsed:.0f}s")

    total_elapsed = time.time() - t_sweep_start
    print(f"\nSweep complete in {total_elapsed/60:.1f} min. Results: {csv_path}")
    print_summary(csv_path)


if __name__ == '__main__':
    main()
