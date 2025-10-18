#!/usr/bin/env python3
import os, zipfile, datetime, sqlite3, glob
base = os.path.expanduser("~/windsurf-memory")

# DB 연결
db = os.path.join(base, "memory.sqlite")
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("""CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT, summary TEXT, backup TEXT
)""")

# 최신 백업 확인
zips = sorted(glob.glob(os.path.join(base, "backup_*.zip")), reverse=True)
print("📚 최근 세션 백업 목록")
for i, z in enumerate(zips[:5], 1):
    t = datetime.datetime.fromtimestamp(os.path.getmtime(z))
    print(f"{i}. {z}  ({t:%Y-%m-%d %H:%M})")

# 최근 요약 갱신
session_file = os.path.join(base, "session-notes.md")
if os.path.exists(session_file):
    with open(session_file, encoding="utf-8") as f:
        lines = f.readlines()
        if lines:
            summary = lines[-1].strip()
            cur.execute("INSERT INTO sessions (date, summary, backup) VALUES (?, ?, ?)",
                        (datetime.datetime.now().isoformat(), summary, zips[0] if zips else ""))
            conn.commit()
            print("✅ DB에 최근 세션 요약 저장됨:", summary)
else:
    print("⚠️ session-notes.md 파일 없음")

print("\n🧠 저장된 세션 목록:")
for row in cur.execute("SELECT id, date, summary FROM sessions ORDER BY id DESC LIMIT 5"):
    print(f"{row[0]}. {row[1][:16]} — {row[2]}")
conn.close()
