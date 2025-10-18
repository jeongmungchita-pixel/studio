#!/usr/bin/env python3
"""메모리 백업 생성"""
import os
import shutil
import zipfile
from datetime import datetime

BASE_DIR = os.path.expanduser("~/windsurf-memory")
MEMORY_DB = os.path.join(BASE_DIR, "memory.sqlite")
SESSION_FILE = os.path.join(BASE_DIR, "session-notes.md")
TASKS_FILE = os.path.join(BASE_DIR, "tasks.md")

def create_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BASE_DIR, f"backup_{timestamp}.zip")
    
    print(f"💾 백업 생성 중: {timestamp}")
    
    with zipfile.ZipFile(backup_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        # 메모리 DB 백업
        if os.path.exists(MEMORY_DB):
            zf.write(MEMORY_DB, "memory.sqlite")
            print("   ✅ memory.sqlite")
        
        # 세션 노트 백업
        if os.path.exists(SESSION_FILE):
            zf.write(SESSION_FILE, "session-notes.md")
            print("   ✅ session-notes.md")
        
        # 작업 목록 백업
        if os.path.exists(TASKS_FILE):
            zf.write(TASKS_FILE, "tasks.md")
            print("   ✅ tasks.md")
        
        # Agent 폴더 백업
        agent_dir = os.path.join(BASE_DIR, "agent")
        if os.path.exists(agent_dir):
            for root, dirs, files in os.walk(agent_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_path = os.path.relpath(file_path, BASE_DIR)
                    zf.write(file_path, arc_path)
            print("   ✅ agent/ 폴더")
    
    file_size = os.path.getsize(backup_file)
    print(f"\n✅ 백업 완료!")
    print(f"   파일: {backup_file}")
    print(f"   크기: {file_size:,} bytes")
    
    return backup_file

if __name__ == "__main__":
    create_backup()
