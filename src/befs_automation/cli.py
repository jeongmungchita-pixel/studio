#!/usr/bin/env python3
"""BEFS Automation CLI Interface"""
import click
import subprocess
import sys
import os
from pathlib import Path
from .project_hub import ProjectHub
from .config import config

@click.group()
@click.version_option(version="0.1.0")
def cli():
    """🤖 BEFS Automation - AI 간 학습 공유 및 자동화 시스템"""
    pass

@cli.command()
@click.option('--port', default=8765, help='서버 포트')
@click.option('--host', default='localhost', help='서버 호스트')
@click.option('--debug', is_flag=True, help='디버그 모드')
def start(port, host, debug):
    """BEFS 서버 시작"""
    click.echo(f"🚀 BEFS 서버 시작 중... http://{host}:{port}")
    
    # BEFS Agent 실행
    agent_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase_agent.py")
    cmd = [
        sys.executable, 
        "-m", "uvicorn", 
        "firebase_agent:app",
        "--host", host,
        "--port", str(port)
    ]
    
    if debug:
        cmd.append("--reload")
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        click.echo("\n👋 BEFS 서버 종료")

@cli.command()
def dashboard():
    """웹 대시보드 열기"""
    import webbrowser
    url = "http://localhost:8765"
    click.echo(f"🌐 대시보드 열기: {url}")
    webbrowser.open(url)

@cli.command()
@click.argument('title')
@click.option('--description', help='태스크 설명')
@click.option('--priority', default=3, help='우선순위 (1-5)')
def add_task(title, description, priority):
    """새 태스크 추가"""
    import requests
    
    try:
        response = requests.post('http://localhost:8765/tasks', json={
            'title': title,
            'description': description or '',
            'priority': priority
        })
        
        if response.status_code == 200:
            click.echo(f"✅ 태스크 추가됨: {title}")
        else:
            click.echo(f"❌ 오류: {response.text}")
    except requests.exceptions.ConnectionError:
        click.echo("❌ BEFS 서버가 실행되지 않았습니다. 'befs start'를 먼저 실행하세요.")

@cli.command()
@click.argument('name')
@click.option('--command', help='실행할 명령어')
@click.option('--description', help='스킬 설명')
def add_skill(name, command, description):
    """새 스킬 추가"""
    import requests
    
    try:
        response = requests.post('http://localhost:8765/skills', json={
            'name': name,
            'command': command or '',
            'description': description or ''
        })
        
        if response.status_code == 200:
            click.echo(f"🎯 스킬 추가됨: {name}")
        else:
            click.echo(f"❌ 오류: {response.text}")
    except requests.exceptions.ConnectionError:
        click.echo("❌ BEFS 서버가 실행되지 않았습니다. 'befs start'를 먼저 실행하세요.")

@cli.command()
def status():
    """BEFS 시스템 상태 확인"""
    import requests
    
    try:
        response = requests.get('http://localhost:8765/health')
        if response.status_code == 200:
            data = response.json()
            click.echo(f"✅ BEFS 서버 실행 중 (v{data.get('version', 'unknown')})")
            click.echo(f"🔥 백엔드: {data.get('backend', 'unknown')}")
        else:
            click.echo("❌ 서버 응답 오류")
    except requests.exceptions.ConnectionError:
        click.echo("❌ BEFS 서버가 실행되지 않았습니다.")

@cli.command()
def init():
    """현재 디렉토리에 BEFS 프로젝트 초기화"""
    config_file = Path("befs.yaml")
    
    if config_file.exists():
        click.echo("❌ 이미 BEFS 프로젝트가 초기화되어 있습니다.")
        return
    
    config_content = """# BEFS Automation 설정
project:
  name: "my-befs-project"
  
ai:
  learning_rate: 0.1
  memory_retention: "30d"
  
automation:
  keyboard_shortcuts: true
  auto_sync: true
  
firebase:
  project_id: "your-firebase-project"
"""
    
    config_file.write_text(config_content)
    click.echo("✅ BEFS 프로젝트 초기화 완료!")
    click.echo("📝 befs.yaml 파일을 편집하여 설정을 변경하세요.")

