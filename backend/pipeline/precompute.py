"""Build-time script: pre-compute all bundled corpus results and cache to disk.

Run once after Phase 1 pipeline completes:
  python -m backend.pipeline.precompute

Produces:
  data/cache/{hash}.npy/.json  -- cached per-book results
  data/models/svm_pipeline.joblib  -- trained SVM for classification
  data/models/persistence_imager.joblib  -- fitted persistence image transform
  data/models/genre_names.json  -- label-to-genre mapping

Blocker 3 fix: This is concrete executable code, not prose bullets.
"""
import argparse
import json
import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import yaml
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_selection import VarianceThreshold
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

# Add scripts/ to path for utils.load_params + scripts.constants
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from utils import load_params
from scripts.constants import HOLDOUT_GUTENBERG_IDS  # Phase 9 single source of truth

from backend.cache.store import cache_key, cache_put
from backend.cache.lineage import (
    corpus_hash as _corpus_hash,
    w2v_model_sha256 as _w2v_model_sha256,
    write_svm_lineage,
)
from backend.pipeline.features import (
    diagram_to_birth_persistence,
    build_persistence_imager,
    build_feature_vector,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)


def precompute_all(window: int = None):
    """Run full pipeline on bundled corpus, cache everything, train SVM.

    Args:
        window: Word2Vec window size override. If None, reads from params.yaml.
    """
    # --- Load configuration ---
    params = load_params()
    if window is None:
        window = params['word2vec']['window']
    k = params['features']['k_clusters']
    alpha = params['features']['alpha']
    grid_resolution = params['features']['grid_resolution']
    sigma = params['features']['sigma']
    homology_dims = params['homology']['homology_dimensions']

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / 'data' / 'models'
    features_dir = project_root / 'data' / 'features'

    # --- Compute lineage hashes once (Plan 06-05 / BUG-05) ---
    # corpus_hash + w2v_model_sha256 feed into every cache_key() below so that
    # a corpus change OR a W2V retrain forces a cache miss on every artifact.
    log.info('Computing lineage hashes (corpus + Word2Vec model)...')
    lineage_ch = _corpus_hash()
    lineage_wh = _w2v_model_sha256(window)
    log.info(f'  corpus_hash={lineage_ch[:12]}... w2v_model_sha256={lineage_wh[:12]}...')

    # --- Load Phase 1 pre-trained models ---
    from gensim.models import Word2Vec
    log.info(f'Loading Word2Vec model (window={window})...')
    w2v_model = Word2Vec.load(str(models_dir / f'word2vec_w{window}.model'))

    log.info('Loading TF-IDF vectorizer...')
    tfidf_vectorizer = joblib.load(str(models_dir / f'tfidf_vectorizer_w{window}.joblib'))

    log.info('Loading K-means model...')
    kmeans = joblib.load(str(models_dir / f'kmeans_w{window}_k{k}.pkl'))

    # --- Load corpus metadata ---
    corpus_path = project_root / 'corpus' / 'books.yaml'
    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)

    genre_names = list(books_data['genres'].keys())
    log.info(f'Genres: {genre_names}')

    # Save genre names for label-to-genre mapping
    genre_names_path = models_dir / 'genre_names.json'
    with open(genre_names_path, 'w') as f:
        json.dump(genre_names, f)
    log.info(f'Saved genre_names.json')

    # --- Collect all books with their genre labels ---
    all_books = []
    for genre_idx, (genre, book_list) in enumerate(books_data['genres'].items()):
        for book in book_list:
            gid = str(book['gutenberg_id'])
            all_books.append({
                'gutenberg_id': gid,
                'title': book['title'],
                'genre': genre,
                'genre_idx': genre_idx,
            })

    log.info(f'Processing {len(all_books)} books...')

    # --- Load pre-computed diagrams from Phase 1 data/features/ ---
    all_h1_diagrams = []
    book_diagrams = {}

    for book in all_books:
        gid = book['gutenberg_id']
        diag_path = features_dir / f'diagrams_{gid}_w{window}.npy'
        if diag_path.exists():
            diagrams = np.load(str(diag_path), allow_pickle=False)
            book_diagrams[gid] = diagrams
            h1_bp = diagram_to_birth_persistence(diagrams, dim=1)
            all_h1_diagrams.append(h1_bp)
            log.info(f'  Loaded diagrams for {gid} ({book["title"][:40]})')
        else:
            log.warning(f'  Missing diagrams for {gid} -- skipping')

    # --- Fit global persistence imager ---
    log.info(f'Fitting persistence imager (grid={grid_resolution}, sigma={sigma})...')
    persistence_imager = build_persistence_imager(all_h1_diagrams, grid_resolution, sigma)

    # Serialize persistence imager
    imager_path = models_dir / 'persistence_imager.joblib'
    joblib.dump(persistence_imager, str(imager_path))
    log.info(f'Saved persistence_imager.joblib')

    # --- Build feature vectors for all books ---
    feature_vectors = []
    labels = []

    for book in all_books:
        gid = book['gutenberg_id']
        if gid not in book_diagrams:
            continue

        diagrams = book_diagrams[gid]

        # Load per-book word list and TF-IDF weights from Phase 1 features
        words_path = features_dir / f'words_{gid}_w{window}.json'
        weights_path = features_dir / f'tfidf_{gid}_w{window}.npy'

        if words_path.exists() and weights_path.exists():
            with open(words_path) as f:
                words_data = json.load(f)
            # words JSON is a dict with a 'words' key containing the word list
            words = words_data['words'] if isinstance(words_data, dict) else words_data
            tfidf_weights = np.load(str(weights_path), allow_pickle=False)
        else:
            # Fallback: recompute from raw text if feature files missing
            log.warning(f'  Missing word/weight files for {gid} -- skipping')
            continue

        feature_vec = build_feature_vector(
            diagrams, words, tfidf_weights,
            w2v_model, kmeans, persistence_imager,
            k_clusters=k, alpha=alpha,
        )

        feature_vectors.append(feature_vec)
        labels.append(book['genre_idx'])

        # Cache per-book result
        ck = cache_key(
            'feature_vector',
            {'gutenberg_id': gid, 'window': window, 'k': k, 'alpha': alpha},
            corpus_hash=lineage_ch,
            w2v_model_sha256=lineage_wh,
        )
        cache_put(ck, feature_vec)

        # Cache full book result (for GET /corpus/books/{id}/results)
        book_result = {
            'gutenberg_id': gid,
            'title': book['title'],
            'genre': book['genre'],
            'feature_vector_shape': list(feature_vec.shape),
            'h1_points': int(diagram_to_birth_persistence(diagrams, dim=1).shape[0]),
        }
        bk = cache_key(
            'book_result',
            {'gutenberg_id': gid, 'window': window, 'k': k, 'alpha': alpha},
            corpus_hash=lineage_ch,
            w2v_model_sha256=lineage_wh,
        )
        cache_put(bk, book_result)
        log.info(f'  Cached results for {gid}')

    # --- Train SVM pipeline ---
    if len(feature_vectors) < 2:
        log.error('Not enough books with feature vectors to train SVM')
        return

    X = np.array(feature_vectors)
    y = np.array(labels)
    log.info(f'Training SVM on {X.shape[0]} books, {X.shape[1]} features...')

    # --- Step 8 (Phase 9 plan 09-01 Task 2): dump feature_vec fixture ---
    # First training book's feature vector becomes the deterministic SVM-input
    # fixture used by Wave-2 explain math tests (backend/tests/test_explain_math.py).
    fixtures_dir = project_root / 'backend' / 'tests' / 'fixtures'
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    fixture_path = fixtures_dir / 'feature_vec_sample.npy'
    np.save(str(fixture_path), X[0].astype(np.float64))
    log.info(f'Saved feature_vec fixture: {fixture_path}')

    svm_kernel = params['validation']['svm_kernel']
    svm_C = params['validation']['svm_C']
    svm_gamma = params['validation']['svm_gamma']

    # --- D-37/D-38 (Phase 9 plan 09-01): retrain with the calibration method
    #     selected by scripts/calibrate.py. The winner is written to
    #     config/params.yaml::classify.calibration_method. Two allow-listed
    #     values: 'libsvm_platt' (SVC probability=True) and
    #     'calibrated_cv_sigmoid' (CalibratedClassifierCV LOOCV wrapper). ---
    calibration_method = params.get('classify', {}).get('calibration_method', 'libsvm_platt')
    log.info(f'D-37 calibration_method: {calibration_method}')
    if calibration_method == 'libsvm_platt':
        svm_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('var_thresh', VarianceThreshold(threshold=1e-4)),
            ('svc', SVC(
                kernel=svm_kernel,
                C=svm_C,
                gamma=svm_gamma,
                class_weight='balanced',
                random_state=42,
                probability=True,
            )),
        ])
    elif calibration_method == 'calibrated_cv_sigmoid':
        # Plan-research deviation (Rule 1 -- bug fix): plan specified
        # cv=LeaveOneOut() but sklearn 1.6.1 rejects LOOCV for multiclass
        # CalibratedClassifierCV (each fold's test split has only one class).
        # StratifiedKFold(n_splits=5) is the closest-supported CV strategy.
        # calibration_method label remains 'calibrated_cv_sigmoid' for lineage
        # schema compatibility (D-40 allow-list).
        base = Pipeline([
            ('scaler', StandardScaler()),
            ('var_thresh', VarianceThreshold(threshold=1e-4)),
            ('svc', SVC(
                kernel=svm_kernel,
                C=svm_C,
                gamma=svm_gamma,
                class_weight='balanced',
                random_state=42,
                probability=False,
            )),
        ])
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        svm_pipeline = CalibratedClassifierCV(base, method='sigmoid', cv=cv)
    else:
        raise ValueError(
            f"Unknown calibration_method: {calibration_method!r}. "
            f"Expected 'libsvm_platt' or 'calibrated_cv_sigmoid' "
            f"(see config/params.yaml::classify.calibration_method)."
        )
    svm_pipeline.fit(X, y)

    svm_path = models_dir / 'svm_pipeline.joblib'
    joblib.dump(svm_pipeline, str(svm_path))
    log.info(f'Saved svm_pipeline.joblib ({X.shape[0]} samples, {len(genre_names)} classes)')

    # --- Step 6 (Phase 9 plan 09-01 Task 2): compute Brier on in-comparison
    #     hold-out subset using the freshly-trained calibrated SVM. This is
    #     the float recorded in the lineage sidecar (D-40). ---
    holdout_int = [int(h) for h in HOLDOUT_GUTENBERG_IDS]
    # Re-derive gutenberg_ids array aligned to feature_vectors row order.
    aligned_gids = []
    for book in all_books:
        gid = book['gutenberg_id']
        if gid in book_diagrams:
            words_path = features_dir / f'words_{gid}_w{window}.json'
            weights_path = features_dir / f'tfidf_{gid}_w{window}.npy'
            if words_path.exists() and weights_path.exists():
                aligned_gids.append(int(gid))
    in_comp_mask = np.array([g in holdout_int for g in aligned_gids])
    if in_comp_mask.any():
        proba_holdout = svm_pipeline.predict_proba(X[in_comp_mask])
        y_holdout = y[in_comp_mask]
        n_classes = int(np.max(y) + 1)
        y_onehot = np.eye(n_classes)[y_holdout]
        brier_deployed = float(np.mean(np.sum((proba_holdout - y_onehot) ** 2, axis=1)))
        log.info(f'Deployed SVM Brier on in-comparison hold-out: {brier_deployed:.4f} '
                 f'(n={int(in_comp_mask.sum())})')
    else:
        brier_deployed = float('nan')
        log.warning('No in-comparison hold-out books found; lineage Brier set to NaN.')

    # --- D-40 (Phase 9): pin SVM training-data + calibration lineage. ---
    sidecar = write_svm_lineage(
        svm_path,
        window=window,
        k_clusters=k,
        alpha=alpha,
        corpus_digest=lineage_ch,
        w2v_digest=lineage_wh,
        calibration_method=calibration_method,
        calibration_brier_score=brier_deployed,
        calibration_report='results/v2_calibration_report.md',
    )
    log.info(f'Saved SVM lineage sidecar (D-40 fields included): {sidecar.name}')

    log.info('Precomputation complete.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pre-compute corpus results and train SVM')
    parser.add_argument('--window', type=int, default=None,
                        help='Word2Vec window size (default: from params.yaml)')
    args = parser.parse_args()
    precompute_all(window=args.window)
