#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIXTURE="$(mktemp -d "${TMPDIR:-/tmp}/focus-buddy-bump-test.XXXXXX")"

mkdir -p "$FIXTURE/scripts" "$FIXTURE/release-notes"
cp "$ROOT/scripts/bump-version.sh" "$FIXTURE/scripts/bump-version.sh"

printf '%s\n' \
  '{' \
  '  "expo": {' \
  '    "version": "1.0.28",' \
  '    "android": {' \
  '      "versionCode": 28' \
  '    }' \
  '  }' \
  '}' > "$FIXTURE/app.json"

printf '%s\n' \
  '{' \
  '  "name": "focus-buddy-test",' \
  '  "version": "1.0.28"' \
  '}' > "$FIXTURE/package.json"

printf '%s\n' \
  '# Changelog' \
  '' \
  'Existing changelog content.' > "$FIXTURE/CHANGELOG.md"

printf '%s\n' 'Previous release notes.' > "$FIXTURE/release-notes/en-US.txt"

git -C "$FIXTURE" init -q
git -C "$FIXTURE" config user.name "Bump Script Test"
git -C "$FIXTURE" config user.email "test@example.com"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm "chore: initial release"
git -C "$FIXTURE" tag v1.0.28

printf '%s\n' 'feature' > "$FIXTURE/feature.txt"
git -C "$FIXTURE" add feature.txt
git -C "$FIXTURE" commit -qm "feat: add parking lot"

printf '\n\n' | "$FIXTURE/scripts/bump-version.sh" 1.0.29 >/dev/null

if grep -Fq '\n' "$FIXTURE/CHANGELOG.md"; then
  echo "Expected real newlines, but CHANGELOG.md contains literal \\n text."
  exit 1
fi

TODAY="$(date '+%Y-%m-%d')"
EXPECTED="$(printf '# Changelog\n\n## v1.0.29 (%s)\n\nNew:\n• add parking lot\n\nExisting changelog content.\n' "$TODAY")"
ACTUAL="$(cat "$FIXTURE/CHANGELOG.md")"

if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "CHANGELOG.md formatting did not match the expected release entry."
  diff -u <(printf '%s\n' "$EXPECTED") "$FIXTURE/CHANGELOG.md" || true
  exit 1
fi

echo "bump-version changelog formatting test passed"
