#!/bin/sh
# One-shot installer for the BUG-04 pre-commit hook.
# Sets repo-local core.hooksPath so .githooks/pre-commit runs on every commit.
set -eu

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null || true

# Smoke test: ensure the hook executes cleanly when no .planning/**/*.md is staged.
if ! sh .githooks/pre-commit </dev/null >/dev/null 2>&1; then
  echo "WARNING: hook ran but returned non-zero with empty input — review .githooks/pre-commit"
fi

echo "Installed .githooks/pre-commit (core.hooksPath=.githooks)."
echo "Snapshots will land in .planning/.snapshots/{UTC-timestamp}/ on every commit."
