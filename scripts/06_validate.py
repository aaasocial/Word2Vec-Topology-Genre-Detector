#!/usr/bin/env python3
"""SVM + LOOCV + permutation test -> GO/NO-GO verdict.

Loads feature_matrix_w{W}_k{K}.npy (raw topo|loc concatenation),
applies alpha weighting, then runs:
  StandardScaler -> VarianceThreshold -> SVC(RBF, class_weight='balanced')

Usage:
  python scripts/06_validate.py --window 5 --k-clusters 50 --alpha 0.7 --svm-c 10
"""

import sys
import json
import time
import datetime
import argparse
from pathlib import Path

import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def write_report(results_dir, accuracy, p_value, genre_accuracies, config):
    results_dir = Path(results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    verdict = "GO" if p_value < 0.05 else "NO-GO"
    cfg_str = (f"window={config['window']} k={config['k']} "
               f"alpha={config['alpha']} C={config['C']}")
    lines = [
        f"Config: {cfg_str}",
        "-- Validation Results ------------------------------",
        f"{'Genre':<16} {'Accuracy':>8}   {'N':>3}",
    ]
    for genre, (acc, n) in sorted(genre_accuracies.items()):
        lines.append(f"{genre:<16} {acc*100:>7.1f}%   {n:>3}")
    total_n = sum(n for _, n in genre_accuracies.values())
    lines.append(f"{'Overall':<16} {accuracy*100:>7.1f}%   {total_n:>3}")
    lines.append("")
    perm_n = config.get('permutation_n', 1000)
    lines.append(f"Permutation test ({perm_n} shuffles): p = {p_value:.3f}")
    lines.append("")
    if verdict == "GO":
        lines.append("[GO] -- Topology distinguishes genres (p < 0.05)")
    else:
        lines.append(f"[NO-GO] -- Topology signal not detected (p = {p_value:.3f})")
    lines.append("----------------------------------------------------")

    report_text = "\n".join(lines)
    (results_dir / 'validation_report.txt').write_text(report_text, encoding='utf-8')
    return verdict, report_text


def append_history(log_path, accuracy, p_value, verdict, config):
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    entry = (f"[{ts}] accuracy={accuracy*100:.1f}% p={p_value:.3f} "
             f"verdict={verdict} config={config}\n")
    with open(log_path, 'a') as f:
        f.write(entry)


def main():
    parser = argparse.ArgumentParser(description="Validate topology signal via SVM + permutation test")
    parser.add_argument('--window', type=int, required=True)
    parser.add_argument('--k-clusters', type=int)
    parser.add_argument('--alpha', type=float)
    parser.add_argument('--svm-c', type=float)
    parser.add_argument('--permutation-n', type=int)
    args = parser.parse_args()

    overrides = {}
    if args.k_clusters is not None:
        overrides['features.k_clusters'] = args.k_clusters
    if args.alpha is not None:
        overrides['features.alpha'] = args.alpha
    if args.svm_c is not None:
        overrides['validation.svm_C'] = args.svm_c
    if args.permutation_n is not None:
        overrides['validation.permutation_n'] = args.permutation_n

    params = load_params(overrides)
    window = args.window
    k = params['features']['k_clusters']
    alpha = params['features']['alpha']
    C = params['validation']['svm_C']
    perm_n = params['validation']['permutation_n']

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    results_dir = Path(__file__).parent.parent / 'results'

    matrix_path = features_dir / f'feature_matrix_w{window}_k{k}.npy'
    if not matrix_path.exists():
        print(f"ERROR: {matrix_path.name} not found. "
              f"Run 05_build_features.py --window {window} --k-clusters {k} first.")
        sys.exit(1)

    X_raw = np.load(str(matrix_path))       # (n_books, 400 + k)
    y = np.load(str(features_dir / 'labels.npy'))
    with open(features_dir / 'book_order.json') as f:
        book_order = json.load(f)

    # Filter out unknown-genre books (label == -1)
    mask = y != -1
    if mask.sum() < len(y):
        n_dropped = len(y) - mask.sum()
        print(f"Dropping {n_dropped} unknown-genre book(s) from validation.")
        X_raw = X_raw[mask]
        y = y[mask]
        book_order = [e for e in book_order if e['label'] != -1]

    # Apply alpha weighting
    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)

    print(f"Loaded: {X.shape[0]} books x {X.shape[1]}D "
          f"(window={window}, k={k}, alpha={alpha}, C={C})")

    # Build pipeline: no PCA -- VarianceThreshold removes always-zero TDA pixels
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.feature_selection import VarianceThreshold
    from sklearn.svm import SVC
    from sklearn.model_selection import LeaveOneOut, permutation_test_score

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

    # LOOCV -- manual loop for tqdm progress
    loo = LeaveOneOut()
    n_splits = loo.get_n_splits(X)
    y_pred = np.empty_like(y)

    t_start = time.time()
    with tqdm(loo.split(X), total=n_splits,
              desc=f"LOOCV w={window} k={k} a={alpha} C={C}",
              unit="fold", dynamic_ncols=True) as bar:
        for train_idx, test_idx in bar:
            pipe.fit(X[train_idx], y[train_idx])
            y_pred[test_idx] = pipe.predict(X[test_idx])
            acc_so_far = np.mean(y_pred[:test_idx[0] + 1] == y[:test_idx[0] + 1])
            bar.set_postfix(acc=f"{acc_so_far*100:.0f}%")

    overall_accuracy = np.mean(y_pred == y)
    print(f"LOOCV done ({time.time()-t_start:.1f}s) -- accuracy {overall_accuracy*100:.1f}%")

    # Per-genre accuracy
    label_to_genre = {e['label']: e['genre'] for e in book_order}
    genre_stats = {}
    for true, pred in zip(y, y_pred):
        genre = label_to_genre.get(int(true), 'unknown')
        if genre not in genre_stats:
            genre_stats[genre] = {'correct': 0, 'total': 0}
        genre_stats[genre]['total'] += 1
        if true == pred:
            genre_stats[genre]['correct'] += 1
    genre_accuracies = {
        g: (v['correct'] / v['total'] if v['total'] > 0 else 0.0, v['total'])
        for g, v in genre_stats.items()
    }

    # Permutation test
    t_start = time.time()
    print(f"Permutation test ({perm_n} shuffles)...", end=' ', flush=True)
    score, perm_scores, p_value = permutation_test_score(
        pipe, X, y,
        cv=LeaveOneOut(),
        n_permutations=perm_n,
        scoring='accuracy',
        n_jobs=-1,
        random_state=42,
    )
    print(f"done ({time.time()-t_start:.1f}s)")

    config = {'window': window, 'k': k, 'alpha': alpha, 'C': C, 'permutation_n': perm_n}
    verdict, report_text = write_report(results_dir, overall_accuracy, p_value,
                                        genre_accuracies, config)
    print()
    print(report_text)

    log_path = results_dir / 'run_history.log'
    append_history(log_path, overall_accuracy, p_value, verdict, config)
    print(f"Report -> results/validation_report.txt")
    print(f"History -> results/run_history.log")

    # Return values for sweep script
    return {
        'window': window, 'k': k, 'alpha': alpha, 'C': C,
        'accuracy': overall_accuracy, 'p_value': p_value,
        **{f'acc_{g}': a for g, (a, _) in genre_accuracies.items()},
    }


if __name__ == '__main__':
    main()
