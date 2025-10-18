#!/usr/bin/env python3
"""백업 목록 조회"""
import os
import glob
from datetime import datetime

BASE_DIR = os.path.expanduser("~/windsurf-memory")

def list_backups():
    backup_pattern = os.path.join(BASE_DIR, "backup_*.zip")
    backups = glob.glob(backup_pattern)
    backups.sort(reverse=True)  # 최신순
    
    if not backups:
        print("📋 백업 파일이 없습니다")
        return
    
    print(f"📋 백업 목록 ({len(backups)}개)\n")
    print("=" * 70)
    
    for i, backup in enumerate(backups[:20]):  # 최근 20개만
        filename = os.path.basename(backup)
        size = os.path.getsize(backup)
        timestamp = filename.replace("backup_", "").replace(".zip", "")
        
        try:
            dt = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")
            date_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            age_hours = (datetime.now() - dt).total_seconds() / 3600
            
            if age_hours < 1:
                age_str = f"{int(age_hours * 60)}분 전"
            elif age_hours < 24:
                age_str = f"{int(age_hours)}시간 전"
            else:
                age_str = f"{int(age_hours / 24)}일 전"
        except:
            date_str = timestamp
            age_str = "?"
        
        size_str = f"{size:,} bytes"
        if size > 1024:
            size_str = f"{size/1024:.1f} KB"
        if size > 1024*1024:
            size_str = f"{size/(1024*1024):.1f} MB"
        
        print(f"{i+1:2d}. {filename}")
        print(f"    📅 {date_str} ({age_str})")
        print(f"    📦 {size_str}")
        print()
    
    print("=" * 70)
    print("💡 복원: python3 ~/automation/memory_restore.py")

if __name__ == "__main__":
    list_backups()
