#!/bin/bash
cd ~/windsurf-memory

# 1️⃣ 자동 감지 스크립트 생성
cat > auto_backup_monitor.py <<'PY'
import time, os, subprocess, datetime
from pathlib import Path

log = Path("~/windsurf-memory/autobackup.log").expanduser()
def logmsg(msg):
    log.write_text(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}\n" + log.read_text() if log.exists() else msg+"\n")

def is_windsurf_active():
    try:
        out = subprocess.check_output("pgrep -f Windsurf", shell=True)
        return bool(out.strip())
    except subprocess.CalledProcessError:
        return False

idle_timer = 0
while True:
    time.sleep(60)
    idle_timer += 1
    if not is_windsurf_active():
        subprocess.run("python3 ~/windsurf-memory/memory_auto_logger.py --stdin --backup", shell=True)
        logmsg("💾 자동 백업 (앱 종료 감지)")
        break
    if idle_timer > 15:
        subprocess.run("python3 ~/windsurf-memory/memory_auto_logger.py --stdin --backup", shell=True)
        logmsg("💾 자동 백업 (15분 비활성 감지)")
        idle_timer = 0
PY

# 2️⃣ 자동 실행 플래그
chmod +x ~/windsurf-memory/auto_backup_monitor.py
