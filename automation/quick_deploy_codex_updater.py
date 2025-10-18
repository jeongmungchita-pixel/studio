#!/usr/bin/env python3
"""알려진 BEFS 위치에 codex_context_update.py 빠른 배포"""
import os
import shutil
from pathlib import Path

def quick_deploy():
    """빠른 배포 실행"""
    
    print("⚡ Codex Context Updater 빠른 배포")
    print("=" * 50)
    
    # 소스 파일
    source_file = Path(__file__).parent / "codex_context_update.py"
    
    # 알려진 BEFS 위치들
    known_locations = [
        {
            "name": "CascadeProjects/windsurf-project-2",
            "path": "/Users/daewookjeong/CascadeProjects/windsurf-project-2",
            "port": "8766"
        },
        {
            "name": "Home Automation",
            "path": "/Users/daewookjeong",
            "port": "8767"
        },
        {
            "name": "BEFS Automation Current",
            "path": "/Users/daewookjeong/befs-automation/current_system",
            "port": "8768"
        },
        {
            "name": "BEFS Automation Main",
            "path": "/Users/daewookjeong/befs-automation",
            "port": "8769"
        }
    ]
    
    success_count = 0
    
    for i, location in enumerate(known_locations, 1):
        print(f"\n[{i}/4] {location['name']}")
        print(f"   📁 {location['path']}")
        
        automation_dir = Path(location['path']) / "automation"
        target_file = automation_dir / "codex_context_update.py"
        
        if not automation_dir.exists():
            print("   ❌ automation 폴더 없음")
            continue
        
        try:
            # 파일 복사
            shutil.copy2(source_file, target_file)
            os.chmod(target_file, 0o755)
            
            # 내용 수정
            with open(target_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 경로 및 포트 설정
            content = content.replace(
                'STUDIO_DIR = os.getcwd()',
                f'STUDIO_DIR = "{location["path"]}"'
            )
            
            content = content.replace(
                'BEFS_URL = "http://127.0.0.1:8765"',
                f'BEFS_URL = "http://127.0.0.1:{location["port"]}"'
            )
            
            # 프로젝트 이름 설정
            project_name = Path(location['path']).name
            content = content.replace(
                '"project_name": "KGF 넥서스 (체조 관리 시스템)"',
                f'"project_name": "{project_name} 프로젝트"'
            )
            
            # 저장
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ 배포 완료 (포트: {location['port']})")
            success_count += 1
            
        except Exception as e:
            print(f"   ❌ 배포 실패: {e}")
    
    print(f"\n🎉 배포 완료: {success_count}/4개 위치")
    
    if success_count > 0:
        print(f"\n📋 사용법:")
        print("   각 프로젝트에서:")
        print("   python3 automation/codex_context_update.py")
        
        print(f"\n🔧 포트 설정:")
        print("   • federation/studio: 8765 (메인)")
        for loc in known_locations:
            print(f"   • {loc['name']}: {loc['port']}")

if __name__ == "__main__":
    quick_deploy()
