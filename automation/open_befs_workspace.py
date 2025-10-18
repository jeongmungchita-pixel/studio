#!/usr/bin/env python3
"""BEFS 프로젝트를 새 워크스페이스로 열기"""
import os
import subprocess
import sys
from pathlib import Path

def open_befs_workspace():
    """BEFS 프로젝트를 Windsurf에서 새 워크스페이스로 열기"""
    
    print("🚀 BEFS 프로젝트 워크스페이스 설정")
    print("=" * 50)
    
    # BEFS 프로젝트 경로
    befs_project = Path.home() / "befs-automation"
    
    if not befs_project.exists():
        print("❌ BEFS 프로젝트가 없습니다.")
        print("   먼저 python3 ~/automation/create_befs_project.py 실행하세요")
        return False
    
    print(f"📁 BEFS 프로젝트: {befs_project}")
    
    # 1. 개발 환경 설정
    setup_development_environment(befs_project)
    
    # 2. BEFS 전용 automation 시스템 설치
    setup_befs_automation(befs_project)
    
    # 3. Windsurf에서 열기
    open_in_windsurf(befs_project)
    
    print(f"\n✅ BEFS 워크스페이스 설정 완료!")
    return True

def setup_development_environment(project_path):
    """개발 환경 설정"""
    
    print("🛠️ 개발 환경 설정 중...")
    
    # start_development.py 실행
    dev_script = project_path / "start_development.py"
    if dev_script.exists():
        try:
            result = subprocess.run([sys.executable, str(dev_script)], 
                                  cwd=project_path, 
                                  capture_output=True, 
                                  text=True)
            if result.returncode == 0:
                print("✅ 개발 환경 설정 완료")
            else:
                print(f"⚠️  개발 환경 설정 경고: {result.stderr}")
        except Exception as e:
            print(f"⚠️  개발 환경 설정 오류: {e}")

def setup_befs_automation(project_path):
    """BEFS 프로젝트에 automation 시스템 설치"""
    
    print("🤖 BEFS 전용 automation 시스템 설치 중...")
    
    # setup_here.py를 BEFS 프로젝트에서 실행
    setup_script = Path("~/automation/setup_here.py").expanduser()
    
    if setup_script.exists():
        try:
            # BEFS 프로젝트 디렉토리에서 setup_here.py 실행
            result = subprocess.run([sys.executable, str(setup_script)], 
                                  cwd=project_path,
                                  capture_output=True,
                                  text=True)
            
            if result.returncode == 0:
                print("✅ BEFS 전용 automation 시스템 설치 완료")
                print("   📋 automation/ 폴더 생성됨")
                print("   🤖 befs-memory/ 폴더 생성됨")
                print("   ⚙️ befs_config.json 생성됨")
            else:
                print(f"⚠️  automation 설치 경고: {result.stderr}")
        except Exception as e:
            print(f"⚠️  automation 설치 오류: {e}")

def open_in_windsurf(project_path):
    """Windsurf에서 프로젝트 열기"""
    
    print("🌊 Windsurf에서 BEFS 프로젝트 열기...")
    
    try:
        # Windsurf로 프로젝트 열기
        subprocess.Popen(["open", "-a", "Windsurf", str(project_path)])
        print("✅ Windsurf에서 BEFS 프로젝트 열림")
        
        print(f"\n📋 Windsurf에서 할 일:")
        print(f"   1. 새 워크스페이스로 인식됨")
        print(f"   2. Python 인터프리터: venv/bin/python 선택")
        print(f"   3. 터미널에서: python3 start_befs.py")
        
    except Exception as e:
        print(f"⚠️  Windsurf 실행 오류: {e}")
        print(f"   수동으로 Windsurf를 열고 {project_path} 폴더를 열어주세요")

