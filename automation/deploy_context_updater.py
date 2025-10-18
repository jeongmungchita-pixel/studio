#!/usr/bin/env python3
"""codex_context_update.py를 다른 워크스테이션에 배포"""
import os
import shutil
import subprocess
from pathlib import Path

def deploy_context_updater(target_path):
    """codex_context_update.py를 대상 경로에 배포"""
    
    print(f"📤 Codex Context Updater 배포 중...")
    print("=" * 50)
    
    # 소스 파일 경로
    source_file = Path(__file__).parent / "codex_context_update.py"
    
    # 대상 경로 설정
    target_path = Path(target_path).expanduser()
    
    if not target_path.exists():
        print(f"❌ 대상 경로가 존재하지 않습니다: {target_path}")
        return False
    
    # automation 폴더가 없으면 생성
    automation_dir = target_path / "automation"
    automation_dir.mkdir(exist_ok=True)
    
    # 파일 복사
    target_file = automation_dir / "codex_context_update.py"
    
    try:
        shutil.copy2(source_file, target_file)
        print(f"✅ 파일 복사 완료: {target_file}")
        
        # 실행 권한 부여
        os.chmod(target_file, 0o755)
        print("✅ 실행 권한 설정 완료")
        
        # 대상 프로젝트에 맞게 경로 수정
        update_paths_for_target(target_file, target_path)
        
        return True
        
    except Exception as e:
        print(f"❌ 배포 실패: {e}")
        return False

def update_paths_for_target(script_file, project_path):
    """대상 프로젝트에 맞게 경로 수정"""
    
    print("🔧 경로 설정 업데이트 중...")
    
    try:
        # 파일 내용 읽기
        with open(script_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 경로 치환
        content = content.replace(
            'STUDIO_DIR = os.getcwd()',
            f'STUDIO_DIR = "{project_path}"'
        )
        
        # BEFS URL을 다른 포트로 변경 (충돌 방지)
        content = content.replace(
            'BEFS_URL = "http://127.0.0.1:8765"',
            'BEFS_URL = "http://127.0.0.1:8766"'
        )
        
        # 프로젝트 이름을 동적으로 설정
        project_name = project_path.name if hasattr(project_path, 'name') else os.path.basename(str(project_path))
        content = content.replace(
            '"project_name": "KGF 넥서스 (체조 관리 시스템)"',
            f'"project_name": "{project_name} 프로젝트"'
        )
        
        # 파일 다시 쓰기
        with open(script_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ 경로 설정 업데이트 완료")
        
    except Exception as e:
        print(f"⚠️ 경로 업데이트 실패: {e}")

def create_usage_guide(target_path):
    """사용법 가이드 생성"""
    
    guide_content = f"""# Codex Context Updater 사용법

## 📋 개요
이 스크립트는 Codex에게 현재 프로젝트의 전체 상황을 업데이트해주는 도구입니다.

## 🚀 사용법

### 기본 실행
```bash
python3 automation/codex_context_update.py
```

### 주요 기능
- 프로젝트 구조 분석
- Git 상태 확인
- 기술 스택 정보 수집
- BEFS Agent와 연동하여 컨텍스트 저장

## ⚙️ 설정
- BEFS Agent 포트: 8766
- 프로젝트 경로: {target_path}

## 📝 출력
- BEFS Agent에 스킬로 저장
- docs/CURRENT_CONTEXT.md 파일 생성

## 🔧 문제 해결
BEFS Agent가 실행되지 않은 경우:
```bash
python3 automation/befs_start.py
```

업데이트 시간: {Path(__file__).stat().st_mtime}
"""
    
    guide_file = target_path / "CODEX_CONTEXT_GUIDE.md"
    with open(guide_file, 'w', encoding='utf-8') as f:
        f.write(guide_content)
    
    print(f"📚 사용법 가이드 생성: {guide_file}")

def main():
    """메인 실행 함수"""
    print("📤 Codex Context Updater 배포 도구")
    print("=" * 50)
    
    # 대상 경로 입력
    target_project = input("📁 대상 프로젝트 경로를 입력하세요: ").strip()
    if not target_project:
        print("❌ 프로젝트 경로가 필요합니다")
        return
    
    # 배포 실행
    success = deploy_context_updater(target_project)
    
    if success:
        # 사용법 가이드 생성
        create_usage_guide(Path(target_project))
        
        print(f"\n🎉 배포 완료!")
        print(f"\n📋 다음 단계:")
        print(f"   1. cd {target_project}")
        print(f"   2. python3 automation/befs_start.py  # BEFS Agent 시작")
        print(f"   3. python3 automation/codex_context_update.py  # 컨텍스트 업데이트")
        
        print(f"\n💡 주요 변경사항:")
        print(f"   • BEFS Agent 포트: 8766 (충돌 방지)")
        print(f"   • 프로젝트 경로: 자동 설정됨")
        print(f"   • 사용법 가이드: CODEX_CONTEXT_GUIDE.md")
    else:
        print("❌ 배포 실패")

if __name__ == "__main__":
    main()