@cli.command()
@click.option('--force', is_flag=True, help='기존 설정 덮어쓰기')
def setup_cascade(force):
    """Cascade IDE 워크스페이스 설정 자동화"""
    import json
    
    # 현재 프로젝트 루트 찾기
    current_dir = Path.cwd()
    project_root = find_project_root(current_dir)
    
    if not project_root:
        click.echo("❌ BEFS 프로젝트 루트를 찾을 수 없습니다.")
        return
    
    # Cascade 설정 디렉토리
    cascade_dir = project_root / ".cascade"
    cascade_dir.mkdir(exist_ok=True)
    
    # 워크스페이스 설정
    workspace_config = {
        "name": f"BEFS-{project_root.name}",
        "root": str(project_root),
        "python": {
            "interpreter": sys.executable,
            "working_directory": str(project_root),
            "default_scripts": {
                "session_start": str(project_root / "automation" / "session_start.py"),
                "session_end": str(project_root / "automation" / "session_end.py"),
                "windsurf_start": str(project_root / "automation" / "windsurf_start.py")
            }
        },
        "shortcuts": {
            "F5": "python3 automation/session_start.py",
            "F6": "python3 automation/session_end.py",
            "F7": "python3 automation/windsurf_start.py"
        }
    }
    
    config_file = cascade_dir / "workspace.json"
    
    if config_file.exists() and not force:
        click.echo("❌ Cascade 설정이 이미 존재합니다. --force 옵션을 사용하세요.")
        return
    
    config_file.write_text(json.dumps(workspace_config, indent=2, ensure_ascii=False))
    
    click.echo("✅ Cascade IDE 워크스페이스 설정 완료!")
    click.echo(f"📁 프로젝트: {project_root.name}")
    click.echo(f"🔧 설정 파일: {config_file}")
    click.echo("\n🎯 이제 매크로에서 다음과 같이 사용하세요:")
    click.echo("   python3 session_start.py  # 자동으로 올바른 프로젝트 실행")

def find_project_root(current_path):
    """프로젝트 루트 디렉토리 찾기"""
    markers = ['befs.yaml', 'pyproject.toml', '.git', 'befs_config.json']
    
    for path in [current_path] + list(current_path.parents):
        for marker in markers:
            if (path / marker).exists():
                return path
    return None

# 프로젝트 허브 관리 명령어들 (개발 모드에서만)
@cli.group()
def hub():
    """🏢 프로젝트 허브 관리"""
    if not config.feature_enabled("project_hub"):
        click.echo("❌ 이 기능은 개발 모드에서만 사용할 수 있습니다.")
        return

@hub.command()
def status():
    """전체 프로젝트 상태 확인"""
    project_hub = ProjectHub()
    summary = project_hub.get_status_summary()
    
    click.echo("🏢 BEFS 프로젝트 허브 상태")
    click.echo("=" * 50)
    click.echo(f"📊 총 프로젝트: {summary['total_projects']}")
    click.echo(f"🟢 활성: {summary['active_projects']}")
    click.echo(f"⚪ 비활성: {summary['inactive_projects']}")
    click.echo()
    
    for project_data in summary['projects']:
        status_emoji = "🟢" if project_data['status'] == "active" else "⚪"
        click.echo(f"{status_emoji} {project_data['name']} ({project_data['type']}) - {project_data['description']}")

@hub.command()
@click.argument('project_name')
def start(project_name):
    """프로젝트 시작"""
    project_hub = ProjectHub()
    if project_hub.start_project(project_name):
        click.echo(f"🚀 {project_name} 시작됨")
    else:
        click.echo(f"❌ {project_name} 시작 실패")

@hub.command()
@click.argument('project_name')
def stop(project_name):
    """프로젝트 중지"""
    project_hub = ProjectHub()
    if project_hub.stop_project(project_name):
        click.echo(f"⏹️ {project_name} 중지됨")
    else:
        click.echo(f"❌ {project_name} 중지 실패")

@hub.command()
@click.argument('project_name')
def open(project_name):
    """프로젝트를 Windsurf에서 열기"""
    project_hub = ProjectHub()
    if project_hub.open_project_in_windsurf(project_name):
        click.echo(f"🌊 {project_name} Windsurf에서 열림")
    else:
        click.echo(f"❌ {project_name} 열기 실패")

@hub.command()
def startall():
    """모든 프로젝트 시작"""
    project_hub = ProjectHub()
    projects = project_hub.list_projects()
    
    for project in projects:
        if project.status != "active":
            click.echo(f"🚀 {project.name} 시작 중...")
            project_hub.start_project(project.name)
    
    click.echo("✅ 모든 프로젝트 시작 완료!")

