#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="key-west-shoreline-history"
OWNER="${GITHUB_OWNER:-austingrimesphoto}"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. On macOS: brew install gh"
  exit 1
fi

gh auth status

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "Initial historical GIS scaffold"
fi

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repository already exists: https://github.com/$OWNER/$REPO_NAME"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  fi
  git push -u origin main
else
  gh repo create "$OWNER/$REPO_NAME" \
    --public \
    --source=. \
    --remote=origin \
    --push \
    --description "Evidence-based interactive history of Key West shoreline growth, Trumbo Point, and the Overseas Railway."
fi

echo
echo "GitHub repository:"
echo "https://github.com/$OWNER/$REPO_NAME"
echo
echo "Next: import the repository in Netlify. Publish directory is '.' and no build command is required."
