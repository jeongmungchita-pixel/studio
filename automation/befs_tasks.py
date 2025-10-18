#!/usr/bin/env python3
"""BEFS Tasks 목록 조회"""
import requests
import json

try:
    response = requests.get("http://127.0.0.1:8765/tasks", timeout=2)
    if response.status_code == 200:
        tasks = response.json()
        
        if not tasks:
            print("📋 등록된 Task가 없습니다")
            exit(0)
        
        print(f"📋 Tasks ({len(tasks)}개)\n")
        print("=" * 60)
        
        for task in tasks:
            status_emoji = {
                'todo': '⚪',
                'doing': '🔵',
                'done': '✅',
                'blocked': '🔴',
                'dropped': '⚫'
            }.get(task['status'], '❓')
            
            priority_emoji = '🔥' * task['priority'] if task['priority'] <= 3 else '⚡'
            
            print(f"\n{status_emoji} [{task['id']}] {task['title']}")
            print(f"   상태: {task['status']} | 우선순위: {priority_emoji}")
            if task.get('due_at'):
                print(f"   마감: {task['due_at']}")
            if task.get('metadata'):
                try:
                    meta = json.loads(task['metadata'])
                    if meta.get('area'):
                        print(f"   영역: {meta['area']}")
                except:
                    pass
        
        print("\n" + "=" * 60)
    else:
        print("❌ Tasks 조회 실패")
except requests.exceptions.ConnectionError:
    print("❌ BEFS Agent가 실행되지 않았습니다")
    print("   실행: python3 ~/automation/befs_start.py")
except Exception as e:
    print(f"❌ 오류: {e}")
