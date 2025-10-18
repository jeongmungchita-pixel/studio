#!/usr/bin/env python3
"""세션 시작 - startend 워크플로우 구현"""
import requests
import subprocess
import os

def session_start():
    print("🌅 세션 시작")
    print("=" * 50)
    
    # 1. BEFS Agent 시작 (없으면)
    try:
        response = requests.get("http://127.0.0.1:8765/health", timeout=1)
        if response.status_code == 200:
            print("✅ BEFS Agent 실행 중")
        else:
            raise Exception("Agent not running")
    except:
        print("🚀 BEFS Agent 시작 중...")
        subprocess.run(["python3", os.path.expanduser("~/automation/befs_start.py")])
        print()
    
    # 2. 이전 세션 요약 불러오기
    try:
        print("🧠 이전 세션 요약 불러오는 중...")
        response = requests.get("http://127.0.0.1:8765/summary", timeout=3)
        if response.status_code == 200:
            summary_data = response.json()
            summary = summary_data.get('summary', '요약 없음')
            print(f"📝 {summary}")
        else:
            print("⚠️  이전 세션 요약 없음")
    except Exception as e:
        print(f"⚠️  요약 불러오기 실패: {e}")
    
    print()
    
    # 3. 오늘의 Tasks 확인
    try:
        print("📋 오늘의 Tasks:")
        response = requests.get("http://127.0.0.1:8765/tasks", timeout=2)
        if response.status_code == 200:
            tasks = response.json()
            todo_tasks = [t for t in tasks if t['status'] in ['todo', 'doing']]
            
            if todo_tasks:
                for task in todo_tasks[:5]:  # 최대 5개만
                    status_emoji = '🔵' if task['status'] == 'doing' else '⚪'
                    print(f"   {status_emoji} {task['title']}")
            else:
                print("   ✨ 완료된 작업이 없습니다")
        else:
            print("   ⚠️  Tasks 조회 실패")
    except Exception as e:
        print(f"   ⚠️  Tasks 조회 오류: {e}")
    
    print()
    
    # 4. Windsurf 실행 제안
    windsurf_start = input("🚀 Windsurf를 실행하시겠습니까? (Y/n): ").strip().lower()
    if windsurf_start != 'n':
        subprocess.run(["python3", os.path.expanduser("~/automation/windsurf_start.py")])
    
    print("\n🎯 좋은 하루 되세요! 작업을 시작하세요.")

if __name__ == "__main__":
    session_start()
