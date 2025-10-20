#!/usr/bin/env python3
"""BEFS 프로젝트 허브 - 3개 앱 통합 관리"""
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class Project:
    """프로젝트 정보"""
    name: str
    path: str
    type: str  # 'befs', 'kgf', 'windsurf'
    status: str  # 'active', 'inactive', 'error'
    port: Optional[int] = None
    last_active: Optional[str] = None
    description: str = ""
    
    def to_dict(self):
        return asdict(self)

class ProjectHub:
    """프로젝트 허브 관리자"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.expanduser("~/befs-automation/hub_config.json")
        self.projects: Dict[str, Project] = {}
        self.load_config()
    
    def load_config(self):
        """설정 파일 로드"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for name, proj_data in data.get('projects', {}).items():
                    self.projects[name] = Project(**proj_data)
        else:
            # 기본 프로젝트 등록
            self.register_default_projects()
    
    def save_config(self):
        """설정 파일 저장"""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        
        config = {
            'projects': {name: proj.to_dict() for name, proj in self.projects.items()},
            'last_updated': datetime.now().isoformat()
        }
        
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    
    def register_default_projects(self):
        """기본 프로젝트들 등록"""
        default_projects = [
            Project(
                name="befs-automation",
                path=os.path.expanduser("~/befs-automation"),
                type="befs",
                status="active",
                port=8765,
                description="AI 간 학습 공유 및 자동화 시스템 (메인 허브)"
            )
        ]
        
        for project in default_projects:
            self.projects[project.name] = project
        
        self.save_config()
    
    def register_project(self, project: Project):
        """새 프로젝트 등록"""
        self.projects[project.name] = project
        self.save_config()
        print(f"✅ 프로젝트 등록: {project.name}")
    
    def get_project(self, name: str) -> Optional[Project]:
        """프로젝트 정보 조회"""
        return self.projects.get(name)
    
    def list_projects(self) -> List[Project]:
        """모든 프로젝트 목록"""
        return list(self.projects.values())
    
    def start_project(self, name: str) -> bool:
        """프로젝트 시작"""
        project = self.get_project(name)
        if not project:
            print(f"❌ 프로젝트를 찾을 수 없습니다: {name}")
            return False
        
        if not os.path.exists(project.path):
            print(f"❌ 프로젝트 경로가 존재하지 않습니다: {project.path}")
            return False
        
        # 자기 자신(befs-automation) 처리
        if name == "befs-automation":
            return self.start_self()
        
        try:
            # 다른 프로젝트 시작 스크립트 실행
            start_script = self.get_start_script(project)
            if start_script:
                subprocess.Popen([
                    "python3", start_script
                ], cwd=project.path)
                
                project.status = "active"
                project.last_active = datetime.now().isoformat()
                self.save_config()
                
                print(f"🚀 프로젝트 시작: {name}")
                return True
            else:
                print(f"❌ 시작 스크립트를 찾을 수 없습니다: {name}")
                return False
                
        except Exception as e:
            print(f"❌ 프로젝트 시작 실패: {e}")
            return False
    
    def start_self(self) -> bool:
        """자기 자신(BEFS Automation) 시작"""
        try:
            # BEFS Agent 서버 시작
            befs_project = self.get_project("befs-automation")
            
            # 이미 실행 중인지 확인
            if self.is_port_in_use(befs_project.port):
                print(f"✅ BEFS Automation이 이미 실행 중입니다 (포트 {befs_project.port})")
                befs_project.status = "active"
                self.save_config()
                return True
            
            # Firebase Agent 시작
            agent_script = os.path.join(befs_project.path, "firebase_agent.py")
            if os.path.exists(agent_script):
                subprocess.Popen([
                    "python3", agent_script
                ], cwd=befs_project.path)
                
                befs_project.status = "active"
                befs_project.last_active = datetime.now().isoformat()
                self.save_config()
                
                print(f"🚀 BEFS Automation 서버 시작: http://localhost:{befs_project.port}")
                return True
            else:
                print("❌ firebase_agent.py를 찾을 수 없습니다")
                return False
                
        except Exception as e:
            print(f"❌ BEFS Automation 시작 실패: {e}")
            return False
    
    def is_port_in_use(self, port: int) -> bool:
        """포트 사용 중인지 확인"""
        try:
            result = subprocess.run([
                "lsof", "-ti", f":{port}"
            ], capture_output=True, text=True)
            return bool(result.stdout.strip())
        except:
            return False
    
    def stop_project(self, name: str) -> bool:
        """프로젝트 중지"""
        project = self.get_project(name)
        if not project:
            return False
        
        # 포트 기반으로 프로세스 종료
        if project.port:
            try:
                subprocess.run([
                    "lsof", "-ti", f":{project.port}"
                ], capture_output=True, text=True, check=True)
                
                subprocess.run([
                    "kill", "-9", f"$(lsof -ti :{project.port})"
                ], shell=True)
                
                project.status = "inactive"
                self.save_config()
                print(f"⏹️ 프로젝트 중지: {name}")
                return True
            except:
                pass
        
        project.status = "inactive"
        self.save_config()
        return True
    
    def get_start_script(self, project: Project) -> Optional[str]:
        """프로젝트별 시작 스크립트 경로"""
        possible_scripts = [
            os.path.join(project.path, "automation", "session_start.py"),
            os.path.join(project.path, "start.py"),
            os.path.join(project.path, "main.py"),
            os.path.join(project.path, "app.py")
        ]
        
        for script in possible_scripts:
            if os.path.exists(script):
                return script
        
        return None
    
    def get_status_summary(self) -> Dict:
        """전체 상태 요약"""
        # 실시간 상태 업데이트
        self.update_project_status()
        
        active_count = sum(1 for p in self.projects.values() if p.status == "active")
        total_count = len(self.projects)
        
        return {
            'total_projects': total_count,
            'active_projects': active_count,
            'inactive_projects': total_count - active_count,
            'projects': [p.to_dict() for p in self.projects.values()]
        }
    
    def update_project_status(self):
        """모든 프로젝트의 실시간 상태 업데이트"""
        for project in self.projects.values():
            if project.port:
                if self.is_port_in_use(project.port):
                    if project.status != "active":
                        project.status = "active"
                        project.last_active = datetime.now().isoformat()
                else:
                    if project.status == "active":
                        project.status = "inactive"
        
        self.save_config()
    
    def open_project_in_windsurf(self, name: str) -> bool:
        """프로젝트를 Windsurf에서 열기"""
        project = self.get_project(name)
        if not project:
            return False
        
        try:
            subprocess.run([
                "open", "-a", "Windsurf", project.path
            ])
            print(f"🌊 Windsurf에서 열기: {name}")
            return True
        except Exception as e:
            print(f"❌ Windsurf 열기 실패: {e}")
            return False

