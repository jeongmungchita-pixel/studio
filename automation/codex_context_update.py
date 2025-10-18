#!/usr/bin/env python3
"""Codex에게 현재 프로젝트 전체 컨텍스트 업데이트"""
import os
import requests
import json
import subprocess
from datetime import datetime
from pathlib import Path

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8765"

def get_project_overview():
    """프로젝트 전체 개요 수집"""
    overview = {
        "project_name": "KGF 넥서스 (체조 관리 시스템)",
        "tech_stack": [],
        "architecture": [],
        "recent_progress": [],
        "file_structure": {},
        "git_status": {}
    }
    
    # package.json에서 기술 스택 추출
    package_json = Path(STUDIO_DIR) / "package.json"
    if package_json.exists():
        try:
            with open(package_json) as f:
                pkg = json.load(f)
                deps = list(pkg.get("dependencies", {}).keys())
                overview["tech_stack"] = deps[:15]  # 주요 의존성만
        except:
            pass
    
    # README에서 프로젝트 정보 추출
    readme_files = ["README.md", "docs/README.md"]
    for readme_file in readme_files:
        readme_path = Path(STUDIO_DIR) / readme_file
        if readme_path.exists():
            try:
                with open(readme_path, 'r', encoding='utf-8') as f:
                    content = f.read()[:2000]  # 처음 2000자만
                    overview["project_description"] = content
                    break
            except:
                pass
    
    # 최근 커밋 히스토리
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-10"],
            cwd=STUDIO_DIR,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            commits = result.stdout.strip().split('\n')
            overview["recent_commits"] = commits[:5]
    except:
        pass
    
    # 현재 Git 상태
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=STUDIO_DIR,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            changes = result.stdout.strip().split('\n')
            overview["git_status"] = {
                "modified_files": len([c for c in changes if c.startswith(' M')]),
                "new_files": len([c for c in changes if c.startswith('??')]),
                "total_changes": len([c for c in changes if c.strip()])
            }
    except:
        pass
    
    return overview

def get_architecture_summary():
    """아키텍처 요약 정보"""
    architecture = {
        "domains": [],
        "services": [],
        "components": [],
        "types": [],
        "key_files": []
    }
    
    # 도메인 구조 분석
    domains_dir = Path(STUDIO_DIR) / "src" / "domains"
    if domains_dir.exists():
        architecture["domains"] = [d.name for d in domains_dir.iterdir() if d.is_dir()]
    
    # 서비스 레이어 분석
    services_dir = Path(STUDIO_DIR) / "src" / "services"
    if services_dir.exists():
        services = [f.stem for f in services_dir.glob("*.ts")]
        architecture["services"] = services
    
    # 주요 컴포넌트 분석
    components_dir = Path(STUDIO_DIR) / "src" / "components"
    if components_dir.exists():
        # UI 컴포넌트 개수만 카운트
        ui_components = len(list((components_dir / "ui").glob("*.tsx"))) if (components_dir / "ui").exists() else 0
        common_components = len(list((components_dir / "common").glob("*.tsx"))) if (components_dir / "common").exists() else 0
        architecture["components"] = {
            "ui_components": ui_components,
            "common_components": common_components
        }
    
    # 타입 정의 분석
    types_dir = Path(STUDIO_DIR) / "src" / "types"
    if types_dir.exists():
        types = [f.stem for f in types_dir.glob("*.ts")]
        architecture["types"] = types
    
    return architecture

def get_befs_current_state():
    """BEFS Agent 현재 상태"""
    befs_state = {
        "status": "disconnected",
        "tasks": 0,
        "skills": 0,
        "recent_learning": []
    }
    
    try:
        # BEFS 상태 확인
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code == 200:
            health_data = response.json()
            befs_state["status"] = "connected"
            befs_state["version"] = health_data.get("version", "unknown")
        
        # Tasks 개수
        tasks_response = requests.get(f"{BEFS_URL}/tasks", timeout=2)
        if tasks_response.status_code == 200:
            tasks = tasks_response.json()
            befs_state["tasks"] = len(tasks)
            # 최근 완료된 태스크
            recent_tasks = [t for t in tasks if t.get("status") == "done"][-3:]
            befs_state["recent_completed"] = [t.get("title", "Unknown") for t in recent_tasks]
        
        # Skills 개수
        skills_response = requests.get(f"{BEFS_URL}/skills", timeout=2)
        if skills_response.status_code == 200:
            skills = skills_response.json()
            befs_state["skills"] = len(skills)
            # Codex 관련 스킬
            codex_skills = [s for s in skills if "codex" in s.get("tags", "").lower()]
            befs_state["codex_skills"] = len(codex_skills)
    
    except Exception as e:
        befs_state["error"] = str(e)
    
    return befs_state

