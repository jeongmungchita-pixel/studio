#!/usr/bin/env python3
"""메모리 백업 복원"""
import os
import zipfile
import glob
from datetime import datetime

BASE_DIR = os.path.expanduser("~/windsurf-memory")

def list_backups():
    """백업 파일 목록 조회"""
    backup_pattern = os.path.join(BASE_DIR, "backup_*.zip")
    backups = glob.glob(backup_pattern)
    backups.sort(reverse=True)  # 최신순
    return backups

def restore_backup(backup_file=None):
    """백업 복원"""
    backups = list_backups()
    
    if not backups:
        print("❌ 백업 파일이 없습니다")
        return False
    
    # 백업 파일 선택
    if backup_file is None:
        print("📋 사용 가능한 백업:")
        for i, backup in enumerate(backups[:10]):  # 최근 10개만
            filename = os.path.basename(backup)
            size = os.path.getsize(backup)
            timestamp = filename.replace("backup_", "").replace(".zip", "")
            try:
                dt = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")
                date_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            except:
                date_str = timestamp
            
            print(f"   {i+1}. {filename} ({size:,} bytes) - {date_str}")
        
        try:
            choice = input("\n복원할 백업 번호 (1-10, Enter=최신): ").strip()
            if choice == "":
                backup_file = backups[0]
            else:
                backup_file = backups[int(choice) - 1]
        except (ValueError, IndexError):
            print("❌ 잘못된 선택")
            return False
    
    if not os.path.exists(backup_file):
        print(f"❌ 백업 파일이 없습니다: {backup_file}")
        return False
    
    print(f"\n🔄 백업 복원 중: {os.path.basename(backup_file)}")
    
    # BEFS Agent 중지 (실행 중이면)
    try:
        import requests
        response = requests.get("http://127.0.0.1:8765/health", timeout=1)
        if response.status_code == 200:
            print("   ⏹️  BEFS Agent 중지 중...")
            import subprocess
            subprocess.run(["python3", os.path.expanduser("~/automation/befs_stop.py")])
    except:
        pass
    
    # 백업 복원
    try:
        with zipfile.ZipFile(backup_file, 'r') as zf:
            zf.extractall(BASE_DIR)
            print("   ✅ 파일 복원 완료")
        
        print(f"\n✅ 복원 완료!")
        print(f"   위치: {BASE_DIR}")
        
        # BEFS Agent 재시작 제안
        restart = input("\nBEFS Agent를 재시작하시겠습니까? (y/N): ").strip().lower()
        if restart == 'y':
            import subprocess
            subprocess.run(["python3", os.path.expanduser("~/automation/befs_start.py")])
        
        return True
        
    except Exception as e:
        print(f"❌ 복원 실패: {e}")
        return False

if __name__ == "__main__":
    restore_backup()
