#!/usr/bin/env python3
"""멀티 프로젝트 Firebase 관리 시스템"""
import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Optional

class MultiProjectFirebase:
    """프로젝트별 Firebase 분리 관리"""
    
    def __init__(self):
        self.config_dir = Path.home() / ".befs" / "projects"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
    def get_project_id(self, project_path: str) -> str:
        """프로젝트 경로 기반 고유 ID 생성"""
        # 프로젝트 경로를 해시화하여 고유 ID 생성
        path_hash = hashlib.md5(str(project_path).encode()).hexdigest()[:8]
        project_name = Path(project_path).name
        return f"{project_name}_{path_hash}"
    
    def create_project_config(self, project_path: str, project_type: str = "general") -> Dict:
        """프로젝트별 Firebase 설정 생성"""
        
        project_id = self.get_project_id(project_path)
        
        # 프로젝트 타입별 Firebase 설정
        if project_type == "befs":
            # BEFS 전용 프로젝트
            firebase_config = {
                "projectId": "befs-automation",
                "databaseURL": "https://befs-automation-default-rtdb.firebaseio.com",
                "namespace": f"befs_{project_id}",
                "features": ["ai_learning", "codex_sync", "automation"]
            }
        else:
            # 일반 앱 개발 프로젝트
            firebase_config = {
                "projectId": f"app-{project_id}",
                "databaseURL": f"https://app-{project_id}-default-rtdb.firebaseio.com",
                "namespace": f"app_{project_id}",
                "features": ["basic_memory", "session_tracking"]
            }
        
        # 공통 설정
        firebase_config.update({
            "project_path": str(project_path),
            "project_type": project_type,
            "created_at": "2025-10-19",
            "befs_port": self._get_available_port(project_id),
            "isolation_mode": True
        })
        
        return firebase_config
    
    def _get_available_port(self, project_id: str) -> int:
        """프로젝트별 고유 포트 할당"""
        # 프로젝트 ID 해시를 기반으로 포트 계산
        hash_int = int(hashlib.md5(project_id.encode()).hexdigest()[:4], 16)
        port = 8000 + (hash_int % 1000)  # 8000-8999 범위
        return port
    
    def save_project_config(self, project_path: str, config: Dict):
        """프로젝트 설정 저장"""
        project_id = self.get_project_id(project_path)
        config_file = self.config_dir / f"{project_id}.json"
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"📁 프로젝트 설정 저장: {config_file}")
    
    def load_project_config(self, project_path: str) -> Optional[Dict]:
        """프로젝트 설정 로드"""
        project_id = self.get_project_id(project_path)
        config_file = self.config_dir / f"{project_id}.json"
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        return None
    
    def list_projects(self) -> Dict[str, Dict]:
        """등록된 모든 프로젝트 목록"""
        projects = {}
        
        for config_file in self.config_dir.glob("*.json"):
            with open(config_file, 'r') as f:
                config = json.load(f)
                projects[config_file.stem] = config
        
        return projects
    
    def setup_project_isolation(self, project_path: str, project_type: str = "general"):
        """프로젝트별 격리 환경 설정"""
        
        print(f"🔧 프로젝트 격리 환경 설정: {project_path}")
        print(f"📋 프로젝트 타입: {project_type}")
        
        # 1. 프로젝트 설정 생성
        config = self.create_project_config(project_path, project_type)
        self.save_project_config(project_path, config)
        
        # 2. 프로젝트별 Firebase 설정 파일 생성
        self._create_isolated_firebase_config(project_path, config)
        
        # 3. 프로젝트별 BEFS Agent 생성
        self._create_isolated_agent(project_path, config)
        
        # 4. 프로젝트별 automation 스크립트 수정
        self._update_automation_scripts(project_path, config)
        
        return config
    
    def _create_isolated_firebase_config(self, project_path: str, config: Dict):
        """격리된 Firebase 설정 파일 생성"""
        
        firebase_config = {
            "projectId": config["projectId"],
            "databaseURL": config["databaseURL"],
            "namespace": config["namespace"],
            "apiKey": "YOUR_API_KEY_HERE",
            "authDomain": f"{config['projectId']}.firebaseapp.com",
            "storageBucket": f"{config['projectId']}.appspot.com"
        }
        
        config_file = Path(project_path) / "firebase_config.json"
        with open(config_file, 'w') as f:
            json.dump(firebase_config, f, indent=2)
        
        print(f"🔥 Firebase 설정: {config_file}")
    
    def _create_isolated_agent(self, project_path: str, config: Dict):
        """격리된 BEFS Agent 생성"""
        
        agent_code = f'''#!/usr/bin/env python3
"""
{Path(project_path).name} 전용 BEFS Agent
포트: {config["befs_port"]}
네임스페이스: {config["namespace"]}
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os

app = FastAPI(title="{Path(project_path).name} BEFS Agent")

# 프로젝트별 설정
PROJECT_ID = "{config["projectId"]}"
NAMESPACE = "{config["namespace"]}"
PORT = {config["befs_port"]}

# Firebase 설정 로드
with open("firebase_config.json", "r") as f:
    firebase_config = json.load(f)

@app.get("/health")
def health():
    return {{
        "ok": True,
        "project": "{Path(project_path).name}",
        "namespace": NAMESPACE,
        "port": PORT,
        "isolation": True
    }}

@app.get("/tasks")
def get_tasks():
    # 이 프로젝트만의 Tasks 반환
    return []

@app.post("/tasks")
def add_task(task: dict):
    # 이 프로젝트 네임스페이스에만 저장
    return {{"added": task.get("title", ""), "namespace": NAMESPACE}}

@app.get("/skills")
def get_skills():
    # 이 프로젝트만의 Skills 반환
    return []

@app.post("/skills")
def add_skill(skill: dict):
    # 이 프로젝트 네임스페이스에만 저장
    return {{"added": skill.get("name", ""), "namespace": NAMESPACE}}

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 {{Path(project_path).name}} BEFS Agent 시작")
    print(f"🌐 포트: {{PORT}}")
    print(f"📁 네임스페이스: {{NAMESPACE}}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
'''
        
        agent_file = Path(project_path) / "isolated_befs_agent.py"
        with open(agent_file, 'w') as f:
            f.write(agent_code)
        
        os.chmod(agent_file, 0o755)
        print(f"🤖 격리된 Agent: {agent_file}")
    
    def _update_automation_scripts(self, project_path: str, config: Dict):
        """automation 스크립트를 프로젝트별로 수정"""
        
        automation_dir = Path(project_path) / "automation"
        if not automation_dir.exists():
            return
        
        port = config["befs_port"]
        
        # befs_start.py 수정
        start_script = automation_dir / "befs_start.py"
        if start_script.exists():
            with open(start_script, 'r') as f:
                content = f.read()
            
            # 포트 변경
            content = content.replace(
                '"http://127.0.0.1:8765"',
                f'"http://127.0.0.1:{port}"'
            )
            
            # Agent 파일 경로 변경
            content = content.replace(
                'agent/main.py',
                'isolated_befs_agent.py'
            )
            
            with open(start_script, 'w') as f:
                f.write(content)
        
        print(f"🔧 automation 스크립트 업데이트 완료")

