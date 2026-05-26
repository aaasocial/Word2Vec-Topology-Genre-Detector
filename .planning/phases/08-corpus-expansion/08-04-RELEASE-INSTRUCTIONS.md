---
phase: 08
plan: 08-04
wave: 4
task: 4.2
type: user-machine-handoff
date: 2026-05-26
gh_required: true
gh_available_in_agent_env: false
---

# Task 4.2 — `v2.0-data` Release Publish Instructions (USER-MACHINE EXECUTION)

> **Why this is a handoff, not an automated step:** The `gh` CLI is not installed in the parallel-executor agent environment. The Release publish is therefore packaged as a manual one-time user-machine execution. Follow the steps below verbatim — every command is copy-paste ready.

## Pre-flight Checklist

Run all checks **from the repo root** (`C:/Users/Eason/Desktop/CC/Word2Vec Genre Analyser/`). All must pass before publishing.

### 1. `gh` CLI is installed and authenticated

```bash
gh --version
gh auth status
```

Expected: prints `gh version 2.x.x` and `Logged in to github.com as <your-user>`.

If `gh` is missing on Windows:

```powershell
winget install --id GitHub.cli
# or: scoop install gh
```

If `gh auth status` says you are not logged in:

```bash
gh auth login
# Select: GitHub.com → HTTPS → Login with a web browser
```

### 2. The `v2.0-data` tag does NOT already exist on the remote

```bash
gh release view v2.0-data
```

Expected: exits with `release not found` (HTTP 404). If it returns 200, **stop** — a previous attempt left the tag in place. Either delete it (`gh release delete v2.0-data --cleanup-tag --yes`) or append assets with `gh release upload v2.0-data <files>` instead of `create`.

### 3. All Release assets exist locally on disk

```bash
for f in \
  data/models/svm_pipeline.joblib \
  data/models/svm_pipeline.joblib.lineage.json \
  data/models/kmeans_w15_k200.pkl \
  data/models/word2vec_w15.model \
  data/models/word2vec_w15.model.syn1neg.npy \
  data/models/word2vec_w15.model.wv.vectors.npy \
  data/models/persistence_imager.joblib \
  data/models/tfidf_vectorizer_w15.joblib \
  data/corpus_metadata.json \
  results/v2_validation_report.md; do
  test -s "$f" && echo "OK    $f" || echo "MISS  $f"
done
```

Expected: 10 `OK` lines, zero `MISS` lines.

If any are missing, the Wave 2 retrain or Wave 3 validation didn't finish cleanly — re-run the appropriate plan before continuing.

### 4. The validation report is the final 2026-05-26 version

```bash
head -15 results/v2_validation_report.md
```

Expected: the file headline reads `# v2 Validation Report — Phase 8 / CEXP-03 + CEXP-04`, generated `2026-05-26T05:09:38Z`, with `Per-author smoke test (D-31 trigger): ANTI-LEAKAGE GUARDRAIL FAILED` in the Status block.

### 5. Release notes file is in place

The composed release-notes body lives at:

```
.planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md
```

Verify it exists and contains the D-31 disclaimer:

```bash
test -s .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md && echo OK
grep -c "Limitations / Disclaimer (D-31)" .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md
```

Expected: `OK` and a count of `≥1`.

## The Release Publish Command

**Copy-paste this in one block from the repo root** (`C:/Users/Eason/Desktop/CC/Word2Vec Genre Analyser/`):

```bash
gh release create v2.0-data \
  --title "v2.0-data — 154-book verified-clean corpus + retrained pipeline" \
  --notes-file .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md \
  data/models/svm_pipeline.joblib \
  data/models/svm_pipeline.joblib.lineage.json \
  data/models/kmeans_w15_k200.pkl \
  data/models/word2vec_w15.model \
  data/models/word2vec_w15.model.syn1neg.npy \
  data/models/word2vec_w15.model.wv.vectors.npy \
  data/models/persistence_imager.joblib \
  data/models/tfidf_vectorizer_w15.joblib \
  data/corpus_metadata.json \
  results/v2_validation_report.md
```

**On Windows PowerShell** (single-line variant with backticks for continuation):

```powershell
gh release create v2.0-data `
  --title "v2.0-data — 154-book verified-clean corpus + retrained pipeline" `
  --notes-file .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md `
  data/models/svm_pipeline.joblib `
  data/models/svm_pipeline.joblib.lineage.json `
  data/models/kmeans_w15_k200.pkl `
  data/models/word2vec_w15.model `
  data/models/word2vec_w15.model.syn1neg.npy `
  data/models/word2vec_w15.model.wv.vectors.npy `
  data/models/persistence_imager.joblib `
  data/models/tfidf_vectorizer_w15.joblib `
  data/corpus_metadata.json `
  results/v2_validation_report.md
```

Expected output: `https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/tag/v2.0-data`

