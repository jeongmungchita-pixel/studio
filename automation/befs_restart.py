#!/usr/bin/env python3
"""BEFS Agent 재시작"""
import subprocess
import os

print("🔄 BEFS Agent 재시작 중...\n")

# 종료
subprocess.run(["python3", os.path.expanduser("~/automation/befs_stop.py")])
print()

# 시작
subprocess.run(["python3", os.path.expanduser("~/automation/befs_start.py")])