def create_context_summary():
    """전체 컨텍스트 요약 생성"""
    print("📊 프로젝트 컨텍스트 수집 중...")
    
    project_overview = get_project_overview()
    architecture = get_architecture_summary()
    befs_state = get_befs_current_state()
    
    # 컨텍스트 요약 생성
    context_summary = f"""# 🏗️ KGF 넥서스 프로젝트 현재 상황 업데이트

## 📋 프로젝트 개요
- **이름**: {project_overview['project_name']}
- **기술 스택**: {', '.join(project_overview['tech_stack'][:8])}
- **현재 변경사항**: {project_overview['git_status'].get('total_changes', 0)}개 파일

## 🏛️ 아키텍처 현황
- **도메인**: {', '.join(architecture['domains'])} ({len(architecture['domains'])}개)
- **서비스**: {len(architecture['services'])}개 서비스 레이어
- **UI 컴포넌트**: {architecture['components'].get('ui_components', 0)}개
- **타입 정의**: {', '.join(architecture['types'])} ({len(architecture['types'])}개)

## 🤖 BEFS Agent 상태
- **연결 상태**: {befs_state['status']}
- **관리 중인 Tasks**: {befs_state['tasks']}개
- **등록된 Skills**: {befs_state['skills']}개
- **Codex 학습 스킬**: {befs_state.get('codex_skills', 0)}개

## 📈 최근 진행사항
"""
    
    # 최근 커밋 추가
    if project_overview.get('recent_commits'):
        context_summary += "### Git 커밋 히스토리:\n"
        for commit in project_overview['recent_commits'][:3]:
            context_summary += f"- {commit}\n"
    
    # 최근 완료 태스크 추가
    if befs_state.get('recent_completed'):
        context_summary += "\n### 최근 완료된 작업:\n"
        for task in befs_state['recent_completed']:
            context_summary += f"- {task}\n"
    
    context_summary += f"""
## 🎯 현재 상태 요약
이 프로젝트는 체조 관리 시스템으로, 도메인 기반 아키텍처를 사용하여 구축되었습니다. 
BEFS Agent와 통합되어 있으며, Codex와의 협업을 통해 지속적으로 개발되고 있습니다.

**업데이트 시간**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    
    return context_summary, {
        "project_overview": project_overview,
        "architecture": architecture, 
        "befs_state": befs_state
    }

def save_to_befs(context_summary, context_data):
    """BEFS Agent에 컨텍스트 저장"""
    try:
        # 1. Skill로 저장 (Codex가 참조할 수 있도록)
        skill_data = {
            "name": "project.current_context",
            "command": "context_full",
            "description": "프로젝트 전체 현재 상황 컨텍스트",
            "prompt": context_summary,
            "tags": "project,context,codex,current-status"
        }
        
        # 기존 컨텍스트 스킬이 있으면 업데이트, 없으면 생성
        response = requests.post(f"{BEFS_URL}/skills", json=skill_data, timeout=5)
        if response.status_code == 200:
            skill_id = response.json().get('id')
            print(f"✅ 프로젝트 컨텍스트 스킬 저장 완료 (ID: {skill_id})")
        
        # 2. Task로도 저장 (기록용)
        task_data = {
            "title": f"프로젝트 컨텍스트 업데이트 - {datetime.now().strftime('%m/%d %H:%M')}",
            "status": "done",
            "priority": 1,
            "metadata": json.dumps({
                "type": "context_update",
                "domains_count": len(context_data["architecture"]["domains"]),
                "services_count": len(context_data["architecture"]["services"]),
                "befs_tasks": context_data["befs_state"]["tasks"],
                "befs_skills": context_data["befs_state"]["skills"]
            }, ensure_ascii=False)
        }
        
        response = requests.post(f"{BEFS_URL}/tasks", json=task_data, timeout=5)
        if response.status_code == 200:
            task_id = response.json().get('id')
            print(f"✅ 컨텍스트 업데이트 태스크 저장 완료 (ID: {task_id})")
        
        return True
        
    except Exception as e:
        print(f"❌ BEFS 저장 오류: {e}")
        return False

def save_context_file(context_summary):
    """컨텍스트를 파일로도 저장"""
    context_file = Path(STUDIO_DIR) / "docs" / "CURRENT_CONTEXT.md"
    context_file.parent.mkdir(exist_ok=True)
    
    with open(context_file, 'w', encoding='utf-8') as f:
        f.write(context_summary)
    
    print(f"💾 컨텍스트 파일 저장: {context_file}")
    return context_file

def main():
    """메인 실행 함수"""
    print("🔄 Codex 컨텍스트 업데이트 시작")
    print("=" * 60)
    
    # BEFS Agent 연결 확인
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ BEFS Agent가 실행되지 않았습니다")
            print("   실행: python3 automation/befs_start.py")
            return False
    except:
        print("❌ BEFS Agent 연결 실패")
        return False
    
    # 컨텍스트 생성
    context_summary, context_data = create_context_summary()
    
    # 컨텍스트 출력 (미리보기)
    print("\n📋 생성된 컨텍스트 미리보기:")
    print("-" * 40)
    lines = context_summary.split('\n')
    for line in lines[:15]:  # 처음 15줄만 미리보기
        print(line)
    if len(lines) > 15:
        print(f"... (총 {len(lines)}줄 중 15줄 미리보기)")
    print("-" * 40)
    
    # BEFS에 저장
    print("\n💾 BEFS Agent에 저장 중...")
    befs_success = save_to_befs(context_summary, context_data)
    
    # 파일로도 저장
    context_file = save_context_file(context_summary)
    
    if befs_success:
        print(f"\n🎉 Codex 컨텍스트 업데이트 완료!")
        print(f"   이제 Codex가 프로젝트 전체 상황을 파악할 수 있습니다.")
        print(f"   BEFS Agent에서 'context_full' 명령으로 확인 가능합니다.")
    else:
        print(f"\n❌ 업데이트 실패")
    
    return befs_success

if __name__ == "__main__":
    main()
