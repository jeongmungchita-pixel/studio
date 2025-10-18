#!/usr/bin/env python3
"""BEFS Agent 상태 확인"""
import requests
import os

PID_FILE = os.path.expanduser("~/windsurf-memory/befs.pid")

print("🔍 BEFS Agent 상태 확인\n")

# 서버 연결 확인
try:
    response = requests.get("http://127.0.0.1:8765/health", timeout=2)
    if response.status_code == 200:
        data = response.json()
        print("✅ 서버: 실행 중")
        print(f"   URL: http://127.0.0.1:8765")
        print(f"   버전: {data.get('version')}")
        
        # PID 확인
        if os.path.exists(PID_FILE):
            with open(PID_FILE, 'r') as f:
                pid = f.read().strip()
            print(f"   PID: {pid}")
        
        # Tasks 개수
        tasks_response = requests.get("http://127.0.0.1:8765/tasks", timeout=2)
        if tasks_response.status_code == 200:
            tasks = tasks_response.json()
            print(f"   Tasks: {len(tasks)}개")
        
        # Skills 개수
        skills_response = requests.get("http://127.0.0.1:8765/skills", timeout=2)
        if skills_response.status_code == 200:
            skills = skills_response.json()
            print(f"   Skills: {len(skills)}개")
    else:
        print("❌ 서버: 응답 오류")
except requests.exceptions.ConnectionError:
    print("❌ 서버: 실행되지 않음")
except Exception as e:
    print(f"❌ 오류: {e}")