def create_vscode_settings(project_path):
    """VS Code/Windsurf 설정 파일 생성"""
    
    vscode_dir = project_path / ".vscode"
    vscode_dir.mkdir(exist_ok=True)
    
    # settings.json
    settings = {
        "python.defaultInterpreterPath": "./venv/bin/python",
        "python.terminal.activateEnvironment": True,
        "python.linting.enabled": True,
        "python.linting.flake8Enabled": True,
        "python.formatting.provider": "black",
        "files.exclude": {
            "**/__pycache__": True,
            "**/*.pyc": True,
            "**/venv": True,
            "**/current_system": True
        },
        "python.testing.pytestEnabled": True,
        "python.testing.pytestArgs": ["tests"],
        "editor.formatOnSave": True
    }
    
    import json
    with open(vscode_dir / "settings.json", "w") as f:
        json.dump(settings, f, indent=2)
    
    # launch.json (디버깅 설정)
    launch = {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "BEFS Agent Debug",
                "type": "python",
                "request": "launch",
                "program": "${workspaceFolder}/current_system/windsurf-memory/agent/main.py",
                "console": "integratedTerminal",
                "cwd": "${workspaceFolder}"
            },
            {
                "name": "Run Tests",
                "type": "python",
                "request": "launch",
                "module": "pytest",
                "args": ["tests/"],
                "console": "integratedTerminal"
            }
        ]
    }
    
    with open(vscode_dir / "launch.json", "w") as f:
        json.dump(launch, f, indent=2)
    
    # tasks.json
    tasks = {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Start BEFS Agent",
                "type": "shell",
                "command": "python3",
                "args": ["start_befs.py"],
                "group": "build",
                "presentation": {
                    "echo": True,
                    "reveal": "always",
                    "focus": False,
                    "panel": "new"
                }
            },
            {
                "label": "Run Tests",
                "type": "shell",
                "command": "python3",
                "args": ["-m", "pytest", "tests/"],
                "group": "test"
            },
            {
                "label": "Format Code",
                "type": "shell",
                "command": "black",
                "args": ["src/"],
                "group": "build"
            }
        ]
    }
    
    with open(vscode_dir / "tasks.json", "w") as f:
        json.dump(tasks, f, indent=2)
    
    print("⚙️ VS Code/Windsurf 설정 파일 생성 완료")

def create_workspace_readme(project_path):
    """워크스페이스용 README 생성"""
    
    workspace_readme = f'''# 🤖 BEFS Automation - 개발 워크스페이스

## 🚀 빠른 시작

```bash
# BEFS Agent 시작
python3 start_befs.py

# 개발 서버 시작 (포트 자동 할당)
python3 automation/befs_start.py

# 테스트 실행
python3 -m pytest tests/

# 코드 포맷팅
black src/
```

## 📁 프로젝트 구조

```
befs-automation/
├── src/befs_automation/     # 메인 패키지
├── current_system/          # 현재 작동하는 시스템
├── automation/              # 이 프로젝트 전용 automation
├── befs-memory/            # 이 프로젝트 전용 Agent
├── tests/                  # 테스트 코드
├── docs/                   # 문서
└── examples/               # 사용 예시
```

## 🎯 개발 목표

- [ ] 현재 시스템을 패키지로 리팩토링
- [ ] 테스트 코드 작성 (90% 커버리지)
- [ ] 문서화 완성
- [ ] PyPI 배포 준비
- [ ] GitHub 오픈소스 릴리즈

## 🔧 개발 도구

- **디버깅**: F5 키로 BEFS Agent 디버깅
- **테스트**: Ctrl+Shift+P → "Run Tests"
- **포맷팅**: 저장 시 자동 포맷팅
- **린팅**: 실시간 코드 검사

## 🤖 BEFS Agent 제어

이 워크스페이스에서도 키보드 매크로 사용 가능:
- **Key 2**: BEFS Agent 시작
- **Key 12**: Codex 동기화
- **Key 13**: 파일 감시 시작

## 📊 진행 상황

- 🏗️ **아키텍처 설계**: 완료
- 🔧 **개발 환경**: 완료  
- 📦 **패키지 구조**: 진행 중
- 🧪 **테스트 작성**: 예정
- 📚 **문서화**: 예정
- 🚀 **배포 준비**: 예정

---

**목표: 세계 최초 AI 간 학습 공유 시스템!** 🚀
'''
    
    with open(project_path / "WORKSPACE_README.md", "w") as f:
        f.write(workspace_readme)
    
    print("📚 워크스페이스 README 생성 완료")

def main():
    """메인 실행"""
    
    # BEFS 워크스페이스 설정
    success = open_befs_workspace()
    
    if success:
        befs_project = Path.home() / "befs-automation"
        
        # 추가 설정
        create_vscode_settings(befs_project)
        create_workspace_readme(befs_project)
        
        print(f"\n🎉 BEFS 워크스페이스 완전 설정 완료!")
        print(f"\n📋 다음 단계:")
        print(f"   1. Windsurf에서 BEFS 프로젝트가 열림")
        print(f"   2. Python 인터프리터: venv/bin/python 선택")
        print(f"   3. 터미널에서: python3 start_befs.py")
        print(f"   4. F5로 디버깅 시작 가능")
        
        print(f"\n💡 개발 팁:")
        print(f"   • 메인 앱과 완전 분리된 환경")
        print(f"   • 독립적인 BEFS Agent (다른 포트)")
        print(f"   • 키보드 매크로 동일하게 작동")
        print(f"   • Git으로 버전 관리 가능")

if __name__ == "__main__":
    main()
