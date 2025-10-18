#!/usr/bin/env python3
# Auto-summary + backup logger
import os, sys, zipfile, datetime, subprocess, textwrap, shutil

BASE = os.path.expanduser("~/windsurf-memory")
os.makedirs(BASE, exist_ok=True)
SESSION = os.path.join(BASE, "session-notes.md")
TASKS   = os.path.join(BASE, "tasks.md")
LOG     = os.path.join(BASE, "cascade.log")
BACKUP  = os.path.join(BASE, f"backup_{datetime.datetime.now():%Y%m%d_%H%M%S}.zip")

def read_stdin():
    try:
        if not sys.stdin.isatty():
            data = sys.stdin.read().strip()
            return data if data else None
    except Exception:
        pass
    return None

def tail(path, n=50):
    if not os.path.exists(path): return []
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        return [ln.rstrip("\n") for ln in lines[-n:]]
    except Exception:
        return []

def git_recent_changes():
    # 변경된 파일 목록 간단 요약 (git repo일 때만)
    try:
        out = subprocess.check_output(["git","status","--porcelain"], cwd=os.getcwd(), stderr=subprocess.DEVNULL, text=True)
        changed = [ln[3:] for ln in out.splitlines() if ln.strip()]
        if not changed: return ""
        changed = changed[:8]
        bullets = "\n".join(f"- {p}" for p in changed)
        return f"변경 파일: \n{bullets}"
    except Exception:
        return ""

def make_auto_summary():
    # 우선순위: 1) clipboard 2) cascade.log 최근 라인 3) session-notes 최근 라인 4) git 변경/시간
    # 1) 클립보드(있으면) — 사용자가 복사만 해두고 종료해도 잡힘
    clip = ""
    try:
        clip = subprocess.check_output(["pbpaste"], text=True).strip()
    except Exception:
        pass

    if clip:
        content = clip.splitlines()[:12]
        base = " / ".join([ln.strip("-•* ").strip() for ln in content if ln.strip()])[:220]
        if base:
            return f"[auto] 클립보드 요약: {base}"

    # 2) cascade.log 최근
    log_lines = tail(LOG, 40)
    log_hint = ""
    for ln in reversed(log_lines):
        if "이전 세션 요약" in ln or "오늘 목표" in ln:
            log_hint = ln.strip()
            break

    # 3) session-notes 최근
    sn = tail(SESSION, 20)
    sn_compact = " / ".join([s.strip("-•* ").strip() for s in sn if s.strip()])[:220]

    # 4) git
    git_hint = git_recent_changes()

    parts = []
    if log_hint: parts.append(log_hint)
    if sn_compact: parts.append(sn_compact)
    if git_hint: parts.append(git_hint)
    if not parts:
        parts.append("작업 정리 자동 요약: 주요 변경 없음")

    return "[auto] " + " | ".join(parts)

def append_session(note: str):
    ts = datetime.datetime.now().strftime("%F %T")
    line = f"[{ts}] {note}\n"
    with open(SESSION, "a", encoding="utf-8") as f:
        f.write(line)

def backup_zip():
    with zipfile.ZipFile(BACKUP, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in (SESSION, TASKS):
            if os.path.exists(f):
                zf.write(f, os.path.basename(f))
        if os.path.exists(LOG):
            zf.write(LOG, os.path.basename(LOG))
    return BACKUP

def main():
    # 1) 입력 받아보고 없으면 자동요약 생성
    note = read_stdin()
    if not note:
        note = make_auto_summary()

    append_session(note)
    path = backup_zip()
    print("💾 백업 완료:", path)
    print("📝 세션 노트에 기록 추가됨:", note[:200])

if __name__ == "__main__":
    main()
