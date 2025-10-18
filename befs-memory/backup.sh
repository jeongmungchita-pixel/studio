#!/usr/bin/env bash
set -e
BASE="${HOME}/windsurf-memory"
STAMP=$(date +"%Y%m%d_%H%M%S")
ZIP="${BASE}/backup_${STAMP}.zip"

if [ ! -d "${BASE}" ]; then
  echo "Base directory ${BASE} not found"; exit 1
fi

cd "${BASE}"
zip -r "${ZIP}" . -x "*.zip" "__pycache__/*" "node_modules/*" "tmp/*"
echo "Backup written to ${ZIP}"
