#!/usr/bin/env python3
"""원격 워크스테이션에 codex_context_update.py 배포"""
import os
import subprocess
import sys
from pathlib import Path

def deploy_to_remote(host, username, target_path):
    """SSH를 통해 원격 서버에 배포"""
    
    print(f"🌐 원격 배포 시작: {username}@{host}:{target_path}")
    print("=" * 60)
    
    # 로컬 파일 경로
    local_file = Path(__file__).parent / "codex_context_update.py"
    
    if not local_file.exists():
        print("❌ codex_context_update.py 파일이 없습니다")
        return False
    
    try:
        # 1. 원격 서버에 automation 디렉토리 생성
        print("📁 원격 디렉토리 생성 중...")
        mkdir_cmd = f'ssh {username}@{host} "mkdir -p {target_path}/automation"'
        result = subprocess.run(mkdir_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 원격 디렉토리 생성 완료")
        else:
            print(f"⚠️ 디렉토리 생성 경고: {result.stderr}")
        
        # 2. 파일 전송
        print("📤 파일 전송 중...")
        scp_cmd = f'scp "{local_file}" {username}@{host}:{target_path}/automation/'
        result = subprocess.run(scp_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 파일 전송 완료")
        else:
            print(f"❌ 파일 전송 실패: {result.stderr}")
            return False
        
        # 3. 원격에서 실행 권한 부여 및 경로 수정
        print("🔧 원격 설정 업데이트 중...")
        setup_cmd = f'''ssh {username}@{host} "
            chmod +x {target_path}/automation/codex_context_update.py
            cd {target_path}
            sed -i 's|STUDIO_DIR = os.getcwd()|STUDIO_DIR = \"{target_path}\"|g' automation/codex_context_update.py
            sed -i 's|8765|8766|g' automation/codex_context_update.py
            echo '✅ 원격 설정 완료'
        "'''
        
        result = subprocess.run(setup_cmd, shell=True, capture_output=True, text=True)
        print(result.stdout)
        
        if result.returncode != 0:
            print(f"⚠️ 설정 업데이트 경고: {result.stderr}")
        
        # 4. 사용법 가이드 생성
        print("📚 사용법 가이드 생성 중...")
        guide_content = f'''# Codex Context Updater - {host}

## 🚀 사용법
```bash
cd {target_path}
python3 automation/codex_context_update.py
```

## ⚙️ 설정
- 호스트: {host}
- 사용자: {username}
- 경로: {target_path}
- BEFS 포트: 8766

배포 완료: $(date)
'''
        
        guide_cmd = f'''ssh {username}@{host} "
            cat > {target_path}/CODEX_CONTEXT_GUIDE.md << 'EOF'
{guide_content}
EOF
            echo '📚 가이드 생성 완료'
        "'''
        
        subprocess.run(guide_cmd, shell=True)
        
        print(f"\n🎉 원격 배포 완료!")
        print(f"   호스트: {username}@{host}")
        print(f"   경로: {target_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ 원격 배포 실패: {e}")
        return False

def deploy_to_local_network():
    """로컬 네트워크의 여러 워크스테이션에 배포"""
    
    print("🏠 로컬 네트워크 배포")
    print("=" * 40)
    
    # 일반적인 워크스테이션 설정들
    workstations = []
    
    print("워크스테이션 정보를 입력하세요 (빈 줄로 종료):")
    while True:
        host = input("호스트 IP 또는 이름: ").strip()
        if not host:
            break
            
        username = input(f"  {host}의 사용자명: ").strip()
        target_path = input(f"  {host}의 프로젝트 경로: ").strip()
        
        workstations.append({
            "host": host,
            "username": username,
            "target_path": target_path
        })
        print()
    
    if not workstations:
        print("❌ 배포할 워크스테이션이 없습니다")
        return
    
    # 각 워크스테이션에 배포
    success_count = 0
    for ws in workstations:
        print(f"\n🖥️ {ws['host']} 배포 중...")
        if deploy_to_remote(ws['host'], ws['username'], ws['target_path']):
            success_count += 1
    
    print(f"\n📊 배포 결과: {success_count}/{len(workstations)} 성공")

def create_deployment_package():
    """배포 패키지 생성 (USB, 이메일 등으로 전송용)"""
    
    print("📦 배포 패키지 생성")
    print("=" * 40)
    
    package_dir = Path.home() / "Desktop" / "codex_context_updater_package"
    package_dir.mkdir(exist_ok=True)
    
    # 파일들 복사
    source_file = Path(__file__).parent / "codex_context_update.py"
    deploy_file = Path(__file__).parent / "deploy_context_updater.py"
    
    import shutil
    shutil.copy2(source_file, package_dir)
    shutil.copy2(deploy_file, package_dir)
    
    # 설치 스크립트 생성
    install_script = package_dir / "install.py"
    install_content = '''#!/usr/bin/env python3
"""Codex Context Updater 설치 스크립트"""
import os
import shutil
from pathlib import Path

def install():
    print("🚀 Codex Context Updater 설치")
    
    project_path = input("프로젝트 경로: ").strip()
    if not project_path:
        print("❌ 경로가 필요합니다")
        return
    
    target = Path(project_path) / "automation"
    target.mkdir(exist_ok=True)
    
    # 파일 복사
    shutil.copy2("codex_context_update.py", target)
    os.chmod(target / "codex_context_update.py", 0o755)
    
    print(f"✅ 설치 완료: {target}")
    print("사용법: python3 automation/codex_context_update.py")

if __name__ == "__main__":
    install()
'''
    
    with open(install_script, 'w') as f:
        f.write(install_content)
    
    # README 생성
    readme = package_dir / "README.md"
    readme_content = '''# Codex Context Updater 배포 패키지

## 📦 포함된 파일
- `codex_context_update.py`: 메인 스크립트
- `deploy_context_updater.py`: 로컬 배포 도구
- `install.py`: 간단 설치 스크립트

## 🚀 설치 방법

### 방법 1: 자동 설치
```bash
python3 install.py
```

### 방법 2: 수동 설치
1. `codex_context_update.py`를 프로젝트의 `automation/` 폴더에 복사
2. 실행 권한 부여: `chmod +x automation/codex_context_update.py`
3. 실행: `python3 automation/codex_context_update.py`

## ⚙️ 요구사항
- Python 3.6+
- requests 라이브러리
- BEFS Agent 실행 중
'''
    
    with open(readme, 'w') as f:
        f.write(readme_content)
    
    print(f"✅ 배포 패키지 생성 완료: {package_dir}")
    print("📋 포함된 파일:")
    for file in package_dir.iterdir():
        print(f"   - {file.name}")

def main():
    """메인 실행 함수"""
    print("🚀 Codex Context Updater 배포 도구")
    print("=" * 50)
    
    print("배포 방법을 선택하세요:")
    print("1. 로컬 배포 (같은 컴퓨터)")
    print("2. 원격 배포 (SSH)")
    print("3. 네트워크 배포 (여러 워크스테이션)")
    print("4. 배포 패키지 생성 (USB/이메일용)")
    
    choice = input("\n선택 (1-4): ").strip()
    
    if choice == "1":
        # 로컬 배포
        from deploy_context_updater import main as local_deploy
        local_deploy()
    
    elif choice == "2":
        # 원격 배포
        host = input("호스트 IP/이름: ").strip()
        username = input("사용자명: ").strip()
        target_path = input("프로젝트 경로: ").strip()
        
        if host and username and target_path:
            deploy_to_remote(host, username, target_path)
        else:
            print("❌ 모든 정보가 필요합니다")
    
    elif choice == "3":
        # 네트워크 배포
        deploy_to_local_network()
    
    elif choice == "4":
        # 배포 패키지 생성
        create_deployment_package()
    
    else:
        print("❌ 잘못된 선택입니다")

if __name__ == "__main__":
    main()
