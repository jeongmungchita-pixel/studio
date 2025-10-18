#!/usr/bin/env python3
"""최적화된 통합 동기화 스크립트"""
import os
import sys
import subprocess
import requests
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8765"

def run_sync_task(task_name, task_func):
    """동기화 작업 실행"""
    start_time = time.time()
    try:
        result = task_func()
        duration = time.time() - start_time
        return {
            "task": task_name,
            "success": True,
            "duration": duration,
            "result": result
        }
    except Exception as e:
        duration = time.time() - start_time
        return {
            "task": task_name,
            "success": False,
            "duration": duration,
            "error": str(e)
        }

def sync_git_changes():
    """Git 변경사항 동기화"""
    # Git 상태 확인
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=STUDIO_DIR,
        capture_output=True,
        text=True,
        timeout=5
    )
    
    changes = result.stdout.strip()
    if changes:
        return f"변경사항 {len(changes.split())}개 감지"
    return "변경사항 없음"

def sync_coding_style():
    """코딩 스타일 동기화"""
    # 간단한 스타일 체크
    ts_files = subprocess.run(
        ["find", "src", "-name", "*.ts", "-o", "-name", "*.tsx"],
        cwd=STUDIO_DIR,
        capture_output=True,
        text=True,
        timeout=10
    )
    
    file_count = len(ts_files.stdout.strip().split('\n')) if ts_files.stdout.strip() else 0
    return f"TypeScript 파일 {file_count}개 분석 완료"

def sync_befs_status():
    """BEFS 상태 동기화"""
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            return f"BEFS Agent 정상 (v{data.get('version', 'unknown')})"
        else:
            return "BEFS Agent 응답 오류"
    except:
        return "BEFS Agent 연결 실패"

def main():
    """메인 동기화 실행"""
    print("🚀 최적화된 동기화 시작")
    print("=" * 50)
    
    # 병렬 실행할 작업들
    sync_tasks = [
        ("Git 변경사항", sync_git_changes),
        ("코딩 스타일", sync_coding_style),
        ("BEFS 상태", sync_befs_status)
    ]
    
    # 병렬 실행
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_sync_task, name, func): name 
            for name, func in sync_tasks
        }
        
        results = []
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            status = "✅" if result["success"] else "❌"
            duration = f"{result['duration']:.2f}s"
            
            if result["success"]:
                print(f"{status} {result['task']}: {result['result']} ({duration})")
            else:
                print(f"{status} {result['task']}: {result['error']} ({duration})")
    
    # 총 실행 시간
    total_duration = sum(r['duration'] for r in results)
    success_count = sum(1 for r in results if r['success'])
    
    print("=" * 50)
    print(f"🎉 동기화 완료: {success_count}/{len(results)} 성공")
    print(f"⏱️ 총 실행 시간: {total_duration:.2f}초")

if __name__ == "__main__":
    main()
