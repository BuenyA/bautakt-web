#!/bin/bash
# Commits in diesem Repo laufen nur unter BuenyA. Cloud-Sitzungen bringen
# sonst „Claude <noreply@anthropic.com>“ als Autor mit.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
git config user.name "BuenyA"
git config user.email "aydemir.buny@gmail.com"