@hub.command()
def dashboard():
    """통합 대시보드 열기"""
    import webbrowser
    
    # BEFS 대시보드 URL
    urls = [
        "http://localhost:8765",  # BEFS Automation
    ]
    
    click.echo("🌐 통합 대시보드 열기...")
    for i, url in enumerate(urls, 1):
        click.echo(f"   {i}. {url}")
        webbrowser.open(url)

@hub.command()
def self_check():
    """BEFS Automation 자기 진단"""
    project_hub = ProjectHub()
    befs_project = project_hub.get_project("befs-automation")
    
    click.echo("🔍 BEFS Automation 자기 진단")
    click.echo("=" * 40)
    
    # 1. 프로젝트 경로 확인
    if os.path.exists(befs_project.path):
        click.echo(f"✅ 프로젝트 경로: {befs_project.path}")
    else:
        click.echo(f"❌ 프로젝트 경로 없음: {befs_project.path}")
    
    # 2. 서버 상태 확인
    if project_hub.is_port_in_use(befs_project.port):
        click.echo(f"✅ 서버 실행 중: http://localhost:{befs_project.port}")
    else:
        click.echo(f"❌ 서버 중지됨: 포트 {befs_project.port}")
    
    # 3. 핵심 파일 확인
    core_files = [
        "firebase_agent.py",
        "src/befs_automation/cli.py",
        "src/befs_automation/project_hub.py"
    ]
    
    for file in core_files:
        file_path = os.path.join(befs_project.path, file)
        if os.path.exists(file_path):
            click.echo(f"✅ {file}")
        else:
            click.echo(f"❌ {file} 없음")
    
    # 4. 다른 프로젝트와의 연결 상태
    click.echo("\n🔗 연결된 프로젝트:")
    for project in project_hub.list_projects():
        if project.name != "befs-automation":
            status_emoji = "🟢" if project.status == "active" else "⚪"
            click.echo(f"   {status_emoji} {project.name}")

@hub.command()
def restart_self():
    """BEFS Automation 자기 재시작"""
    if not config.feature_enabled("self_management"):
        click.echo("❌ 이 기능은 개발 모드에서만 사용할 수 있습니다.")
        return
        
    project_hub = ProjectHub()
    
    click.echo("🔄 BEFS Automation 재시작 중...")
    
    # 1. 자기 자신 중지
    if project_hub.stop_project("befs-automation"):
        click.echo("⏹️ 기존 서버 중지")
    
    # 2. 잠시 대기
    import time
    time.sleep(2)
    
    # 3. 자기 자신 시작
    if project_hub.start_project("befs-automation"):
        click.echo("🚀 서버 재시작 완료!")
    else:
        click.echo("❌ 재시작 실패")

# 모드 관리 명령어들
@cli.group()
def mode():
    """🔧 개발/상용 모드 관리"""
    pass

@mode.command()
def status():
    """현재 모드 상태 확인"""
    mode_emoji = "🔧" if config.is_development_mode() else "🚀"
    mode_name = "개발 모드" if config.is_development_mode() else "상용 모드"
    
    click.echo(f"{mode_emoji} 현재 모드: {mode_name}")
    click.echo("=" * 40)
    
    features = config.config.get("features", {})
    for feature, enabled in features.items():
        status_emoji = "✅" if enabled else "❌"
        click.echo(f"{status_emoji} {feature}: {'활성화' if enabled else '비활성화'}")

@mode.command()
@click.confirmation_option(prompt='상용 모드로 전환하시겠습니까? (메타 기능들이 비활성화됩니다)')
def production():
    """상용 모드로 전환"""
    config.switch_to_production()
    click.echo("🚀 상용 모드로 전환되었습니다!")
    click.echo("   - 메타 허브 기능 비활성화")
    click.echo("   - 자기 참조 관리 비활성화") 
    click.echo("   - 개발자 도구 비활성화")
    click.echo("   - 순수 AI 학습 공유 시스템으로 동작")

@mode.command()
def development():
    """개발 모드로 전환"""
    config.switch_to_development()
    click.echo("🔧 개발 모드로 전환되었습니다!")
    click.echo("   - 메타 허브 기능 활성화")
    click.echo("   - 자기 참조 관리 활성화")
    click.echo("   - 모든 개발자 도구 활성화")
    click.echo("   - God Mode 활성화")

