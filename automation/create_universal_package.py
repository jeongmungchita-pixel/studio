#!/usr/bin/env python3
"""BEFS Automation 시스템 범용 패키지 생성"""
import os
import json
import shutil
from pathlib import Path

def create_package_structure():
    """범용 패키지 구조 생성"""
    
    package_dir = os.path.expanduser("~/befs-automation-package")
    
    # 패키지 디렉토리 구조
    structure = {
        "befs_automation": {
            "core": ["agent.py", "memory.py", "sync.py"],
            "automation": ["keyboard.py", "watcher.py", "backup.py"],
            "integrations": ["codex.py", "gpt.py", "windsurf.py"],
            "config": ["settings.py", "templates.py"],
            "utils": ["helpers.py", "validators.py"]
        },
        "templates": {
            "keymap": ["via_template.json", "doio_template.json"],
            "workflows": ["session_start.py", "session_end.py"],
            "skills": ["base_skills.json"]
        },
        "docs": ["README.md", "INSTALLATION.md", "CONFIGURATION.md"],
        "examples": ["basic_setup.py", "advanced_config.py"],
        "tests": ["test_core.py", "test_automation.py"]
    }
    
    print(f"📦 패키지 구조 생성: {package_dir}")
    
    # 디렉토리 생성
    for main_dir, subdirs in structure.items():
        if isinstance(subdirs, dict):
            for subdir, files in subdirs.items():
                dir_path = Path(package_dir) / main_dir / subdir
                dir_path.mkdir(parents=True, exist_ok=True)
                
                # __init__.py 생성
                (dir_path / "__init__.py").touch()
                
                # 파일 템플릿 생성
                for file in files:
                    (dir_path / file).touch()
        else:
            dir_path = Path(package_dir) / main_dir
            dir_path.mkdir(parents=True, exist_ok=True)
            
            for file in subdirs:
                (dir_path / file).touch()
    
    return package_dir

def create_setup_py(package_dir):
    """setup.py 생성"""
    
    setup_content = '''"""
BEFS Automation - AI 간 학습 공유 자동화 시스템
"""
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="befs-automation",
    version="1.0.0",
    author="BEFS Team",
    author_email="contact@befs.ai",
    description="AI 간 실시간 학습 공유 및 자동화 시스템",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/befs-ai/automation",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "openai>=1.0.0",
        "requests>=2.31.0",
        "watchdog>=3.0.0",
        "pydantic>=2.0.0",
        "sqlite3",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
        "keyboard": [
            "pynput>=1.7.0",
            "keyboard>=0.13.0",
        ],
        "gui": [
            "streamlit>=1.28.0",
            "gradio>=4.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "befs-init=befs_automation.cli:init_project",
            "befs-start=befs_automation.cli:start_agent",
            "befs-sync=befs_automation.cli:sync_changes",
            "befs-backup=befs_automation.cli:create_backup",
        ],
    },
    include_package_data=True,
    package_data={
        "befs_automation": [
            "templates/*.json",
            "templates/*.py",
            "config/*.yaml",
        ],
    },
)
'''
    
    with open(os.path.join(package_dir, "setup.py"), "w") as f:
        f.write(setup_content)

