#!/usr/bin/env bash
# Installs project git hooks. Run once after cloning:
#   bash scripts/install-hooks.sh
set -e
cd "$(git rev-parse --show-toplevel)"

cp scripts/pre-commit-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Installed pre-commit hook (TypeScript zero-error guard rail)."
