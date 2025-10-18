#!/usr/bin/env python3
"""Codex 파일 변경 감지 및 자동 동기화"""
import os
import time
import hashlib
import subprocess
from pathlib import Path

STUDIO_DIR = os.getcwd()
WATCH_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.yaml', '.yml'}
CHECK_INTERVAL = 30  # 30초마다 체크

class FileWatcher:
    def __init__(self, watch_dir):
        self.watch_dir = watch_dir
        self.file_hashes = {}
        self.last_sync = 0
        
    def get_file_hash(self, filepath):
        """파일 해시 계산"""
        try:
            with open(filepath, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except:
            return None
    
    def scan_files(self):
        """감시 대상 파일 스캔"""
        files = []
        for ext in WATCH_EXTENSIONS:
            pattern = f"**/*{ext}"
            files.extend(Path(self.watch_dir).glob(pattern))
        return [str(f) for f in files if f.is_file()]
    
    def check_changes(self):
        """파일 변경 감지"""
        current_files = self.scan_files()
        changed_files = []
        
        for filepath in current_files:
            current_hash = self.get_file_hash(filepath)
            if current_hash is None:
                continue
                
            last_hash = self.file_hashes.get(filepath)
            
            if last_hash != current_hash:
                changed_files.append(filepath)
                self.file_hashes[filepath] = current_hash
        
        return changed_files
    
    def should_sync(self, changed_files):
        """동기화 필요 여부 판단"""
        if not changed_files:
            return False
        
        # 최근 동기화 후 최소 60초 대기
        if time.time() - self.last_sync < 60:
            return False
        
        # 중요한 파일 변경 시 즉시 동기화
        important_patterns = ['/src/', '/components/', '/pages/', '/api/']
        for file in changed_files:
            if any(pattern in file for pattern in important_patterns):
                return True
        
        # 일반 파일은 3개 이상 변경 시 동기화
        return len(changed_files) >= 3
    
    def sync_changes(self):
        """변경사항 동기화 실행"""
        try:
            result = subprocess.run(
                ["python3", os.path.expanduser("~/automation/codex_sync.py")],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ 동기화 완료")
                self.last_sync = time.time()
                return True
            else:
                print(f"❌ 동기화 실패: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ 동기화 오류: {e}")
            return False

def start_watcher():
    """파일 감시 시작"""
    print("👀 Codex 파일 감시 시작")
    print(f"📁 감시 디렉토리: {STUDIO_DIR}")
    print(f"📄 감시 확장자: {', '.join(WATCH_EXTENSIONS)}")
    print(f"⏰ 체크 간격: {CHECK_INTERVAL}초")
    print("=" * 50)
    
    if not os.path.exists(STUDIO_DIR):
        print(f"❌ 디렉토리가 없습니다: {STUDIO_DIR}")
        return
    
    watcher = FileWatcher(STUDIO_DIR)
    
    # 초기 파일 스캔
    print("🔍 초기 파일 스캔 중...")
    initial_files = watcher.scan_files()
    for filepath in initial_files:
        watcher.file_hashes[filepath] = watcher.get_file_hash(filepath)
    
    print(f"✅ {len(initial_files)}개 파일 스캔 완료")
    print("\n👀 파일 변경 감시 중... (Ctrl+C로 종료)")
    
    try:
        while True:
            changed_files = watcher.check_changes()
            
            if changed_files:
                print(f"\n📝 변경 감지: {len(changed_files)}개 파일")
                for f in changed_files[:3]:
                    rel_path = os.path.relpath(f, STUDIO_DIR)
                    print(f"   - {rel_path}")
                if len(changed_files) > 3:
                    print(f"   ... 외 {len(changed_files)-3}개")
                
                if watcher.should_sync(changed_files):
                    print("🚀 자동 동기화 실행 중...")
                    watcher.sync_changes()
                else:
                    print("⏳ 동기화 대기 중 (조건 미충족)")
            
            time.sleep(CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n⏹️  파일 감시 중지")

def stop_watcher():
    """파일 감시 중지"""
    try:
        result = subprocess.run(["pkill", "-f", "codex_watcher.py"], capture_output=True)
        if result.returncode == 0:
            print("✅ 파일 감시 중지됨")
        else:
            print("⚠️  실행 중인 감시 프로세스가 없습니다")
    except Exception as e:
        print(f"❌ 중지 오류: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "stop":
            stop_watcher()
        elif sys.argv[1] == "start":
            start_watcher()
        else:
            print("사용법: python3 codex_watcher.py [start|stop]")
    else:
        start_watcher()
