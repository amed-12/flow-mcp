#!/usr/bin/env bash
# Linux: start the Flow Studio panel. Run ./"Flow Studio.sh" in a terminal, or in Files right-click -> Run as a Program.
# Close this window (or press Ctrl+C) to stop it.
cd "$(dirname "$0")" || exit 1
# Node installed with nvm only lands on PATH in an interactive shell; load it when the desktop started us without it.
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
[ -d dist ] || npm run build
node dist/studio.js
