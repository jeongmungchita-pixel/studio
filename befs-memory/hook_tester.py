#!/usr/bin/env python3
"""
Session Hook Tester
Handles session start/end routines for BEFS Hybrid Agent
"""

import sys
from datetime import datetime

def session_start():
    """Session start routine"""
    print("🚀 BEFS Hybrid Agent 세션 시작")
    print("=" * 50)
    print(f"📅 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("💡 오늘의 목표를 한 문장으로 말씀해주세요.")
    print("   (예: '회원 관리 페이지 최적화', '새로운 채점 시스템 구현')")
    print()
    print("=" * 50)

def session_end():
    """Session end routine"""
    print("🏁 BEFS Hybrid Agent 세션 종료")
    print("=" * 50)
    print(f"📅 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("📝 세션 요약:")
    print("   - 완료된 작업 내용을 3-5줄로 요약해주세요")
    print("   - ~/windsurf-memory/session-notes.md 에 붙여넣기 해주세요")
    print()
    print("💾 메모리 백업이 자동으로 실행됩니다...")
    print("=" * 50)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 hook_tester.py [start|end]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "start":
        session_start()
    elif command == "end":
        session_end()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python3 hook_tester.py [start|end]")
        sys.exit(1)

if __name__ == "__main__":
    main()
