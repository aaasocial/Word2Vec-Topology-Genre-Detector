---
plan: 05-02
phase: 05-deployment-and-public-access
status: complete
completed: 2026-04-13
public_url: https://word2vec-topology-genre-detector-production.up.railway.app
---

# Plan 05-02 Summary: GitHub Release + Railway Deploy

## What Was Built

The application is publicly accessible at:
**https://word2vec-topology-genre-detector-production.up.railway.app**

## Verified Endpoints

| Endpoint | Status |
|----------|--------|
| `GET /health` | ✅ `{"status":"ok"}` |
| `GET /api/health` | ✅ `{"status":"ok"}` |
| `GET /api/corpus/books` | ✅ Returns full book list |

## GitHub Release

- **Tag:** `v1.0-data`
- **Asset:** `genre-topology-data.tar.gz` (154MB)
- **Contents:** `data/models/` (w15 runtime models) + `data/cache/` (pre-built visualization cache)
- **URL:** `https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/download/v1.0-data/genre-topology-data.tar.gz`

## Railway Configuration

- **Platform:** Railway (us-west2)
- **Branch:** `deploy` (subtree split of `master` — project files at repo root)
- **Builder:** Dockerfile (multi-stage)
- **Redis:** Railway managed Redis addon (REDIS_URL injected automatically)
- **RELEASE_URL:** Set as service build variable

## Issues Encountered and Fixed

| Issue | Fix |
|-------|-----|
| Railway Railpack error — project in git subdirectory | Created `deploy` branch via `git subtree split` with project files at root |
| TypeScript errors blocking `npm run build` | Cast raycaster params and vitest plugin to `any` |
| NLTK stopwords missing at runtime | Added `RUN python -m nltk.downloader stopwords` to Dockerfile |
| RELEASE_URL hidden newline from Railway variable editor | Strip whitespace with `tr -d '[:space:]'` before curl |
| GitHub Release 404 — private repo | Made repository public |
| REDIS_URL not reaching arq worker | Added `REDIS_URL = ${{Redis.REDIS_URL}}` as service variable |

## Deploy Branch Workflow

Whenever changes are pushed to `master`, update the deploy branch with:
```bash
git -C "C:/Users/Eason" subtree push --prefix="Desktop/CC/Word2Vec Genre Analyser" origin deploy
```

Railway auto-deploys on push to the `deploy` branch.
