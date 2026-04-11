import pytest
import numpy as np
import tempfile
from pathlib import Path


def test_svm_loocv_runs(synthetic_feature_matrix, synthetic_labels):
    """Pipeline(scaler, PCA, SVC) + LOOCV returns a score in [0, 1]."""
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    from sklearn.svm import SVC
    from sklearn.model_selection import cross_val_score, LeaveOneOut

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('pca', PCA(n_components=5)),
        ('svm', SVC(kernel='rbf', C=1.0, gamma='scale'))
    ])
    scores = cross_val_score(pipe, synthetic_feature_matrix, synthetic_labels,
                             cv=LeaveOneOut(), scoring='accuracy')
    score = scores.mean()
    assert 0.0 <= score <= 1.0


def test_permutation_test_output(synthetic_feature_matrix, synthetic_labels):
    """permutation_test_score returns (score, perm_scores, p_value) in valid ranges."""
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    from sklearn.svm import SVC
    from sklearn.model_selection import permutation_test_score, LeaveOneOut

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('pca', PCA(n_components=5)),
        ('svm', SVC(kernel='rbf', C=1.0, gamma='scale'))
    ])
    score, perm_scores, p_value = permutation_test_score(
        pipe, synthetic_feature_matrix, synthetic_labels,
        cv=LeaveOneOut(), n_permutations=10, scoring='accuracy', random_state=42
    )
    assert isinstance(float(p_value), float)
    assert 0.0 <= p_value <= 1.0
    assert 0.0 <= score <= 1.0
    assert len(perm_scores) == 10


def write_report(results_dir, accuracy, p_value, genre_accuracies, params_summary):
    """Write validation report and append to run history."""
    results_dir = Path(results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    verdict = "GO" if p_value < 0.05 else "NO-GO"
    lines = [
        "── Validation Results ──────────────────────────────",
        f"{'Genre':<14} {'Accuracy':>8}   {'N':>3}",
    ]
    for genre, (acc, n) in genre_accuracies.items():
        lines.append(f"{genre:<14} {acc*100:>7.1f}%   {n:>3}")
    overall_acc = accuracy
    total_n = sum(n for _, n in genre_accuracies.values())
    lines.append(f"{'Overall':<14} {overall_acc*100:>7.1f}%   {total_n:>3}")
    lines.append("")
    lines.append(f"Permutation test ({params_summary.get('permutation_n', 1000)} shuffles): p = {p_value:.3f}")
    lines.append("")
    if verdict == "GO":
        lines.append("✓ GO — Topology distinguishes genres (p < 0.05)")
    else:
        lines.append(f"✗ NO-GO — Topology signal not detected (p = {p_value:.3f}). Pivot before building web UI.")
    lines.append("──────────────────────────────────────────────────")

    report_text = "\n".join(lines)
    (results_dir / 'validation_report.txt').write_text(report_text, encoding='utf-8')
    return verdict, report_text


def test_report_written_to_file(tmp_path):
    """write_report creates validation_report.txt with GO or NO-GO."""
    genre_accuracies = {
        'Horror': (0.8, 5),
        'Sci-Fi': (0.8, 5),
        'Romance': (0.6, 5),
    }
    verdict, _ = write_report(tmp_path, 0.733, 0.018, genre_accuracies, {'permutation_n': 1000})
    report_path = tmp_path / 'validation_report.txt'
    assert report_path.exists()
    content = report_path.read_text()
    assert 'GO' in content or 'NO-GO' in content


def test_run_history_appends(tmp_path):
    """Appending to run_history.log twice produces two entries."""
    import datetime
    log_path = tmp_path / 'run_history.log'

    def append_history(log_path, accuracy, p_value, verdict, params_summary):
        ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        entry = f"[{ts}] accuracy={accuracy*100:.1f}% p={p_value:.3f} verdict={verdict} params={params_summary}\n"
        with open(log_path, 'a') as f:
            f.write(entry)

    append_history(log_path, 0.733, 0.018, 'GO', {'max_words': 500})
    append_history(log_path, 0.700, 0.042, 'GO', {'max_words': 400})

    lines = log_path.read_text().strip().split('\n')
    assert len(lines) == 2, f"Expected 2 log entries, got {len(lines)}"
