#!/usr/bin/env python3
"""SVM + LOOCV + permutation test → GO/NO-GO verdict."""

import sys
import json
import time
import datetime
import argparse
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def write_report(results_dir, accuracy, p_value, genre_accuracies, params_summary):
    results_dir = Path(results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    verdict = "GO" if p_value < 0.05 else "NO-GO"
    lines = [
        "── Validation Results ──────────────────────────────",
        f"{'Genre':<14} {'Accuracy':>8}   {'N':>3}",
    ]
    for genre, (acc, n) in genre_accuracies.items():
        lines.append(f"{genre:<14} {acc*100:>7.1f}%   {n:>3}")
    total_n = sum(n for _, n in genre_accuracies.values())
    lines.append(f"{'Overall':<14} {accuracy*100:>7.1f}%   {total_n:>3}")
    lines.append("")
    perm_n = params_summary.get('permutation_n', 1000)
    lines.append(f"Permutation test ({perm_n} shuffles): p = {p_value:.3f}")
    lines.append("")
    if verdict == "GO":
        lines.append("✓ GO — Topology distinguishes genres (p < 0.05)")
    else:
        lines.append(f"✗ NO-GO — Topology signal not detected (p = {p_value:.3f}). Pivot before building web UI.")
    lines.append("──────────────────────────────────────────────────")

    report_text = "\n".join(lines)
    (results_dir / 'validation_report.txt').write_text(report_text, encoding='utf-8')
    return verdict, report_text


def append_history(log_path, accuracy, p_value, verdict, params_summary):
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    entry = f"[{ts}] accuracy={accuracy*100:.1f}% p={p_value:.3f} verdict={verdict} params={params_summary}\n"
    with open(log_path, 'a') as f:
        f.write(entry)


def main():
    parser = argparse.ArgumentParser(description="Validate topology signal via SVM + permutation test")
    parser.add_argument('--pca-components', type=int)
    parser.add_argument('--svm-c', type=float)
    parser.add_argument('--svm-gamma', type=str)
    parser.add_argument('--permutation-n', type=int)
    args = parser.parse_args()

    overrides = {}
    if args.pca_components is not None:
        overrides['validation.pca_components'] = args.pca_components
    if args.svm_c is not None:
        overrides['validation.svm_C'] = args.svm_c
    if args.svm_gamma is not None:
        overrides['validation.svm_gamma'] = args.svm_gamma
    if args.permutation_n is not None:
        overrides['validation.permutation_n'] = args.permutation_n

    params = load_params(overrides)

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    results_dir = Path(__file__).parent.parent / 'results'

    X = np.load(str(features_dir / 'feature_matrix.npy'))
    y = np.load(str(features_dir / 'labels.npy'))
    with open(features_dir / 'book_order.json') as f:
        book_order = json.load(f)

    print(f"Loaded feature matrix: {X.shape[0]} books x {X.shape[1]}D")

    # Build Pipeline
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    from sklearn.svm import SVC
    from sklearn.model_selection import cross_val_score, LeaveOneOut, permutation_test_score

    pca_components = min(params['validation']['pca_components'], X.shape[0] - 1, X.shape[1])
    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('pca', PCA(n_components=pca_components)),
        ('svm', SVC(
            kernel=params['validation']['svm_kernel'],
            C=params['validation']['svm_C'],
            gamma=params['validation']['svm_gamma'],
        ))
    ])

    # LOOCV
    t_start = time.time()
    print(f"Running LOOCV (PCA={pca_components}D, C={params['validation']['svm_C']})...",
          end=' ', flush=True)
    loo = LeaveOneOut()
    from sklearn.model_selection import cross_val_predict
    y_pred = cross_val_predict(pipe, X, y, cv=loo)
    overall_accuracy = np.mean(y_pred == y)
    print(f"done ({time.time()-t_start:.1f}s)")

    # Per-genre accuracy
    unique_genres = {}
    for entry in book_order:
        g = entry['genre']
        if g not in unique_genres:
            unique_genres[g] = {'correct': 0, 'total': 0}

    # Map labels back to genres
    label_to_genre = {}
    for entry in book_order:
        label_to_genre[entry['label']] = entry['genre']

    for j, (true, pred) in enumerate(zip(y, y_pred)):
        genre = label_to_genre.get(int(true), 'unknown')
        unique_genres[genre]['total'] += 1
        if true == pred:
            unique_genres[genre]['correct'] += 1

    genre_accuracies = {
        g: (v['correct'] / v['total'] if v['total'] > 0 else 0.0, v['total'])
        for g, v in unique_genres.items()
    }

    # Permutation test
    perm_n = params['validation']['permutation_n']
    t_start = time.time()
    print(f"Permutation test ({perm_n} shuffles)...", end=' ', flush=True)
    score, perm_scores, p_value = permutation_test_score(
        pipe, X, y, cv=LeaveOneOut(),
        n_permutations=perm_n,
        scoring='accuracy',
        n_jobs=-1,
        random_state=42,
    )
    print(f"done ({time.time()-t_start:.1f}s)")

    # Print summary
    params_summary = {
        'max_words': params['homology']['max_words'],
        'pca': pca_components,
        'alpha': params['features']['alpha'],
        'C': params['validation']['svm_C'],
        'permutation_n': perm_n,
    }
    verdict, report_text = write_report(
        results_dir, overall_accuracy, p_value, genre_accuracies, params_summary
    )
    print()
    ascii_report = (report_text
                    .replace('✓', '[GO]')
                    .replace('✗', '[NO-GO]')
                    .replace('\u2014', '--')
                    .replace('\u2500', '-')
                    .replace('\u2502', '|'))
    print(ascii_report)

    # Append to run history
    log_path = results_dir / 'run_history.log'
    append_history(log_path, overall_accuracy, p_value, verdict, params_summary)
    print(f"\nReport saved to results/validation_report.txt")
    print(f"History appended to results/run_history.log")


if __name__ == '__main__':
    main()
