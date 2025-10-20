#!/usr/bin/env python3
"""지능형 백업 복원 시스템"""
import os
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

class SmartBackupManager:
    """지능형 백업 관리자"""
    
    def __init__(self, memory_path: str = None):
        self.memory_path = memory_path or os.path.expanduser("~/befs-memory")
        self.db_path = os.path.join(self.memory_path, "memory.sqlite")
        self.session_log_path = os.path.join(self.memory_path, "session_log.json")
        self.ensure_paths()
    
    def ensure_paths(self):
        """필요한 경로들 생성"""
        os.makedirs(self.memory_path, exist_ok=True)
    
    def detect_session_gap(self) -> Dict:
        """세션 간격 감지 및 분석"""
        try:
            # 마지막 세션 시간 확인
            last_session = self.get_last_session_time()
            current_time = datetime.now()
            
            if not last_session:
                return {
                    "gap_detected": True,
                    "gap_type": "first_session",
                    "message": "첫 세션입니다.",
                    "action": "full_restore"
                }
            
            gap_duration = current_time - last_session
            
            if gap_duration > timedelta(hours=8):
                return {
                    "gap_detected": True,
                    "gap_type": "long_gap",
                    "gap_hours": gap_duration.total_seconds() / 3600,
                    "message": f"{gap_duration.days}일 {gap_duration.seconds//3600}시간 만에 다시 시작",
                    "action": "full_restore_with_summary"
                }
            elif gap_duration > timedelta(hours=2):
                return {
                    "gap_detected": True,
                    "gap_type": "medium_gap", 
                    "gap_hours": gap_duration.total_seconds() / 3600,
                    "message": f"{gap_duration.seconds//3600}시간 만에 다시 시작",
                    "action": "partial_restore"
                }
            else:
                return {
                    "gap_detected": False,
                    "gap_type": "continuous",
                    "message": "연속 세션",
                    "action": "minimal_restore"
                }
                
        except Exception as e:
            return {
                "gap_detected": True,
                "gap_type": "error",
                "message": f"세션 분석 실패: {e}",
                "action": "safe_restore"
            }
    
    def get_last_session_time(self) -> Optional[datetime]:
        """마지막 세션 시간 조회"""
        try:
            if os.path.exists(self.session_log_path):
                with open(self.session_log_path, 'r', encoding='utf-8') as f:
                    log_data = json.load(f)
                    last_session_str = log_data.get('last_session')
                    if last_session_str:
                        return datetime.fromisoformat(last_session_str)
        except:
            pass
        return None
    
    def update_session_time(self):
        """현재 세션 시간 업데이트"""
        try:
            session_data = {
                'last_session': datetime.now().isoformat(),
                'session_count': self.get_session_count() + 1
            }
            
            with open(self.session_log_path, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ 세션 시간 업데이트 실패: {e}")
    
    def get_session_count(self) -> int:
        """총 세션 횟수 조회"""
        try:
            if os.path.exists(self.session_log_path):
                with open(self.session_log_path, 'r', encoding='utf-8') as f:
                    log_data = json.load(f)
                    return log_data.get('session_count', 0)
        except:
            pass
        return 0
    
    def smart_restore(self) -> Dict:
        """지능형 백업 복원"""
        gap_info = self.detect_session_gap()
        
        print(f"🕐 세션 분석: {gap_info['message']}")
        
        restore_result = {
            "gap_info": gap_info,
            "restored_data": {},
            "actions_taken": []
        }
        
        # 복원 액션 수행
        if gap_info["action"] == "full_restore_with_summary":
            restore_result.update(self.full_restore_with_summary())
        elif gap_info["action"] == "full_restore":
            restore_result.update(self.full_restore())
        elif gap_info["action"] == "partial_restore":
            restore_result.update(self.partial_restore())
        elif gap_info["action"] == "minimal_restore":
            restore_result.update(self.minimal_restore())
        else:
            restore_result.update(self.safe_restore())
        
        # 세션 시간 업데이트
        self.update_session_time()
        
        return restore_result
    
    def full_restore_with_summary(self) -> Dict:
        """전체 복원 + 요약"""
        print("🧠 전체 메모리 복원 + 요약 생성 중...")
        
        actions = []
        restored_data = {}
        
        # 1. 최근 백업 파일들 확인
        backup_files = self.get_recent_backups(days=7)
        if backup_files:
            print(f"📦 최근 {len(backup_files)}개 백업 발견")
            actions.append(f"found_{len(backup_files)}_backups")
            restored_data["backup_files"] = backup_files
        
        # 2. 메모리 데이터베이스 복원
        memory_data = self.restore_memory_database()
        if memory_data:
            print(f"🗄️ 메모리 데이터베이스 복원: {len(memory_data)}개 항목")
            actions.append("memory_db_restored")
            restored_data["memory_entries"] = len(memory_data)
        
        # 3. 세션 노트 요약
        session_summary = self.generate_session_summary()
        if session_summary:
            print(f"📝 세션 요약: {session_summary}")
            actions.append("session_summary_generated")
            restored_data["session_summary"] = session_summary
        
        return {
            "actions_taken": actions,
            "restored_data": restored_data
        }
    
    def full_restore(self) -> Dict:
        """전체 복원"""
        print("🧠 전체 메모리 복원 중...")
        
        actions = []
        restored_data = {}
        
        # 메모리 데이터베이스 복원
        memory_data = self.restore_memory_database()
        if memory_data:
            actions.append("memory_db_restored")
            restored_data["memory_entries"] = len(memory_data)
        
        return {
            "actions_taken": actions,
            "restored_data": restored_data
        }
    
    def partial_restore(self) -> Dict:
        """부분 복원"""
        print("🧠 최근 메모리 복원 중...")
        
        actions = []
        restored_data = {}
        
        # 최근 데이터만 복원
        recent_data = self.restore_recent_memory(hours=6)
        if recent_data:
            actions.append("recent_memory_restored")
            restored_data["recent_entries"] = len(recent_data)
        
        return {
            "actions_taken": actions,
            "restored_data": restored_data
        }
    
    def minimal_restore(self) -> Dict:
        """최소 복원"""
        print("🧠 연속 세션 - 최소 복원")
        
        return {
            "actions_taken": ["minimal_check"],
            "restored_data": {"status": "continuous_session"}
        }
    
    def safe_restore(self) -> Dict:
        """안전 복원"""
        print("🧠 안전 모드 복원")
        
        return {
            "actions_taken": ["safe_mode"],
            "restored_data": {"status": "safe_restore"}
        }
    
    def get_recent_backups(self, days: int = 7) -> List[str]:
        """최근 백업 파일들 조회"""
        backup_files = []
        try:
            for file in Path(self.memory_path).glob("backup_*.zip"):
                # 파일 수정 시간 확인
                mtime = datetime.fromtimestamp(file.stat().st_mtime)
                if datetime.now() - mtime < timedelta(days=days):
                    backup_files.append(str(file))
        except:
            pass
        
        return sorted(backup_files, reverse=True)  # 최신 순
    
    def restore_memory_database(self) -> List[Dict]:
        """메모리 데이터베이스 복원"""
        try:
            if os.path.exists(self.db_path):
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # 최근 메모리 항목들 조회
                cursor.execute("""
                    SELECT * FROM memory_entries 
                    ORDER BY created_at DESC 
                    LIMIT 50
                """)
                
                entries = cursor.fetchall()
                conn.close()
                
                return [{"id": e[0], "content": e[1], "created_at": e[2]} for e in entries]
        except:
            pass
        
        return []
    
    def restore_recent_memory(self, hours: int = 6) -> List[Dict]:
        """최근 메모리만 복원"""
        try:
            if os.path.exists(self.db_path):
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cutoff_time = datetime.now() - timedelta(hours=hours)
                
                cursor.execute("""
                    SELECT * FROM memory_entries 
                    WHERE created_at > ? 
                    ORDER BY created_at DESC
                """, (cutoff_time.isoformat(),))
                
                entries = cursor.fetchall()
                conn.close()
                
                return [{"id": e[0], "content": e[1], "created_at": e[2]} for e in entries]
        except:
            pass
        
        return []
    
    def generate_session_summary(self) -> str:
        """세션 요약 생성"""
        try:
            session_notes_path = os.path.join(self.memory_path, "session-notes.md")
            if os.path.exists(session_notes_path):
                with open(session_notes_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 마지막 몇 줄 요약
                lines = content.split('\n')
                recent_lines = [line for line in lines[-20:] if line.strip()]
                
                if recent_lines:
                    return f"최근 활동: {' | '.join(recent_lines[-3:])}"
        except:
            pass
        
        return "세션 요약 없음"

def main():
    """테스트 실행"""
    backup_manager = SmartBackupManager()
    result = backup_manager.smart_restore()
    
    print("\n🎯 복원 결과:")
    print(f"Gap 정보: {result['gap_info']}")
    print(f"수행된 액션: {result['actions_taken']}")
    print(f"복원된 데이터: {result['restored_data']}")

if __name__ == "__main__":
    main()
