#!/usr/bin/env python3
"""현재 워크스페이스에 BEFS 시스템 자동 설치"""
import os
import shutil
import json
from pathlib import Path

def setup_befs_here():
    """현재 디렉토리에 BEFS 시스템 설치"""
    
    # 현재 워크스페이스 경로
    current_dir = Path.cwd()
    project_name = current_dir.name
    
    print(f"🚀 현재 워크스페이스에 BEFS 시스템 설치")
    print(f"📁 위치: {current_dir}")
    print(f"📝 프로젝트: {project_name}")
    print("=" * 50)
    
    # 소스 경로
    source_automation = Path("~/automation").expanduser()
    source_memory = Path("~/windsurf-memory").expanduser()
    
    if not source_automation.exists():
        print("❌ 소스 automation 폴더가 없습니다")
        return False
    
    if not source_memory.exists():
        print("❌ 소스 windsurf-memory 폴더가 없습니다")
        return False
    
    # 대상 경로
    target_automation = current_dir / "automation"
    target_memory = current_dir / "befs-memory"
    
    # 1. automation 폴더 설치
    if target_automation.exists():
        backup_path = current_dir / f"automation_backup_{int(time.time())}"
        print(f"⚠️  기존 automation 폴더를 {backup_path.name}로 백업")
        shutil.move(str(target_automation), str(backup_path))
    
    print("📋 automation 시스템 설치 중...")
    shutil.copytree(str(source_automation), str(target_automation))
    
    # 2. BEFS Agent 설치
    if target_memory.exists():
        backup_memory = current_dir / f"befs-memory_backup_{int(time.time())}"
        print(f"⚠️  기존 befs-memory를 {backup_memory.name}로 백업")
        shutil.move(str(target_memory), str(backup_memory))
    
    print("🤖 BEFS Agent 설치 중...")
    shutil.copytree(str(source_memory), str(target_memory))
    
    # 3. 현재 프로젝트에 맞게 설정
    setup_project_config(current_dir, project_name)
    update_paths_for_current_project(target_automation, target_memory, current_dir)
    create_startup_scripts(current_dir, project_name)
    
    # 4. .gitignore 업데이트
    update_gitignore(current_dir)
    
    print(f"\n✅ BEFS 시스템 설치 완료!")
    print(f"📁 automation: ./automation/")
    print(f"🤖 BEFS Agent: ./befs-memory/")
    
    return True

def setup_project_config(project_path, project_name):
    """프로젝트 설정 파일 생성"""
    
    # 사용 가능한 포트 찾기
    import socket
    def find_free_port(start_port=8766):
        for port in range(start_port, start_port + 100):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('127.0.0.1', port))
                    return port
            except OSError:
                continue
        return 8766
    
    free_port = find_free_port()
    
    config = {
        "project": {
            "name": project_name,
            "path": str(project_path),
            "workspace": True,
            "created_at": "2025-10-19"
        },
        "befs": {
            "agent_port": free_port,
            "memory_path": "./befs-memory",
            "automation_path": "./automation"
        },
        "sync": {
            "watch_extensions": [".py", ".js", ".ts", ".tsx", ".jsx", ".vue", ".svelte"],
            "ignore_patterns": ["node_modules", "__pycache__", ".git", "dist", "build"],
            "auto_sync": True
        },
        "keyboard": {
            "enabled": True,
            "keymap_file": "./automation/via_macros.json"
        }
    }
    
    config_file = project_path / "befs_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"⚙️  설정 파일 생성: befs_config.json (포트: {free_port})")

def update_paths_for_current_project(automation_path, memory_path, project_path):
    """현재 프로젝트에 맞게 경로 수정"""
    
    print("🔧 경로 업데이트 중...")
    
    # 설정에서 포트 읽기
    config_file = project_path / "befs_config.json"
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    agent_port = config['befs']['agent_port']
    
    # automation 스크립트들의 경로 수정
    scripts_to_update = [
        "befs_start.py", "befs_stop.py", "befs_status.py",
        "codex_sync.py", "codex_watcher.py", "sync_coding_style.py"
    ]
    
    for script in scripts_to_update:
        script_path = automation_path / script
        if script_path.exists():
            with open(script_path, 'r') as f:
                content = f.read()
            
            # 경로 치환
            content = content.replace(
                'os.path.expanduser("~/windsurf-memory")',
                'os.path.join(os.path.dirname(__file__), "..", "befs-memory")'
            )
            content = content.replace(
                'os.path.expanduser("~/federation/studio")',
                'os.getcwd()'
            )
            content = content.replace(
                'STUDIO_DIR = os.path.expanduser("~/federation/studio")',
                'STUDIO_DIR = os.getcwd()'
            )
            content = content.replace(
                '"http://127.0.0.1:8765"',
                f'"http://127.0.0.1:{agent_port}"'
            )
            content = content.replace(
                'BASE_DIR = os.path.expanduser("~/windsurf-memory")',
                'BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "befs-memory")'
            )
            
            with open(script_path, 'w') as f:
                f.write(content)
    
    # BEFS Agent 설정 수정
    agent_main = memory_path / "agent" / "main.py"
    if agent_main.exists():
        with open(agent_main, 'r') as f:
            content = f.read()
        
        content = content.replace(
            'app = FastAPI(title="BEFS Hybrid Agent v4.5")',
            f'app = FastAPI(title="BEFS Agent - {project_path.name}")'
        )
        content = content.replace(
            'DB_PATH = os.path.expanduser("~/windsurf-memory/memory.sqlite")',
            'DB_PATH = os.path.join(os.path.dirname(__file__), "..", "memory.sqlite")'
        )
        
        with open(agent_main, 'w') as f:
            f.write(content)