def create_main_readme(package_dir):
    """메인 README.md 생성"""
    
    readme_content = '''# 🤖 BEFS Automation

**AI 간 실시간 학습 공유 및 자동화 시스템**

Codex와 ChatGPT 간의 완벽한 학습 동기화를 통해 일관된 코딩 스타일과 지속적인 컨텍스트를 제공합니다.

## ✨ 주요 기능

### 🧠 AI 간 학습 공유
- Codex 변경사항을 ChatGPT가 실시간 학습
- 코딩 스타일 자동 동기화
- 세션 간 완벽한 연속성

### ⌨️ 키보드 자동화
- Via/DOIO 키보드 매크로 지원
- 원터치 워크플로우 실행
- 15개 핵심 기능 키 매핑

### 💾 지능형 백업
- 자동 메모리 백업/복원
- 세션별 상태 관리
- 실시간 변경사항 추적

### 🔄 실시간 동기화
- 파일 변경 자동 감지
- GPT-4 패턴 분석
- Skills/Tasks 자동 생성

## 🚀 빠른 시작

### 설치
```bash
pip install befs-automation
```

### 초기 설정
```bash
# 프로젝트 초기화
befs-init my-project

# Agent 시작
befs-start

# 변경사항 동기화
befs-sync
```

### 기본 사용법
```python
from befs_automation import BefsAgent, CodexSync

# Agent 초기화
agent = BefsAgent(project_path="./my-project")

# Codex 동기화 설정
sync = CodexSync(agent=agent)
sync.start_watching()

# 세션 시작
agent.start_session()
```

## 📋 지원 환경

### 🎹 키보드
- Via 호환 키보드
- DOIO 키보드 시리즈
- QMK 펌웨어 키보드

### 💻 IDE
- Windsurf
- VS Code
- JetBrains IDEs
- Vim/Neovim

### 🤖 AI 모델
- OpenAI Codex
- ChatGPT (GPT-4/4o)
- Claude (예정)
- Gemini (예정)

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Codex/IDE     │    │  BEFS Agent     │    │   ChatGPT       │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ File Change │ │───▶│ │   Watcher   │ │    │ │   Skills    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │        │        │    │        ▲        │
│ ┌─────────────┐ │    │        ▼        │    │        │        │
│ │   Coding    │ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Style     │ │◀───│ │ GPT Analyze │ │───▶│ │   Memory    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📚 문서

- [설치 가이드](docs/INSTALLATION.md)
- [설정 가이드](docs/CONFIGURATION.md)
- [API 레퍼런스](docs/API.md)
- [키보드 설정](docs/KEYBOARD.md)
- [트러블슈팅](docs/TROUBLESHOOTING.md)

## 🎯 사용 사례

### 개인 개발자
```python
# 개인 프로젝트 설정
befs = BefsAgent(
    project_path="./my-app",
    ai_models=["codex", "gpt-4"],
    keyboard_type="via"
)
```

### 팀 개발
```python
# 팀 공유 설정
befs = BefsAgent(
    project_path="./team-project",
    shared_memory=True,
    team_sync=True
)
```

### 기업 환경
```python
# 엔터프라이즈 설정
befs = BefsAgent(
    project_path="./enterprise-app",
    security_mode=True,
    audit_logging=True,
    custom_models=["internal-llm"]
)
```

## 🔧 고급 설정

### 커스텀 워크플로우
```python
from befs_automation.workflows import CustomWorkflow

workflow = CustomWorkflow([
    "start_session",
    "load_context", 
    "sync_changes",
    "backup_state"
])

befs.add_workflow("morning_routine", workflow)
```

### 플러그인 시스템
```python
from befs_automation.plugins import GitPlugin, SlackPlugin

befs.add_plugin(GitPlugin(auto_commit=True))
befs.add_plugin(SlackPlugin(webhook_url="..."))
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- OpenAI - GPT 모델 제공
- Via/QMK - 키보드 펌웨어
- FastAPI - 웹 프레임워크
- 모든 기여자들

---

**BEFS Automation으로 AI 개발의 새로운 차원을 경험하세요!** 🚀
'''
    
    with open(os.path.join(package_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_content)

def create_cli_module(package_dir):
    """CLI 모듈 생성"""
    
    cli_content = '''"""BEFS Automation CLI"""
import click
import os
from pathlib import Path

@click.group()
def cli():
    """BEFS Automation CLI"""
    pass

@cli.command()
@click.argument('project_name')
@click.option('--template', default='basic', help='Project template')
def init(project_name, template):
    """Initialize new BEFS project"""
    click.echo(f"🚀 Initializing BEFS project: {project_name}")
    
    # 프로젝트 디렉토리 생성
    project_dir = Path(project_name)
    project_dir.mkdir(exist_ok=True)
    
    # 기본 구조 생성
    (project_dir / "befs_config.yaml").touch()
    (project_dir / "automation").mkdir(exist_ok=True)
    (project_dir / "memory").mkdir(exist_ok=True)
    
    click.echo(f"✅ Project {project_name} created successfully!")

@cli.command()
@click.option('--port', default=8765, help='Agent port')
def start(port):
    """Start BEFS Agent"""
    click.echo(f"🤖 Starting BEFS Agent on port {port}")
    # Agent 시작 로직

@cli.command()
def sync():
    """Sync Codex changes"""
    click.echo("🔄 Syncing Codex changes...")
    # 동기화 로직

@cli.command()
def backup():
    """Create memory backup"""
    click.echo("💾 Creating backup...")
    # 백업 로직

if __name__ == '__main__':
    cli()
'''
    
    cli_dir = Path(package_dir) / "befs_automation"
    with open(cli_dir / "cli.py", "w") as f:
        f.write(cli_content)

def create_configuration_templates(package_dir):
    """설정 템플릿 생성"""
    
    # 기본 설정 템플릿
    config_template = {
        "project": {
            "name": "{{PROJECT_NAME}}",
            "path": "{{PROJECT_PATH}}",
            "language": "typescript"
        },
        "ai": {
            "openai_api_key": "{{OPENAI_API_KEY}}",
            "models": ["gpt-4o-mini", "codex"],
            "temperature": 0.3
        },
        "automation": {
            "keyboard_type": "via",
            "auto_sync": True,
            "backup_interval": 3600
        },
        "memory": {
            "db_path": "./memory/memory.sqlite",
            "backup_path": "./memory/backups/",
            "max_backups": 50
        }
    }
    
    templates_dir = Path(package_dir) / "templates"
    with open(templates_dir / "config_template.json", "w") as f:
        json.dump(config_template, f, indent=2)

def main():
    """메인 실행 함수"""
    print("📦 BEFS Automation 범용 패키지 생성")
    print("=" * 50)
    
    # 패키지 구조 생성
    package_dir = create_package_structure()
    
    # 핵심 파일들 생성
    print("📄 setup.py 생성 중...")
    create_setup_py(package_dir)
    
    print("📚 README.md 생성 중...")
    create_main_readme(package_dir)
    
    print("⌨️ CLI 모듈 생성 중...")
    create_cli_module(package_dir)
    
    print("⚙️ 설정 템플릿 생성 중...")
    create_configuration_templates(package_dir)
    
    print(f"\n🎉 패키지 생성 완료!")
    print(f"📁 위치: {package_dir}")
    print(f"\n📋 다음 단계:")
    print(f"   1. cd {package_dir}")
    print(f"   2. pip install -e .")
    print(f"   3. befs-init my-project")
    print(f"   4. PyPI 업로드: python setup.py sdist bdist_wheel")

if __name__ == "__main__":
    main()
