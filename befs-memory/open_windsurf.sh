#!/usr/bin/env bash
set -euo pipefail
APP="Windsurf"
WS="/Users/daewookjeong/federation/studio"
echo "[$(date '+%F %T')] opening $APP with $WS" >> "$HOME/windsurf-memory/autostart.out.log"
open -a "$APP" "$WS"
