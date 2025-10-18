#!/usr/bin/env bash
set -euo pipefail
MEM="$HOME/windsurf-memory"
LOG="$MEM/cascade.log"
tmp="$(mktemp)"
cat > "$tmp" || true
if [ -s "$tmp" ]; then
  python3 "$MEM/memory_auto_logger.py" --stdin --backup < "$tmp"
else
  python3 "$MEM/memory_auto_logger.py" --stdin --backup < /dev/null
fi
python3 "$MEM/auto_summary_agent.py" || echo "[warn] auto_summary_agent.py failed" >> "$LOG"
rm -f "$tmp"