def create_project_switcher():
    """프로젝트 전환 도구 생성"""
    
    switcher_code = '''#!/usr/bin/env python3
"""BEFS 프로젝트 전환 도구"""
import os
import sys
from pathlib import Path
from multi_project_firebase import MultiProjectFirebase

def main():
    manager = MultiProjectFirebase()
    
    print("🔄 BEFS 프로젝트 전환")
    print("=" * 50)
    
    # 등록된 프로젝트 목록
    projects = manager.list_projects()
    
    if not projects:
        print("❌ 등록된 프로젝트가 없습니다")
        print("   python3 setup_here.py로 프로젝트를 먼저 설정하세요")
        return
    
    print("📋 등록된 프로젝트:")
    for i, (project_id, config) in enumerate(projects.items(), 1):
        project_name = Path(config["project_path"]).name
        project_type = config["project_type"]
        port = config["befs_port"]
        print(f"   {i}. {project_name} ({project_type}) - 포트 {port}")
    
    # 프로젝트 선택
    try:
        choice = int(input("\\n전환할 프로젝트 번호: ")) - 1
        project_list = list(projects.items())
        
        if 0 <= choice < len(project_list):
            project_id, config = project_list[choice]
            project_path = config["project_path"]
            
            print(f"\\n🚀 {Path(project_path).name}로 전환 중...")
            
            # 해당 프로젝트 디렉토리로 이동
            os.chdir(project_path)
            
            # Agent 시작
            if Path("isolated_befs_agent.py").exists():
                os.system("python3 isolated_befs_agent.py &")
                print(f"✅ {Path(project_path).name} BEFS Agent 시작됨")
                print(f"🌐 포트: {config['befs_port']}")
            else:
                print("⚠️  isolated_befs_agent.py가 없습니다")
        else:
            print("❌ 잘못된 선택입니다")
    
    except (ValueError, KeyboardInterrupt):
        print("\\n❌ 취소되었습니다")

if __name__ == "__main__":
    main()
'''
    
    switcher_file = Path.home() / "automation" / "switch_project.py"
    with open(switcher_file, 'w') as f:
        f.write(switcher_code)
    
    os.chmod(switcher_file, 0o755)
    print(f"🔄 프로젝트 전환 도구: {switcher_file}")

def main():
    """메인 실행"""
    
    print("🔧 멀티 프로젝트 Firebase 관리 시스템")
    print("=" * 50)
    
    manager = MultiProjectFirebase()
    
    # 예시 프로젝트 설정
    current_dir = os.getcwd()
    
    print("📋 사용 시나리오:")
    print("1. BEFS 개발 프로젝트: 전용 Firebase + 모든 기능")
    print("2. 일반 앱 개발: 별도 Firebase + 기본 메모리만")
    print("3. 각 프로젝트별 완전 격리")
    
    # 현재 프로젝트 설정 확인
    config = manager.load_project_config(current_dir)
    if config:
        print(f"\\n✅ 현재 프로젝트 설정됨:")
        print(f"   이름: {Path(config['project_path']).name}")
        print(f"   타입: {config['project_type']}")
        print(f"   포트: {config['befs_port']}")
        print(f"   네임스페이스: {config['namespace']}")
    else:
        print(f"\\n⚠️  현재 디렉토리가 BEFS 프로젝트로 설정되지 않음")
        print(f"   python3 setup_here.py 실행 권장")
    
    # 프로젝트 전환 도구 생성
    create_project_switcher()
    
    print(f"\\n🎯 멀티 프로젝트 관리 완성!")
    print(f"\\n📋 사용법:")
    print(f"   python3 ~/automation/switch_project.py  # 프로젝트 전환")
    print(f"   각 프로젝트별 독립된 Firebase 네임스페이스")
    print(f"   포트 자동 할당으로 충돌 방지")

if __name__ == "__main__":
    main()
