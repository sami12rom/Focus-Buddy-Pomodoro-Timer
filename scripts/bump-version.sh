#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh [new-version]
#
# With no argument: reads the current version from app.json, suggests the next
# patch bump, and asks for confirmation before changing anything.
#
# With an argument: uses that version directly (skips the prompt).
#
# Updates three places that must always stay in sync:
#   app.json  → expo.version            (semver string)
#   app.json  → expo.android.versionCode (patch number as integer)
#   package.json → version              (semver string)
#
# Then prints the exact git commands to commit, tag, and push.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_JSON="$ROOT/app.json"
PKG_JSON="$ROOT/package.json"

# ── Check for uncommitted code changes ────────────────────────────────────────
# The bump script should only commit app.json and package.json.
# If other tracked files have changes, the user should commit them first so
# the git history has a descriptive commit for the feature and a separate one
# for the version bump.
DIRTY_FILES=$(git -C "$ROOT" status --porcelain | grep -v '^??' | grep -v 'app\.json' | grep -v 'package\.json' | grep -v '^$' || true)
if [[ -n "$DIRTY_FILES" ]]; then
  echo "⚠️  You have uncommitted changes to files other than app.json / package.json:"
  echo ""
  echo "$DIRTY_FILES" | sed 's/^/  /'
  echo ""
  echo "Best practice: commit your code changes first with a descriptive message,"
  echo "then re-run this script. That keeps git history readable:"
  echo "  - one commit: 'fix: what changed and why'"
  echo "  - one commit: 'chore: bump version to X.Y.Z'"
  echo ""
  read -rp "Continue anyway (not recommended)? [y/N]: " CONT
  case "$CONT" in
    [yY]) ;;
    *) echo "Aborted. Commit your changes first."; exit 0 ;;
  esac
  echo ""
fi

# ── Read current version from app.json (source of truth) ─────────────────────
CURRENT=$(grep '"version"' "$APP_JSON" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
SUGGESTED="$MAJOR.$MINOR.$((PATCH + 1))"

# ── Determine new version ─────────────────────────────────────────────────────
if [[ -n "$1" ]]; then
  NEW_VERSION="$1"
else
  echo "Current version : $CURRENT"
  echo "Suggested next  : $SUGGESTED"
  echo ""

  # Show commits since last tag so the user knows what's going in
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [[ -n "$LAST_TAG" ]]; then
    echo "Commits since $LAST_TAG:"
    git log "$LAST_TAG"..HEAD --oneline 2>/dev/null | sed 's/^/  /'
    echo ""
  fi

  read -rp "New version [$SUGGESTED]: " INPUT
  NEW_VERSION="${INPUT:-$SUGGESTED}"
fi

# ── Validate semver ───────────────────────────────────────────────────────────
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in x.y.z format (got: $NEW_VERSION)"
  exit 1
fi

VERSION_CODE="${NEW_VERSION##*.}"

# ── Confirm before making changes ─────────────────────────────────────────────
echo ""
echo "Will update:"
echo "  app.json       expo.version        $CURRENT → $NEW_VERSION"
echo "  app.json       android.versionCode $(echo "$CURRENT" | awk -F. '{print $3}') → $VERSION_CODE"
echo "  package.json   version             $CURRENT → $NEW_VERSION"
echo ""
read -rp "Proceed? [Y/n]: " CONFIRM
case "$CONFIRM" in
  [nN]) echo "Aborted."; exit 0 ;;
esac

