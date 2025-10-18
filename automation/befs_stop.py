#!/usr/bin/env python3
"""BEFS Agent 서버 종료"""
import os
import signal

PID_FILE = os.path.expanduser("~/windsurf-memory/befs.pid")

if not os.path.exists(PID_FILE):
    print("⚠️  실행 중인 BEFS Agent가 없습니다")
    exit(0)

try:
    with open(PID_FILE, 'r') as f:
        pid = int(f.read().strip())
    
    os.kill(pid, signal.SIGTERM)
    os.remove(PID_FILE)
    print("✅ BEFS Agent 종료됨")
    print(f"   PID: {pid}")
except ProcessLookupError:
    print("⚠️  프로세스가 이미 종료되었습니다")
    os.remove(PID_FILE)
except Exception as e:
    print(f"❌ 종료 실패: {e}")
