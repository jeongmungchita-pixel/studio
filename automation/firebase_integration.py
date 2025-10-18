#!/usr/bin/env python3
"""Firebase 연동 BEFS 시스템"""
import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional

class FirebaseBEFS:
    """Firebase 기반 BEFS 시스템"""
    
    def __init__(self, firebase_config: Dict):
        self.config = firebase_config
        self.base_url = f"https://{firebase_config['projectId']}-default-rtdb.firebaseio.com"
        self.auth_token = firebase_config.get('authToken')
        
    def _make_request(self, method: str, path: str, data: Optional[Dict] = None):
        """Firebase REST API 요청"""
        url = f"{self.base_url}/{path}.json"
        if self.auth_token:
            url += f"?auth={self.auth_token}"
        
        headers = {'Content-Type': 'application/json'}
        
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        return response.json() if response.status_code == 200 else None

    # Tasks 관리
    def get_tasks(self, user_id: str = "default") -> List[Dict]:
        """Tasks 조회"""
        tasks = self._make_request('GET', f'users/{user_id}/tasks')
        return list(tasks.values()) if tasks else []
    
    def add_task(self, task: Dict, user_id: str = "default") -> str:
        """Task 추가"""
        task['created_at'] = datetime.now().isoformat()
        task['updated_at'] = datetime.now().isoformat()
        
        result = self._make_request('POST', f'users/{user_id}/tasks', task)
        return result.get('name') if result else None
    
    def update_task(self, task_id: str, updates: Dict, user_id: str = "default") -> bool:
        """Task 업데이트"""
        updates['updated_at'] = datetime.now().isoformat()
        result = self._make_request('PUT', f'users/{user_id}/tasks/{task_id}', updates)
        return result is not None

    # Skills 관리
    def get_skills(self, user_id: str = "default") -> List[Dict]:
        """Skills 조회"""
        skills = self._make_request('GET', f'users/{user_id}/skills')
        return list(skills.values()) if skills else []
    
    def add_skill(self, skill: Dict, user_id: str = "default") -> str:
        """Skill 추가"""
        skill['created_at'] = datetime.now().isoformat()
        skill['updated_at'] = datetime.now().isoformat()
        
        result = self._make_request('POST', f'users/{user_id}/skills', skill)
        return result.get('name') if result else None

    # 세션 관리
    def save_session_summary(self, summary: str, user_id: str = "default") -> bool:
        """세션 요약 저장"""
        session_data = {
            'summary': summary,
            'timestamp': datetime.now().isoformat(),
            'type': 'session_summary'
        }
        
        result = self._make_request('POST', f'users/{user_id}/sessions', session_data)
        return result is not None
    
    def get_latest_session(self, user_id: str = "default") -> Optional[Dict]:
        """최신 세션 조회"""
        sessions = self._make_request('GET', f'users/{user_id}/sessions')
        if not sessions:
            return None
        
        # 최신 세션 반환
        latest = max(sessions.values(), key=lambda x: x['timestamp'])
        return latest

    # 팀 협업 기능
    def share_skill_with_team(self, skill_id: str, team_id: str, user_id: str = "default") -> bool:
        """팀과 Skill 공유"""
        skill = self._make_request('GET', f'users/{user_id}/skills/{skill_id}')
        if not skill:
            return False
        
        # 팀 공유 Skills에 추가
        skill['shared_by'] = user_id
        skill['shared_at'] = datetime.now().isoformat()
        
        result = self._make_request('POST', f'teams/{team_id}/shared_skills', skill)
        return result is not None
    
    def get_team_skills(self, team_id: str) -> List[Dict]:
        """팀 공유 Skills 조회"""
        skills = self._make_request('GET', f'teams/{team_id}/shared_skills')
        return list(skills.values()) if skills else []

def create_firebase_config():
    """Firebase 설정 생성"""
    
    config_template = {
        "projectId": "befs-automation",
        "databaseURL": "https://befs-automation-default-rtdb.firebaseio.com",
        "authToken": "YOUR_AUTH_TOKEN_HERE",
        "apiKey": "YOUR_API_KEY_HERE",
        "authDomain": "befs-automation.firebaseapp.com",
        "storageBucket": "befs-automation.appspot.com"
    }
    
    return config_template

def migrate_sqlite_to_firebase():
    """기존 SQLite 데이터를 Firebase로 마이그레이션"""
    
    print("🔄 SQLite → Firebase 마이그레이션")
    print("=" * 50)
    
    # Firebase 설정 로드
    config = create_firebase_config()
    firebase = FirebaseBEFS(config)
    
    # SQLite에서 데이터 읽기 (기존 BEFS Agent 사용)
    try:
        import sqlite3
        db_path = os.path.expanduser("~/windsurf-memory/memory.sqlite")
        
        if not os.path.exists(db_path):
            print("❌ SQLite 데이터베이스가 없습니다")
            return False
        
        conn = sqlite3.connect(db_path)
        
        # Tasks 마이그레이션
        print("📋 Tasks 마이그레이션 중...")
        tasks = conn.execute("SELECT * FROM Tasks").fetchall()
        for task in tasks:
            task_data = {
                'id': task[0],
                'title': task[1],
                'description': task[2] if len(task) > 2 else '',
                'status': 'done' if task[3] else 'todo',
                'priority': 3,
                'source': 'migration'
            }
            firebase.add_task(task_data)
        
        print(f"✅ {len(tasks)}개 Tasks 마이그레이션 완료")
        
        # Skills 마이그레이션
        print("🎓 Skills 마이그레이션 중...")
        skills = conn.execute("SELECT * FROM Skills").fetchall()
        for skill in skills:
            skill_data = {
                'id': skill[0],
                'name': skill[1],
                'command': skill[2] if len(skill) > 2 else '',
                'description': skill[3] if len(skill) > 3 else '',
                'prompt': skill[4] if len(skill) > 4 else '',
                'tags': skill[6] if len(skill) > 6 else '',
                'source': 'migration'
            }
            firebase.add_skill(skill_data)
        
        print(f"✅ {len(skills)}개 Skills 마이그레이션 완료")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 마이그레이션 오류: {e}")
        return False

