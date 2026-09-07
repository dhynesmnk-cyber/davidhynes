#!/usr/bin/env bash
# Stage the static site into dist/. No compilation, no dependencies —
# this exists so the publish directory is an explicit folder and so every
# deploy records which commit it came from.
set -euo pipefail

rm -rf dist
mkdir -p dist
cp -R index.html styles.css js vendor assets _headers dist/

{
  printf 'commit=%s\n' "${COMMIT_REF:-unknown}"
  printf 'branch=%s\n'  "${BRANCH:-unknown}"
  printf 'context=%s\n' "${CONTEXT:-local}"
  printf 'built=%s\n'   "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > dist/build-info.txt

echo "--- staged into dist/ ---"
find dist -maxdepth 2 -print | sort
echo "--- build-info.txt ---"
cat dist/build-info.txt
