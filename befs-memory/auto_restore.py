#!/usr/bin/env python3
import os, sys, sqlite3, datetime, glob

BASE = os.path.expanduser("~/windsurf-memory")
DB   = os.path.join(BASE, "memory.sqlite")
SESSION_FILE = os.path.join(BASE, "session-notes.md")

def latest_db_summary():
    if not os.path.exists(DB):
        return None
    try:
        conn = sqlite3.connect(DB)
        cur  = conn.cursor()
        cur.execute("SELECT summary, date FROM sessions ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return f"{row[0]}  (at {row[1][:16]})"
    except Exception:
        pass
    return None

def latest_file_summary():
    if not os.path.exists(SESSION_FILE): 
        return None
    try:
        with open(SESSION_FILE, encoding="utf-8") as f:
            lines = [ln.strip() for ln in f.readlines() if ln.strip()]
            return lines[-1] if lines else None
    except Exception:
        return None

def main():
    print("📥 메모리 복원 완료")
    print(f"복원 시각: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}")

    summary = latest_db_summary() or latest_file_summary()
    if summary:
        print(f"🧠 이전 세션 요약: {summary}")
    else:
        print("🧠 이전 세션 요약 없음")

    # 시작 안내 문구(이 출력이 --as-prompt 모드에서 바로 프롬프트로 주입됨)
    print("🎯 오늘 목표를 한 문장으로 알려주세요. (예: '라우팅 최적화 마무리')")

if __name__ == "__main__":
    main()
