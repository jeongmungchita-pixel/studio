#!/usr/bin/env python3
"""BEFS 프로젝트 별도 생성"""
import os
import shutil
import json
from pathlib import Path
from datetime import datetime

def create_befs_project():
    """BEFS 전용 프로젝트 생성"""
    
    print("🚀 BEFS Automation 프로젝트 생성")
    print("=" * 50)
    
    # 프로젝트 경로 설정
    project_name = "befs-automation"
    project_path = Path.home() / project_name
    
    print(f"📁 프로젝트 위치: {project_path}")
    
    # 프로젝트 디렉토리 생성
    if project_path.exists():
        backup_path = Path.home() / f"{project_name}_backup_{int(datetime.now().timestamp())}"
        print(f"⚠️  기존 프로젝트를 {backup_path.name}로 백업")
        shutil.move(str(project_path), str(backup_path))
    
    project_path.mkdir(parents=True, exist_ok=True)
    
    # 프로젝트 구조 생성
    create_project_structure(project_path)
    
    # 현재 시스템 복사
    copy_current_system(project_path)
    
    # 프로젝트 설정 파일 생성
    create_project_files(project_path)
    
    # Git 저장소 초기화
    setup_git_repo(project_path)
    
    print(f"\n✅ BEFS 프로젝트 생성 완료!")
    print(f"📁 위치: {project_path}")
    print(f"\n📋 다음 단계:")
    print(f"   cd {project_path}")
    print(f"   python3 start_development.py")
    
    return project_path

def create_project_structure(project_path):
    """프로젝트 구조 생성"""
    
    structure = {
        "src": {
            "befs_automation": {
                "core": ["agent.py", "memory.py", "sync.py", "__init__.py"],
                "automation": ["keyboard.py", "watcher.py", "backup.py", "__init__.py"],
                "integrations": ["codex.py", "gpt.py", "windsurf.py", "__init__.py"],
                "utils": ["helpers.py", "validators.py", "__init__.py"]
            }
        },
        "tests": ["test_core.py", "test_automation.py", "test_integrations.py"],
        "docs": ["README.md", "INSTALLATION.md", "API.md", "CONTRIBUTING.md"],
        "examples": ["basic_usage.py", "advanced_config.py"],
        "scripts": ["build.py", "deploy.py", "test.py"],
        "templates": {
            "keymap": ["via_template.json", "doio_template.json"],
            "workflows": ["session_start.py", "session_end.py"]
        }
    }
    
    def create_structure(base_path, structure):
        for name, content in structure.items():
            if isinstance(content, dict):
                # 디렉토리 생성
                dir_path = base_path / name
                dir_path.mkdir(exist_ok=True)
                create_structure(dir_path, content)
            else:
                # 파일 생성
                dir_path = base_path / name
                dir_path.mkdir(exist_ok=True)
                for file in content:
                    (dir_path / file).touch()
    
    create_structure(project_path, structure)
    print("📂 프로젝트 구조 생성 완료")

def copy_current_system(project_path):
    """현재 시스템을 src로 복사"""
    
    # automation 폴더 복사
    source_automation = Path("~/automation").expanduser()
    target_automation = project_path / "current_system" / "automation"
    
    if source_automation.exists():
        target_automation.parent.mkdir(exist_ok=True)
        shutil.copytree(str(source_automation), str(target_automation))
        print("📋 현재 automation 시스템 복사 완료")
    
    # windsurf-memory 복사
    source_memory = Path("~/windsurf-memory").expanduser()
    target_memory = project_path / "current_system" / "windsurf-memory"
    
    if source_memory.exists():
        shutil.copytree(str(source_memory), str(target_memory))
        print("🤖 현재 BEFS Agent 복사 완료")

