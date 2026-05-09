#!/usr/bin/env bash
set -euo pipefail

if command -v bunx >/dev/null 2>&1; then
  runner=(bunx)
elif command -v pnpm >/dev/null 2>&1; then
  runner=(pnpm dlx)
elif command -v npx >/dev/null 2>&1; then
  runner=(npx)
else
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  runner=(bunx)
fi

exec "${runner[@]}" no-more-bs@latest init