@mode.command()
def clean():
    """상용 출시용 클린 버전 미리보기"""
    click.echo("🚀 BEFS Automation - 상용 출시 버전 미리보기")
    click.echo("=" * 50)
    click.echo("✅ AI 간 실시간 학습 공유")
    click.echo("✅ 자동화 워크플로우")
    click.echo("✅ 생산성 도구 통합")
    click.echo("✅ 외부 도구 연동")
    click.echo()
    click.echo("❌ 제거될 기능들:")
    click.echo("   - 프로젝트 허브 관리")
    click.echo("   - 자기 참조 시스템")
    click.echo("   - 개발자 전용 메타 명령어")
    click.echo("   - God Mode 기능")

# 다른 프로젝트 통합 명령어들
@cli.group()
def integrate():
    """🔗 다른 프로젝트에 BEFS 시스템 통합"""
    pass

@integrate.command()
@click.argument('project_path')
@click.argument('project_name')
@click.option('--type', default='generic', help='프로젝트 타입 (kgf, windsurf, generic)')
def setup(project_path, project_name, type):
    """다른 프로젝트에 BEFS 시스템 설치"""
    from pathlib import Path
    import shutil
    import json
    
    project_path = Path(project_path)
    
    if not project_path.exists():
        click.echo(f"❌ 프로젝트 경로가 존재하지 않습니다: {project_path}")
        return
    
    click.echo(f"🔧 {project_name}에 BEFS 시스템 통합 중...")
    
    # automation 디렉토리 생성
    automation_dir = project_path / "automation"
    automation_dir.mkdir(exist_ok=True)
    
    # 스마트 런처 복사
    befs_root = Path(__file__).parent.parent.parent
    smart_launcher_source = befs_root / "automation" / "smart_launcher.py"
    
    if smart_launcher_source.exists():
        shutil.copy2(smart_launcher_source, automation_dir / "smart_launcher.py")
        click.echo("✅ 스마트 런처 설치됨")
    
    # 허브에 등록
    project_hub = ProjectHub()
    from .project_hub import Project
    
    new_project = Project(
        name=project_name,
        path=str(project_path),
        type=type,
        status="inactive",
        port=8766 if type == "kgf" else 8767 if type == "windsurf" else 8768,
        description=f"{project_name} 프로젝트 (BEFS 통합)"
    )
    
    project_hub.register_project(new_project)
    click.echo(f"✅ BEFS 허브에 {project_name} 등록됨")

@integrate.command()
def auto_discover():
    """자동으로 다른 프로젝트들 찾아서 통합"""
    from pathlib import Path
    
    # 홈 디렉토리에서 프로젝트 검색
    home = Path.home()
    potential_projects = []
    
    # 일반적인 프로젝트 패턴 검색
    for item in home.iterdir():
        if item.is_dir() and not item.name.startswith('.'):
            # Git 저장소이거나 특정 파일들이 있는 경우
            if any((item / marker).exists() for marker in ['.git', 'package.json', 'pyproject.toml', 'Cargo.toml']):
                potential_projects.append(item)
    
    click.echo("🔍 발견된 프로젝트들:")
    for i, project in enumerate(potential_projects[:10], 1):  # 최대 10개
        click.echo(f"   {i}. {project.name} ({project})")
    
    if potential_projects:
        click.echo("\n특정 프로젝트를 통합하려면:")
        click.echo("befs2 integrate setup <경로> <이름> --type <타입>")

@integrate.command()
def sync():
    """통합된 모든 프로젝트의 BEFS 시스템 동기화"""
    project_hub = ProjectHub()
    projects = project_hub.list_projects()
    
    click.echo("🔄 BEFS 시스템 동기화 중...")
    
    for project in projects:
        if project.name != "befs-automation":
            project_path = Path(project.path)
            automation_dir = project_path / "automation"
            
            if automation_dir.exists():
                # 최신 스마트 런처로 업데이트
                befs_root = Path(__file__).parent.parent.parent
                smart_launcher_source = befs_root / "automation" / "smart_launcher.py"
                
                if smart_launcher_source.exists():
                    shutil.copy2(smart_launcher_source, automation_dir / "smart_launcher.py")
                    click.echo(f"✅ {project.name} 업데이트됨")

if __name__ == '__main__':
    cli()
