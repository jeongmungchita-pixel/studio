#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lv3: Extract "Next 1 Action" from text and insert at top of ~/windsurf-memory/tasks.md

Usage:
  echo "요약 텍스트..." | python3 next_action.py --stdin
  python3 next_action.py --from-file last_summary.txt
  python3 next_action.py --text "다음 한 걸음(Next 1 Action): ..."
"""
import os, sys, re, argparse, datetime

PATTERNS = [
    r"다음 한 걸음\s*\(?Next 1 Action\)?\s*[:\-]\s*(.+)",
    r"Next 1 Action\s*[:\-]\s*(.+)",
    r"다음 액션\s*[:\-]\s*(.+)",
]

def extract_next_action(text: str) -> str:
    for pat in PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    # fallback: pick first actionable bullet
    for line in text.splitlines():
        if line.strip().startswith(("-", "*", "•")):
            return line.strip()[1:].strip()
    return ""

def insert_task(task: str):
    base = os.path.expanduser("~/windsurf-memory")
    path = os.path.join(base, "tasks.md")
    ts = datetime.datetime.now().strftime("%Y-%m-%d")
    header = f"# ✅ Tasks\n"
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(header)
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    new_line = f"- [ ] {task}  ({ts} • N1)\n"
    # Insert after header if present, else prepend
    if original.startswith("# ✅ Tasks"):
        updated = "# ✅ Tasks\n" + new_line + original[len("# ✅ Tasks\n"):]
    else:
        updated = new_line + "\n" + original

    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)
    return path, task

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--stdin", action="store_true")
    g.add_argument("--from-file")
    g.add_argument("--text")
    args = ap.parse_args()

    if args.stdin:
        text = sys.stdin.read()
    elif args.from_file:
        with open(args.from_file, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = args.text

    task = extract_next_action(text)
    if not task:
        print("No Next 1 Action found in text.")
        sys.exit(1)

    path, t = insert_task(task)
    print(f"Inserted Next 1 Action into {path} → {t}")

if __name__ == "__main__":
    main()