# ── Generate release notes from commits since last tag ────────────────────────
NOTES_FILE="$ROOT/release-notes/en-US.txt"
CHANGELOG="$ROOT/CHANGELOG.md"
LAST_TAG=$(git -C "$ROOT" describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -n "$LAST_TAG" ]]; then
  ALL_COMMITS=$(git -C "$ROOT" log "$LAST_TAG"..HEAD --oneline --no-merges 2>/dev/null || true)

  FEATS=$(echo "$ALL_COMMITS" | grep ' feat: ' | sed 's/^[a-f0-9]* feat: /• /' || true)
  FIXES=$(echo "$ALL_COMMITS" | grep ' fix: '  | sed 's/^[a-f0-9]* fix: /• /'  || true)

  # Commits that had no feat:/fix: prefix — show so nothing is silently missed
  UNCAPTURED=$(echo "$ALL_COMMITS" \
    | grep -v ' feat: ' | grep -v ' fix: ' | grep -v ' chore: ' \
    | sed 's/^[a-f0-9]* //' || true)

  DRAFT=""
  [[ -n "$FEATS" ]] && DRAFT="${DRAFT}New:\n${FEATS}\n\n"
  [[ -n "$FIXES" ]] && DRAFT="${DRAFT}Fixes:\n${FIXES}\n"
  [[ -z "$DRAFT"  ]] && DRAFT="Bug fixes and improvements.\n"

  printf "$DRAFT" > "$NOTES_FILE"

  echo ""
  echo "── Release notes for v$NEW_VERSION (release-notes/en-US.txt) ──────────────"
  cat "$NOTES_FILE"
  echo "────────────────────────────────────────────────────────────────────────────"

  if [[ -n "$UNCAPTURED" ]]; then
    echo ""
    echo "⚠️  These commits were NOT captured (no feat:/fix: prefix):"
    echo "$UNCAPTURED" | sed 's/^/  /'
    echo "  Add them manually to the release notes if they matter to users."
  fi

  echo ""
  read -rp "Edit release notes before continuing? [y/N]: " EDIT_NOTES
  if [[ "$EDIT_NOTES" =~ ^[yY]$ ]]; then
    "${EDITOR:-nano}" "$NOTES_FILE"
  fi

  # Append this version's notes to CHANGELOG.md for permanent history
  TODAY=$(date '+%Y-%m-%d')
  TEMP_CHANGELOG=$(mktemp "$ROOT/.CHANGELOG.md.XXXXXX")
  if [[ -f "$CHANGELOG" ]]; then
    # Insert after the first line (the # Changelog heading)
    HEADING=$(head -1 "$CHANGELOG")
    {
      printf '%s\n\n' "$HEADING"
      printf '## v%s (%s)\n\n' "$NEW_VERSION" "$TODAY"
      awk '{ lines[NR] = $0; if (NF) last = NR } END { for (i = 1; i <= last; i++) print lines[i] }' "$NOTES_FILE"
      printf '\n'
      tail -n +2 "$CHANGELOG" | awk 'NR == 1 && /^[[:space:]]*$/ { next } { print }'
    } > "$TEMP_CHANGELOG"
  else
    {
      printf '# Changelog\n\n'
      printf '## v%s (%s)\n\n' "$NEW_VERSION" "$TODAY"
      awk '{ lines[NR] = $0; if (NF) last = NR } END { for (i = 1; i <= last; i++) print lines[i] }' "$NOTES_FILE"
    } > "$TEMP_CHANGELOG"
  fi
  mv "$TEMP_CHANGELOG" "$CHANGELOG"
  echo "✓ CHANGELOG.md updated"
fi

# ── Apply version changes ──────────────────────────────────────────────────────
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$APP_JSON"
sed -i '' "s/\"versionCode\": [0-9]*/\"versionCode\": $VERSION_CODE/" "$APP_JSON"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$PKG_JSON"

echo ""
echo "✓ app.json       expo.version        → $NEW_VERSION"
echo "✓ app.json       android.versionCode → $VERSION_CODE"
echo "✓ package.json   version             → $NEW_VERSION"
echo "✓ release-notes/en-US.txt           → updated"
echo ""
echo "Run these commands to commit, tag, and push:"
echo ""
echo "  git add app.json package.json release-notes/en-US.txt CHANGELOG.md"
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
echo "  git tag v$NEW_VERSION"
echo "  git push origin main"
echo "  git push origin v$NEW_VERSION"
echo ""
echo "(Push the tag explicitly — not --tags — to avoid triggering CI for unrelated local tags.)"