def create_firebase_agent():
    """Firebase 기반 BEFS Agent 생성"""
    
    agent_code = '''#!/usr/bin/env python3
"""Firebase 기반 BEFS Agent"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import json

# Firebase 연동 모듈 import
from firebase_integration import FirebaseBEFS, create_firebase_config

app = FastAPI(title="BEFS Firebase Agent v5.0")

# Firebase 설정
config = create_firebase_config()
firebase = FirebaseBEFS(config)

class Task(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[int] = 3

class Skill(BaseModel):
    name: str
    command: Optional[str] = ""
    description: Optional[str] = ""
    prompt: Optional[str] = ""
    tags: Optional[str] = ""

@app.get("/health")
def health():
    return {"ok": True, "version": "5.0", "backend": "Firebase"}

@app.get("/tasks")
def get_tasks(user_id: str = "default"):
    try:
        tasks = firebase.get_tasks(user_id)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tasks")
def add_task(task: Task, user_id: str = "default"):
    try:
        task_id = firebase.add_task(task.dict(), user_id)
        return {"id": task_id, "added": task.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/skills")
def get_skills(user_id: str = "default"):
    try:
        skills = firebase.get_skills(user_id)
        return skills
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/skills")
def add_skill(skill: Skill, user_id: str = "default"):
    try:
        skill_id = firebase.add_skill(skill.dict(), user_id)
        return {"id": skill_id, "added": skill.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summary")
def get_summary(user_id: str = "default"):
    try:
        session = firebase.get_latest_session(user_id)
        return {"summary": session['summary'] if session else "세션 요약 없음"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auto")
def auto_summary(payload: dict, user_id: str = "default"):
    try:
        text = payload.get("text", "")
        success = firebase.save_session_summary(text, user_id)
        return {"auto_logged": len(text), "success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 팀 협업 API
@app.post("/share_skill/{skill_id}")
def share_skill(skill_id: str, team_id: str, user_id: str = "default"):
    try:
        success = firebase.share_skill_with_team(skill_id, team_id, user_id)
        return {"shared": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/team/{team_id}/skills")
def get_team_skills(team_id: str):
    try:
        skills = firebase.get_team_skills(team_id)
        return skills
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
'''
    
    # Firebase Agent 파일 생성
    agent_path = os.path.expanduser("~/befs-automation/firebase_agent.py")
    with open(agent_path, 'w') as f:
        f.write(agent_code)
    
    print(f"🔥 Firebase Agent 생성: {agent_path}")

def setup_firebase_project():
    """Firebase 프로젝트 설정 가이드"""
    
    setup_guide = '''
# 🔥 Firebase 프로젝트 설정 가이드

## 1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: "befs-automation"
4. Google Analytics 설정 (선택사항)

## 2. Realtime Database 설정
1. 좌측 메뉴 → "Realtime Database"
2. "데이터베이스 만들기" 클릭
3. 보안 규칙: 테스트 모드로 시작
4. 위치: us-central1 선택

## 3. 보안 규칙 설정
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "teams": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 4. 웹 앱 설정
1. 프로젝트 설정 → "일반" 탭
2. "앱 추가" → 웹 앱 선택
3. 앱 이름: "BEFS Automation"
4. Firebase SDK 설정 복사

## 5. 인증 설정 (선택사항)
1. 좌측 메뉴 → "Authentication"
2. "시작하기" 클릭
3. 로그인 방법 → "익명" 활성화
4. 또는 "Google" 로그인 설정

## 6. Python 패키지 설치
```bash
pip install firebase-admin
pip install pyrebase4
```

## 7. 설정 파일 업데이트
firebase_config.json 파일에 Firebase 설정 입력
'''
    
    guide_path = os.path.expanduser("~/befs-automation/FIREBASE_SETUP.md")
    with open(guide_path, 'w') as f:
        f.write(setup_guide)
    
    print(f"📚 Firebase 설정 가이드: {guide_path}")

def main():
    """메인 실행"""
    
    print("🔥 Firebase 연동 BEFS 시스템 생성")
    print("=" * 50)
    
    # 1. Firebase 설정 파일 생성
    config = create_firebase_config()
    config_path = os.path.expanduser("~/befs-automation/firebase_config.json")
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"⚙️ Firebase 설정 파일: {config_path}")
    
    # 2. Firebase Agent 생성
    create_firebase_agent()
    
    # 3. 설정 가이드 생성
    setup_firebase_project()
    
    # 4. 마이그레이션 스크립트 안내
    print(f"\n📋 다음 단계:")
    print(f"   1. Firebase 프로젝트 생성 (FIREBASE_SETUP.md 참조)")
    print(f"   2. firebase_config.json에 실제 설정 입력")
    print(f"   3. python3 firebase_integration.py (마이그레이션)")
    print(f"   4. python3 firebase_agent.py (서버 시작)")
    
    print(f"\n🎉 Firebase 연동의 장점:")
    print(f"   ☁️ 서버 실행 불필요 (항상 온라인)")
    print(f"   🔄 실시간 동기화 (모든 기기)")
    print(f"   👥 팀 협업 가능")
    print(f"   📱 모바일 지원")
    print(f"   🌍 글로벌 접근")

if __name__ == "__main__":
    main()