def create_project_files(project_path):
    """프로젝트 파일들 생성"""
    
    # setup.py
    setup_content = '''"""
BEFS Automation - AI 간 학습 공유 자동화 시스템
"""
from setuptools import setup, find_packages

setup(
    name="befs-automation",
    version="0.1.0",
    author="BEFS Team",
    description="AI 간 실시간 학습 공유 및 자동화 시스템",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0", 
        "openai>=1.0.0",
        "requests>=2.31.0",
        "watchdog>=3.0.0",
        "pydantic>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "befs=befs_automation.cli:main",
        ],
    },
)
'''
    
    # pyproject.toml
    pyproject_content = '''[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "befs-automation"
version = "0.1.0"
description = "AI 간 실시간 학습 공유 및 자동화 시스템"
authors = [{name = "BEFS Team"}]
license = {text = "MIT"}
requires-python = ">=3.8"

[tool.black]
line-length = 88
target-version = ['py38']

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
'''
    
    # README.md
    readme_content = '''# 🤖 BEFS Automation

**AI 간 실시간 학습 공유 및 자동화 시스템**

## 🚀 개발 시작하기

```bash
# 개발 환경 설정
python3 start_development.py

# 테스트 실행
python3 -m pytest tests/

# 패키지 빌드
python3 scripts/build.py
```

## 📋 개발 로드맵

- [ ] 핵심 모듈 리팩토링
- [ ] 테스트 코드 작성
- [ ] 문서화 완성
- [ ] 패키지 배포 준비
- [ ] 오픈소스 릴리즈

## 🎯 목표

세계 최초 AI 간 학습 공유 시스템으로 개발자 생산성 혁신!
'''
    
    # 파일 생성
    with open(project_path / "setup.py", "w") as f:
        f.write(setup_content)
    
    with open(project_path / "pyproject.toml", "w") as f:
        f.write(pyproject_content)
    
    with open(project_path / "README.md", "w") as f:
        f.write(readme_content)
    
    # .gitignore
    gitignore_content = '''# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# BEFS specific
current_system/windsurf-memory/memory.sqlite
current_system/windsurf-memory/backups/
*.log
*.pid

# OS
.DS_Store
Thumbs.db
'''
    
    with open(project_path / ".gitignore", "w") as f:
        f.write(gitignore_content)
    
    print("📄 프로젝트 파일 생성 완료")

def setup_git_repo(project_path):
    """Git 저장소 초기화"""
    
    import subprocess
    
    try:
        # Git 초기화
        subprocess.run(["git", "init"], cwd=project_path, check=True)
        subprocess.run(["git", "add", "."], cwd=project_path, check=True)
        subprocess.run(["git", "commit", "-m", "Initial commit: BEFS Automation project"], 
                      cwd=project_path, check=True)
        
        print("📦 Git 저장소 초기화 완료")
        
        # GitHub 저장소 생성 안내
        print(f"\n🌐 GitHub 저장소 생성 권장:")
        print(f"   1. GitHub에서 'befs-automation' 저장소 생성")
        print(f"   2. git remote add origin https://github.com/YOUR_USERNAME/befs-automation.git")
        print(f"   3. git push -u origin main")
        
    except subprocess.CalledProcessError:
        print("⚠️  Git 초기화 실패 (git이 설치되지 않았을 수 있음)")

def create_development_script(project_path):
    """개발 시작 스크립트 생성"""
    
    dev_script = '''#!/usr/bin/env python3
"""BEFS 개발 환경 시작"""
import os
import subprocess
import sys

def main():
    print("🚀 BEFS Automation 개발 시작")
    print("=" * 50)
    
    # 가상환경 생성
    if not os.path.exists("venv"):
        print("📦 가상환경 생성 중...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # 의존성 설치
    print("📋 의존성 설치 중...")
    pip_cmd = "venv/bin/pip" if os.name != "nt" else "venv\\\\Scripts\\\\pip"
    subprocess.run([pip_cmd, "install", "-e", "."])
    subprocess.run([pip_cmd, "install", "pytest", "black", "flake8"])
    
    print("\\n✅ 개발 환경 준비 완료!")
    print("\\n📋 개발 명령어:")
    print("   source venv/bin/activate  # 가상환경 활성화")
    print("   python3 -m pytest        # 테스트 실행")
    print("   black src/                # 코드 포맷팅")
    print("   python3 scripts/build.py  # 패키지 빌드")

if __name__ == "__main__":
    main()
'''
    
    script_path = project_path / "start_development.py"
    with open(script_path, "w") as f:
        f.write(dev_script)
    
    os.chmod(script_path, 0o755)
    print("🛠️ 개발 시작 스크립트 생성 완료")

def main():
    """메인 실행"""
    project_path = create_befs_project()
    create_development_script(project_path)
    
    print(f"\\n🎉 BEFS 프로젝트 생성 완료!")
    print(f"\\n💡 병행 개발 전략:")
    print(f"   📱 메인 앱: 기존 워크스페이스에서 계속")
    print(f"   🤖 BEFS: {project_path}에서 별도 개발")
    print(f"   🔄 시너지: 메인 앱 개발하며 BEFS 테스트")

if __name__ == "__main__":
    main()
