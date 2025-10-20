#!/usr/bin/env python3
"""
federation-studio BEFS 시스템 시작
"""
import os
import sys
import subprocess
import json

def main():
    print(f"🚀 federation-studio BEFS 시스템 시작")
    print("=" * 50)

    with open("befs_config.json", "r", encoding="utf-8") as handle:
        config = json.load(handle)

    port = config["befs"]["agent_port"]
    print(f"📁 프로젝트: federation-studio")
    print(f"🌐 포트: {port}")
    print(f"📂 위치: {os.getcwd()}")

    print("\n🤖 BEFS Agent 시작 중...")
    result = subprocess.run([sys.executable, "automation/befs_start.py"])
    if result.returncode == 0:
        print("\n✅ federation-studio BEFS 시스템 준비 완료!")
        print("\n📋 사용 가능한 명령:")
        print("   python3 automation/befs_status.py")
        print("   python3 automation/befs_tasks.py")
        print("   python3 automation/codex_sync.py")
        print("   python3 stop_befs.py")
    else:
        print("❌ 시작 실패")

if __name__ == "__main__":
    main()
