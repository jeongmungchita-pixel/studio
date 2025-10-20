#!/usr/bin/env python3
"""
federation-studio BEFS 시스템 종료
"""
import subprocess
import sys

def main():
    print("⏹️  federation-studio BEFS 시스템 종료 중...")
    subprocess.run([sys.executable, "automation/befs_stop.py"])
    print("✅ 종료 완료")

if __name__ == "__main__":
    main()
