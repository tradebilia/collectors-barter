#!/usr/bin/env bash
# Zero-error guard rail: refuses commits that introduce TypeScript errors.
#
# Installed as .git/hooks/pre-commit (see scripts/install-hooks.sh).
# The codebase reached 0 TypeScript errors on 2026-07-05; this hook keeps it
# there by blocking any commit that would reintroduce errors.
#
# Bypass (emergencies only): git commit --no-verify

set -e
cd "$(git rev-parse --show-toplevel)"

echo "[pre-commit] Running TypeScript check..."
ERRORS=$(npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS" || true)

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "=========================================================="
  echo " COMMIT BLOCKED: $ERRORS TypeScript error(s) detected."
  echo " Fix them before committing (npx tsc --noEmit to list)."
  echo " The codebase is kept at ZERO errors so the compiler can"
  echo " catch real bugs. Do not let errors pile up again."
  echo "=========================================================="
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "error TS" | head -10
  exit 1
fi

echo "[pre-commit] TypeScript check: PASS (0 errors)"