def create_startup_scripts(project_path, project_name):
    """시작 스크립트들 생성"""
    
    # 메인 시작 스크립트
    startup_script = f'''#!/usr/bin/env python3
"""
{project_name} BEFS 시스템 시작
"""
import os
import sys
import subprocess
import json

def main():
    print(f"🚀 {project_name} BEFS 시스템 시작")
    print("=" * 50)
    
    # 설정 로드
    with open("befs_config.json", "r") as f:
        config = json.load(f)
    
    port = config["befs"]["agent_port"]
    
    print(f"📁 프로젝트: {project_name}")
    print(f"🌐 포트: {port}")
    print(f"📂 위치: {os.getcwd()}")
    
    # BEFS Agent 시작
    print("\\n🤖 BEFS Agent 시작 중...")
    result = subprocess.run([sys.executable, "automation/befs_start.py"])
    
    if result.returncode == 0:
        print(f"\\n✅ {project_name} BEFS 시스템 준비 완료!")
        print(f"\\n📋 사용 가능한 명령:")
        print(f"   python3 automation/befs_status.py   # 상태 확인")
        print(f"   python3 automation/befs_tasks.py    # Tasks 목록")
        print(f"   python3 automation/codex_sync.py    # 수동 동기화")
        print(f"   python3 stop_befs.py                # 시스템 종료")
    else:
        print("❌ 시작 실패")

if __name__ == "__main__":
    main()
'''
    
    # 종료 스크립트
    stop_script = f'''#!/usr/bin/env python3
"""
{project_name} BEFS 시스템 종료
"""
import subprocess
import sys

def main():
    print(f"⏹️  {project_name} BEFS 시스템 종료 중...")
    subprocess.run([sys.executable, "automation/befs_stop.py"])
    print("✅ 종료 완료")

if __name__ == "__main__":
    main()
'''
    
    # 파일 생성
    start_file = project_path / "start_befs.py"
    stop_file = project_path / "stop_befs.py"
    
    with open(start_file, 'w') as f:
        f.write(startup_script)
    
    with open(stop_file, 'w') as f:
        f.write(stop_script)
    
    os.chmod(start_file, 0o755)
    os.chmod(stop_file, 0o755)
    
    print(f"🚀 시작 스크립트: start_befs.py")
    print(f"⏹️  종료 스크립트: stop_befs.py")

def update_gitignore(project_path):
    """gitignore 업데이트"""
    
    gitignore_path = project_path / ".gitignore"
    
    befs_ignore = """
# BEFS Automation System
befs-memory/memory.sqlite
befs-memory/backups/
befs-memory/*.log
befs-memory/*.pid
automation_backup*
befs-memory_backup*
befs_config.json
"""
    
    if gitignore_path.exists():
        with open(gitignore_path, 'r') as f:
            content = f.read()
        
        if "BEFS Automation" not in content:
            with open(gitignore_path, 'a') as f:
                f.write(befs_ignore)
            print("📝 .gitignore 업데이트됨")
    else:
        with open(gitignore_path, 'w') as f:
            f.write(befs_ignore)
        print("📝 .gitignore 생성됨")

def main():
    """메인 실행"""
    import time
    
    print("🎯 현재 워크스페이스 BEFS 설치")
    print("=" * 50)
    
    success = setup_befs_here()
    
    if success:
        print(f"\\n🎉 설치 완료!")
        print(f"\\n📋 다음 단계:")
        print(f"   python3 start_befs.py     # BEFS 시스템 시작")
        print(f"   python3 stop_befs.py      # BEFS 시스템 종료")
        
        print(f"\\n⌨️  키보드 매크로:")
        print(f"   automation/via_macros.json 파일을 Via에서 임포트")
        
        print(f"\\n🔄 자동 동기화:")
        print(f"   Key 13: 파일 감시 시작")
        print(f"   Key 12: 수동 동기화")
    else:
        print("❌ 설치 실패")

if __name__ == "__main__":
    main()
