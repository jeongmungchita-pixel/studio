#!/usr/bin/env python3
"""현재 BEFS 시스템을 다른 프로젝트에 복제"""
import os
import shutil
import json
from pathlib import Path

def clone_befs_system(target_project_path, project_name):
    """BEFS 시스템을 다른 프로젝트에 복제"""
    
    print(f"🚀 BEFS 시스템을 {project_name}에 복제 중...")
    print("=" * 50)
    
    # 대상 프로젝트 경로 확인 및 생성
    target_path = Path(target_project_path).expanduser()
    if not target_path.exists():
        print(f"📁 프로젝트 폴더가 없습니다. 자동 생성 중: {target_path}")
        target_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ 폴더 생성 완료: {target_path}")
    else:
        print(f"📁 기존 프로젝트 폴더 사용: {target_path}")
    
    # 복제할 파일들 정의
    source_automation = Path("~/automation").expanduser()
    source_memory = Path("~/windsurf-memory").expanduser()
    
    # 대상 경로 설정
    target_automation = target_path / "automation"
    target_memory = target_path / "befs-memory"
    
    print(f"📂 소스: {source_automation}")
    print(f"📂 대상: {target_automation}")
    
    # 1. automation 폴더 복사
    if target_automation.exists():
        backup_path = target_path / "automation_backup"
        print(f"⚠️  기존 automation 폴더를 {backup_path}로 백업")
        shutil.move(str(target_automation), str(backup_path))
    
    print("📋 automation 스크립트 복사 중...")
    shutil.copytree(str(source_automation), str(target_automation))
    
    # 2. BEFS Agent 복사
    if target_memory.exists():
        backup_memory = target_path / "befs-memory_backup"
        print(f"⚠️  기존 befs-memory를 {backup_memory}로 백업")
        shutil.move(str(target_memory), str(backup_memory))
    
    print("🤖 BEFS Agent 복사 중...")
    shutil.copytree(str(source_memory), str(target_memory))
    
    # 3. 프로젝트별 설정 파일 생성
    create_project_config(target_path, project_name, target_project_path)
    
    # 4. 경로 수정
    update_paths_for_project(target_automation, target_memory, target_project_path)
    
    print(f"\n✅ 복제 완료!")
    print(f"📁 automation: {target_automation}")
    print(f"🤖 BEFS Agent: {target_memory}")
    
    return True

def create_project_config(target_path, project_name, project_path):
    """프로젝트별 설정 파일 생성"""
    
    config = {
        "project": {
            "name": project_name,
            "path": str(project_path),
            "created_at": "2025-10-19"
        },
        "befs": {
            "agent_port": 8766,  # 다른 포트 사용
            "memory_path": "./befs-memory",
            "automation_path": "./automation"
        },
        "sync": {
            "watch_extensions": [".py", ".js", ".ts", ".tsx", ".jsx"],
            "ignore_patterns": ["node_modules", "__pycache__", ".git"],
            "auto_sync": True
        }
    }
    
    config_file = target_path / "befs_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"⚙️  설정 파일 생성: {config_file}")

def update_paths_for_project(automation_path, memory_path, project_path):
    """스크립트 내 경로들을 새 프로젝트에 맞게 수정"""
    
    print("🔧 경로 업데이트 중...")
    
    # automation 스크립트들의 경로 수정
    scripts_to_update = [
        "befs_start.py",
        "befs_stop.py", 
        "befs_status.py",
        "codex_sync.py",
        "codex_watcher.py"
    ]
    
    for script in scripts_to_update:
        script_path = automation_path / script
        if script_path.exists():
            # 파일 내용 읽기
            with open(script_path, 'r') as f:
                content = f.read()
            
            # 경로 치환
            content = content.replace(
                'os.path.expanduser("~/windsurf-memory")',
                f'os.path.join(os.path.dirname(__file__), "..", "befs-memory")'
            )
            content = content.replace(
                'os.path.expanduser("~/federation/studio")',
                f'"{project_path}"'
            )
            content = content.replace(
                'STUDIO_DIR = os.path.expanduser("~/federation/studio")',
                f'STUDIO_DIR = "{project_path}"'
            )
            content = content.replace(
                '"http://127.0.0.1:8765"',
                '"http://127.0.0.1:8766"'  # 다른 포트 사용
            )
            
            # 파일 다시 쓰기
            with open(script_path, 'w') as f:
                f.write(content)
    
    # BEFS Agent 포트 변경
    agent_main = memory_path / "agent" / "main.py"
    if agent_main.exists():
        with open(agent_main, 'r') as f:
            content = f.read()
        
        content = content.replace(
            'app = FastAPI(title="BEFS Hybrid Agent v4.5")',
            f'app = FastAPI(title="BEFS Agent - {project_path}")'
        )
        
        with open(agent_main, 'w') as f:
            f.write(content)

def create_startup_script(target_path, project_name):
    """프로젝트 전용 시작 스크립트 생성"""
    
    startup_script = f'''#!/usr/bin/env python3
"""
{project_name} BEFS 시스템 시작 스크립트
"""
import os
import subprocess
import sys

def main():
    print(f"🚀 {project_name} BEFS 시스템 시작")
    print("=" * 50)
    
    # 현재 디렉토리를 프로젝트 루트로 설정
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    # BEFS Agent 시작
    print("🤖 BEFS Agent 시작 중...")
    subprocess.run([sys.executable, "automation/befs_start.py"])
    
    print("✅ {project_name} BEFS 시스템 준비 완료!")
    print("📋 사용 가능한 명령:")
    print("   python3 automation/befs_status.py  # 상태 확인")
    print("   python3 automation/befs_tasks.py   # Tasks 목록")
    print("   python3 automation/codex_sync.py   # 수동 동기화")

if __name__ == "__main__":
    main()
'''
    
    script_path = target_path / "start_befs.py"
    with open(script_path, 'w') as f:
        f.write(startup_script)
    
    os.chmod(script_path, 0o755)
    print(f"🚀 시작 스크립트 생성: {script_path}")

def main():
    """메인 실행 함수"""
    print("🔄 BEFS 시스템 복제 도구")
    print("=" * 50)
    
    # 사용자 입력
    target_project = input("📁 대상 프로젝트 경로를 입력하세요: ").strip()
    if not target_project:
        print("❌ 프로젝트 경로가 필요합니다")
        return
    
    project_name = input("📝 프로젝트 이름을 입력하세요: ").strip()
    if not project_name:
        project_name = os.path.basename(target_project)
    
    # 복제 실행
    success = clone_befs_system(target_project, project_name)
    
    if success:
        # 시작 스크립트 생성
        create_startup_script(Path(target_project), project_name)
        
        print(f"\n🎉 {project_name}에 BEFS 시스템 복제 완료!")
        print(f"\n📋 다음 단계:")
        print(f"   1. cd {target_project}")
        print(f"   2. python3 start_befs.py")
        print(f"   3. 키보드 매크로 설정 (automation/via_macros.json)")
        
        print(f"\n💡 주요 변경사항:")
        print(f"   • Agent 포트: 8765 → 8766")
        print(f"   • 메모리 위치: ./befs-memory")
        print(f"   • 설정 파일: ./befs_config.json")
    else:
        print("❌ 복제 실패")

if __name__ == "__main__":
    main()