# CLI 인터페이스
def main():
    """메인 CLI"""
    import sys
    
    hub = ProjectHub()
    
    if len(sys.argv) < 2:
        print("🏢 BEFS 프로젝트 허브")
        print("=" * 50)
        
        summary = hub.get_status_summary()
        print(f"📊 총 프로젝트: {summary['total_projects']}")
        print(f"🟢 활성: {summary['active_projects']}")
        print(f"⚪ 비활성: {summary['inactive_projects']}")
        print()
        
        for project in hub.list_projects():
            status_emoji = "🟢" if project.status == "active" else "⚪"
            print(f"{status_emoji} {project.name} ({project.type}) - {project.description}")
        
        print("\n사용법:")
        print("  python3 project_hub.py start <project_name>")
        print("  python3 project_hub.py stop <project_name>")
        print("  python3 project_hub.py open <project_name>")
        return
    
    command = sys.argv[1]
    
    if command == "start" and len(sys.argv) > 2:
        hub.start_project(sys.argv[2])
    elif command == "stop" and len(sys.argv) > 2:
        hub.stop_project(sys.argv[2])
    elif command == "open" and len(sys.argv) > 2:
        hub.open_project_in_windsurf(sys.argv[2])
    else:
        print("❌ 잘못된 명령어입니다.")

if __name__ == "__main__":
    main()