Upload takes ~1-3 minutes depending on connection — the Word2Vec model alone is ~75 MB and the `.npy` files are ~60 MB each, so the full payload is roughly 270 MB.

## Error Recovery

### "gh: command not found"

Install `gh` per the pre-flight step 1 instructions, then retry.

### "Not authenticated"

Run `gh auth login` per pre-flight step 1.

### "release already exists"

Either:

- Delete and recreate cleanly:
  ```bash
  gh release delete v2.0-data --cleanup-tag --yes
  # then re-run the create command above
  ```
- Or append new assets to the existing tag:
  ```bash
  gh release upload v2.0-data <missing-file-1> <missing-file-2> ... --clobber
  ```

### "asset upload failed: 413 Request Entity Too Large"

GitHub caps individual assets at 2 GB. None of our assets approach this, so a 413 indicates a transient gateway issue. Wait 60 s and retry the failed asset with `gh release upload v2.0-data <file> --clobber`.

### Partial upload (some assets succeeded, some failed)

Use `--clobber` to overwrite the partial state without deleting the Release:

```bash
gh release upload v2.0-data \
  <list-of-failed-files> \
  --clobber
```

## Post-Publish Verification

After the upload completes, run **all four checks** to confirm the Release is correct.

### 1. Tag is reachable

```bash
gh release view v2.0-data --json tagName,name,isDraft,isPrerelease
```

Expected:
```json
{
  "tagName": "v2.0-data",
  "name": "v2.0-data — 154-book verified-clean corpus + retrained pipeline",
  "isDraft": false,
  "isPrerelease": false
}
```

### 2. All 10 assets are attached (sorted by name)

```bash
gh release view v2.0-data --json assets --jq '[.assets[].name] | sort | .[]'
```

Expected (alphabetical):
```
corpus_metadata.json
kmeans_w15_k200.pkl
persistence_imager.joblib
svm_pipeline.joblib
svm_pipeline.joblib.lineage.json
tfidf_vectorizer_w15.joblib
v2_validation_report.md
word2vec_w15.model
word2vec_w15.model.syn1neg.npy
word2vec_w15.model.wv.vectors.npy
```

### 3. Asset sizes are non-zero

```bash
gh release view v2.0-data --json assets --jq '.assets[] | {name: .name, size: .size}'
```

Expected: every asset reports a non-zero `size` (zero-size means upload was truncated).

### 4. Release notes contain the disclaimer

```bash
gh release view v2.0-data --json body --jq '.body' | grep -c "ANTI-LEAKAGE\|Limitations\|D-31\|0.3235"
```

Expected: count `≥ 4` (each of the 4 anchor strings should appear at least once in the published body).

### 5. Public download URL is live

Replace `<owner>` with the GitHub org/user (the repo URL is `aaasocial/Word2Vec-Topology-Genre-Detector` per `CLAUDE.md`):

```bash
curl -fsSLI -o /dev/null -w "%{http_code}\n" \
  https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/download/v2.0-data/svm_pipeline.joblib
```

Expected: `200` (after at most one 302 redirect; `curl -L` follows redirects).

## Confirmation Back to GSD

Once **all five post-publish checks pass**, the Release is live. Report success to GSD by replying with:

```
v2.0-data Release published. URL: https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/tag/v2.0-data
```

A follow-up agent will then:

1. Flip `08-04-SUMMARY.md` status from `partial` → `complete`.
2. Update `STATE.md` (Phase 8 → complete; next-command pointer → Phase 9).
3. Update `ROADMAP.md` Phase 8 row checkbox + completion date.
4. Push the final `docs(08-04): close Phase 8` boundary commit.

## Why these specific assets

The `v2.0-data` asset list is composed of three groups:

**Group A — D-33 mandatory (6 assets):** the load-bearing model bundle that Railway pulls at boot. These are non-negotiable per `08-CONTEXT.md` D-33.

**Group B — D-31 auditability (1 asset):** `v2_validation_report.md`. Attached unconditionally as a Claude's-discretion call (see `08-04-D33-DECISION.md`). When the D-31 disclaimer path is active (it is), this report is the canonical source-of-truth for the disclaimer text and the affected authors list. Consumers reading the Release page should be able to download the report directly without needing to clone the repo.

**Group C — Companion files (3 assets):** gensim splits the Word2Vec model across 3 sidecar files (`.model` + `.syn1neg.npy` + `.wv.vectors.npy`) when serializing; all 3 are required for the model to load. The TF-IDF vectorizer is a peer of the W2V model used by the feature pipeline at inference time. Without these companions, Railway would crash at container-boot time with `FileNotFoundError`.

Total: 10 assets attached.

---
*Instructions composed: 2026-05-26 by Phase 8 / Wave 4 / Task 4.2 (agent handoff to user — gh CLI not in agent env)*
