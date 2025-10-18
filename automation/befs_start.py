#!/usr/bin/env python3
"""BEFS Agent 서버 시작"""
import subprocess
import os
import time
import requests

AGENT_DIR = os.path.expanduser("~/windsurf-memory/agent")
PID_FILE = os.path.expanduser("~/windsurf-memory/befs.pid")

# 이미 실행 중인지 확인
try:
    response = requests.get("http://127.0.0.1:8765/health", timeout=1)
    if response.status_code == 200:
        print("⚠️  BEFS Agent가 이미 실행 중입니다")
        print(f"   버전: {response.json().get('version')}")
        exit(0)
except:
    pass

# 서버 시작
print("🚀 BEFS Agent 시작 중...")
process = subprocess.Popen(
    ["python3", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8765"],
    cwd=AGENT_DIR,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

# PID 저장
with open(PID_FILE, 'w') as f:
    f.write(str(process.pid))

# 시작 확인
time.sleep(2)
try:
    response = requests.get("http://127.0.0.1:8765/health", timeout=2)
    if response.status_code == 200:
        print("✅ BEFS Agent 시작 완료")
        print(f"   URL: http://127.0.0.1:8765")
        print(f"   버전: {response.json().get('version')}")
        print(f"   PID: {process.pid}")
    else:
        print("❌ 시작 실패")
except Exception as e:
    print(f"❌ 연결 실패: {e}")
