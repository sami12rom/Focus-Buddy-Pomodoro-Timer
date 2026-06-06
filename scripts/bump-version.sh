#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh 1.0.26
#
# Updates the version in all three places that must stay in sync:
#   app.json  → expo.version       (semver string)
#   app.json  → expo.android.versionCode  (patch number as integer)
#   package.json → version         (semver string)
#
# Then prints the git commands to commit, tag, and push.

set -e

NEW_VERSION="$1"

if [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: $0 <new-version>  (e.g. $0 1.0.26)"
  exit 1
fi

# Validate semver format x.y.z
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in x.y.z format (e.g. 1.0.26)"
  exit 1
fi

# Extract the patch number for versionCode
VERSION_CODE="${NEW_VERSION##*.}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_JSON="$ROOT/app.json"
PKG_JSON="$ROOT/package.json"

# Update app.json — expo.version
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$APP_JSON"

# Update app.json — expo.android.versionCode
sed -i '' "s/\"versionCode\": [0-9]*/\"versionCode\": $VERSION_CODE/" "$APP_JSON"

# Update package.json — version
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$PKG_JSON"

echo "✓ app.json       expo.version        → $NEW_VERSION"
echo "✓ app.json       android.versionCode → $VERSION_CODE"
echo "✓ package.json   version             → $NEW_VERSION"
echo ""
echo "Run these commands to commit, tag, and push:"
echo ""
echo "  git add app.json package.json"
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
echo "  git tag v$NEW_VERSION"
echo "  git push origin main --tags"
