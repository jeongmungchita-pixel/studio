#!/usr/bin/env python3
"""모든 BEFS 설치 위치에 codex_context_update.py 일괄 배포"""
import os
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

def get_befs_locations():
    """BEFS가 설치된 모든 위치 찾기"""
    locations = []
    
    try:
        result = subprocess.run(
            ["find", os.path.expanduser("~"), "-name", "befs_start.py", "-type", "f"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        befs_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        for befs_file in befs_files:
            if befs_file and os.path.exists(befs_file):
                automation_dir = Path(befs_file).parent
                project_dir = automation_dir.parent
                
                locations.append({
                    "project_path": str(project_dir),
                    "automation_path": str(automation_dir),
                    "has_codex_updater": (automation_dir / "codex_context_update.py").exists()
                })
    
    except Exception as e:
        print(f"⚠️ 위치 검색 오류: {e}")
    
    return locations

def deploy_to_location(source_file, target_automation_dir, project_path):
    """특정 위치에 codex_context_update.py 배포"""
    
    target_file = Path(target_automation_dir) / "codex_context_update.py"
    
    try:
        # 파일 복사
        shutil.copy2(source_file, target_file)
        
        # 실행 권한 부여
        os.chmod(target_file, 0o755)
        
        # 경로 수정
        with open(target_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 프로젝트별 경로 설정
        content = content.replace(
            'STUDIO_DIR = os.getcwd()',
            f'STUDIO_DIR = "{project_path}"'
        )
        
        # 포트 충돌 방지 (federation/studio가 아닌 경우)
        if "federation/studio" not in project_path:
            content = content.replace(
                'BEFS_URL = "http://127.0.0.1:8765"',
                'BEFS_URL = "http://127.0.0.1:8766"'
            )
        
        # 프로젝트 이름 동적 설정
        project_name = Path(project_path).name
        content = content.replace(
            '"project_name": "KGF 넥서스 (체조 관리 시스템)"',
            f'"project_name": "{project_name} 프로젝트"'
        )
        
        # 수정된 내용 저장
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True, None
        
    except Exception as e:
        return False, str(e)

def bulk_deploy():
    """일괄 배포 실행"""
    
    print("🚀 Codex Context Updater 일괄 배포")
    print("=" * 60)
    
    # 소스 파일 확인
    source_file = Path(__file__).parent / "codex_context_update.py"
    if not source_file.exists():
        print("❌ 소스 파일이 없습니다: codex_context_update.py")
        return
    
    print(f"📄 소스 파일: {source_file}")
    
    # BEFS 설치 위치들 찾기
    locations = get_befs_locations()
    
    if not locations:
        print("❌ BEFS 설치 위치를 찾을 수 없습니다")
        return
    
    print(f"📍 발견된 BEFS 설치 위치: {len(locations)}개")
    print()
    
    # 각 위치에 배포
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for i, location in enumerate(locations, 1):
        project_name = Path(location['project_path']).name
        print(f"[{i}/{len(locations)}] {project_name}")
        print(f"   📁 {location['project_path']}")
        
        if location['has_codex_updater']:
            print("   ⚠️ 이미 설치됨 - 업데이트 중...")
        else:
            print("   📤 새로 설치 중...")
        
        success, error = deploy_to_location(
            source_file, 
            location['automation_path'], 
            location['project_path']
        )
        
        if success:
            print("   ✅ 배포 완료")
            success_count += 1
        else:
            print(f"   ❌ 배포 실패: {error}")
            error_count += 1
        
        print()
    
    # 결과 요약
    print("=" * 60)
    print("📊 배포 결과:")
    print(f"   ✅ 성공: {success_count}개")
    print(f"   ❌ 실패: {error_count}개")
    print(f"   📍 총 위치: {len(locations)}개")
    
    if success_count > 0:
        print(f"\n🎉 {success_count}개 위치에 Codex Context Updater 배포 완료!")
        print("\n📋 사용법:")
        print("   각 프로젝트에서:")
        print("   python3 automation/codex_context_update.py")
        
        print(f"\n💡 주요 설정:")
        print("   • federation/studio: 포트 8765 (메인)")
        print("   • 기타 프로젝트: 포트 8766 (충돌 방지)")
        print("   • 프로젝트별 경로 자동 설정")
    
    # 검증
    print(f"\n🔍 배포 검증 중...")
    verify_deployment(locations)

def verify_deployment(locations):
    """배포 검증"""
    
    verified_count = 0
    
    for location in locations:
        codex_file = Path(location['automation_path']) / "codex_context_update.py"
        
        if codex_file.exists():
            try:
                # 파일 내용 간단 검증
                with open(codex_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 필수 함수들이 있는지 확인
                required_functions = [
                    "get_project_overview",
                    "get_architecture_summary", 
                    "create_context_summary",
                    "save_to_befs"
                ]
                
                all_functions_present = all(func in content for func in required_functions)
                
                if all_functions_present:
                    verified_count += 1
                    project_name = Path(location['project_path']).name
                    print(f"   ✅ {project_name}: 검증 완료")
                else:
                    print(f"   ⚠️ {project_name}: 파일 불완전")
                    
            except Exception as e:
                print(f"   ❌ {project_name}: 검증 실패 - {e}")
        else:
            project_name = Path(location['project_path']).name
            print(f"   ❌ {project_name}: 파일 없음")
    
    print(f"\n📈 검증 결과: {verified_count}/{len(locations)}개 위치에서 정상 작동 가능")

def main():
    """메인 실행"""
    
    print("⚠️ 모든 BEFS 설치 위치에 Codex Context Updater를 배포합니다.")
    confirm = input("계속하시겠습니까? (Y/n): ").strip().lower()
    
    if confirm == 'n':
        print("❌ 배포 취소됨")
        return
    
    bulk_deploy()
    
    print(f"\n💾 배포 로그는 데스크톱에 저장됩니다.")

if __name__ == "__main__":
    main()
