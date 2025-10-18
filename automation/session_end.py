#!/usr/bin/env python3
"""세션 종료 - 작업 요약 및 백업"""
import requests
import subprocess
import os
from datetime import datetime

def session_end():
    print("🌅 세션 종료")
    print("=" * 50)
    
    # 1. 오늘 완료한 Tasks 확인
    try:
        print("✅ 오늘 완료한 작업:")
        response = requests.get("http://127.0.0.1:8765/tasks", timeout=2)
        if response.status_code == 200:
            tasks = response.json()
            done_tasks = [t for t in tasks if t['status'] == 'done']
            
            if done_tasks:
                for task in done_tasks[-5:]:  # 최근 5개만
                    print(f"   ✅ {task['title']}")
                print(f"\n   📊 총 {len(done_tasks)}개 작업 완료")
            else:
                print("   ⚠️  완료된 작업이 없습니다")
        else:
            print("   ⚠️  Tasks 조회 실패")
    except Exception as e:
        print(f"   ⚠️  Tasks 조회 오류: {e}")
    
    print()
    
    # 2. 세션 요약 생성
    try:
        print("📝 세션 요약 생성 중...")
        summary_text = input("오늘 작업 요약을 입력하세요 (Enter=자동): ").strip()
        
        if not summary_text:
            summary_text = f"세션 종료 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        response = requests.post(
            "http://127.0.0.1:8765/auto",
            json={"text": summary_text},
            timeout=3
        )
        
        if response.status_code == 200:
            print(f"✅ 요약 저장: {summary_text}")
        else:
            print("⚠️  요약 저장 실패")
    except Exception as e:
        print(f"⚠️  요약 저장 오류: {e}")
    
    print()
    
    # 3. 백업 생성 제안
    backup_create = input("💾 백업을 생성하시겠습니까? (Y/n): ").strip().lower()
    if backup_create != 'n':
        subprocess.run(["python3", os.path.expanduser("~/automation/memory_backup.py")])
        print()
    
    # 4. BEFS Agent 종료 제안
    agent_stop = input("⏹️  BEFS Agent를 종료하시겠습니까? (y/N): ").strip().lower()
    if agent_stop == 'y':
        subprocess.run(["python3", os.path.expanduser("~/automation/befs_stop.py")])
    
    print("\n🎉 수고하셨습니다! 내일 또 만나요.")

if __name__ == "__main__":
    session_end()
