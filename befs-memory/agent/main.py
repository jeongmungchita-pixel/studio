from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import sqlite3, datetime, os

app = FastAPI(title="BEFS Agent - studio")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "memory.sqlite")

def db():
    return sqlite3.connect(DB_PATH)

class Task(BaseModel):
    title: str
    status: Optional[str] = "todo"
    priority: Optional[int] = 3
    due_at: Optional[str] = None
    metadata: Optional[str] = None

class Skill(BaseModel):
    name: str
    command: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    code: Optional[str] = None
    tags: Optional[str] = None

def init_db():
    conn = db()
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS Tasks (id INTEGER PRIMARY KEY, title TEXT, description TEXT, done INTEGER DEFAULT 0)")
    c.execute("""CREATE TABLE IF NOT EXISTS Skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        command TEXT,
        description TEXT,
        prompt TEXT,
        code TEXT,
        tags TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )""")
    conn.commit()
    conn.close()

init_db()

@app.get("/health")
def health():
    return {"ok": True, "version": "4.5"}

@app.get("/summary")
def summary():
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {"summary": f"Session summary generated at {ts}"}

@app.get("/tasks")
def get_tasks():
    conn = db()
    rows = conn.execute("SELECT id, title, status, priority, due_at, created_at, updated_at, metadata FROM Tasks").fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "status": r[2], "priority": r[3], "due_at": r[4], "created_at": r[5], "updated_at": r[6], "metadata": r[7]} for r in rows]

@app.post("/tasks")
def add_task(task: Task):
    conn = db()
    conn.execute("INSERT INTO Tasks (title, status, priority, due_at, metadata) VALUES (?, ?, ?, ?, ?)",
                 (task.title, task.status, task.priority, task.due_at, task.metadata))
    conn.commit()
    task_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"added": task.title, "id": task_id}

@app.put("/tasks/{task_id}")
def toggle_task(task_id: int):
    conn = db()
    # Toggle between todo, doing, done
    current = conn.execute("SELECT status FROM Tasks WHERE id=?", (task_id,)).fetchone()
    if current:
        new_status = "done" if current[0] != "done" else "todo"
        conn.execute("UPDATE Tasks SET status = ?, updated_at = datetime('now') WHERE id=?", (new_status, task_id))
        conn.commit()
    conn.close()
    return {"updated": task_id, "status": new_status if current else None}

@app.get("/skills")
def get_skills():
    conn = db()
    rows = conn.execute("SELECT id, name, command, description, prompt, code, tags, created_at, updated_at FROM Skills").fetchall()
    conn.close()
    return [{
        "id": r[0],
        "name": r[1],
        "command": r[2],
        "description": r[3],
        "prompt": r[4],
        "code": r[5],
        "tags": r[6],
        "created_at": r[7],
        "updated_at": r[8]
    } for r in rows]

@app.post("/skills")
def add_skill(skill: Skill):
    conn = db()
    conn.execute("INSERT INTO Skills (name, command, description, prompt, code, tags) VALUES (?, ?, ?, ?, ?, ?)",
                 (skill.name, skill.command, skill.description, skill.prompt, skill.code, skill.tags))
    conn.commit()
    skill_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"added": skill.name, "id": skill_id}

@app.post("/auto")
def auto_summary(payload: dict):
    text = payload.get("text", "")
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(os.path.expanduser("~/windsurf-memory/auto_summary.log"), "a") as f:
        f.write(f"[{ts}] {text}\n")
    return {"auto_logged": len(text)}
