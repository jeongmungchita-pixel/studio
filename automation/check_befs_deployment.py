#!/usr/bin/env python3
"""BEFS 시스템 배포 현황 확인"""
import os
import subprocess
from pathlib import Path
from datetime import datetime

def find_befs_installations():
    """BEFS 시스템이 설치된 모든 위치 찾기"""
    
    print("🔍 BEFS 시스템 배포 현황 확인")
    print("=" * 60)
    
    installations = []
    
    # automation 폴더가 있는 위치들 찾기
    try:
        result = subprocess.run(
            ["find", os.path.expanduser("~"), "-name", "automation", "-type", "d", "-maxdepth", "4"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        automation_dirs = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        for auto_dir in automation_dirs:
            if auto_dir and os.path.exists(auto_dir):
                installation_info = analyze_installation(auto_dir)
                if installation_info:
                    installations.append(installation_info)
    
    except Exception as e:
        print(f"⚠️ 검색 중 오류: {e}")
    
    return installations

def analyze_installation(automation_path):
    """특정 automation 폴더 분석"""
    
    automation_dir = Path(automation_path)
    project_dir = automation_dir.parent
    
    # BEFS 관련 파일들 확인
    befs_files = [
        "befs_start.py",
        "befs_status.py", 
        "befs_tasks.py",
        "befs_skills.py",
        "codex_sync.py",
        "codex_context_update.py"
    ]
    
    found_files = []
    for file in befs_files:
        file_path = automation_dir / file
        if file_path.exists():
            found_files.append(file)
    
    # BEFS 메모리 폴더 확인
    memory_paths = [
        project_dir / "befs-memory",
        project_dir / "windsurf-memory"
    ]
    
    memory_path = None
    for path in memory_paths:
        if path.exists():
            memory_path = str(path)
            break
    
    # 설정 파일 확인
    config_files = []
    for config in ["befs_config.json", "doio_keymap_new.json", "via_macros.json"]:
        config_path = automation_dir / config
        if config_path.exists():
            config_files.append(config)
    
    # BEFS 시스템이 있는지 판단
    if len(found_files) >= 3:  # 최소 3개 이상의 BEFS 파일이 있으면 설치된 것으로 간주
        return {
            "project_path": str(project_dir),
            "automation_path": str(automation_dir),
            "memory_path": memory_path,
            "befs_files": found_files,
            "config_files": config_files,
            "file_count": len(found_files),
            "has_memory": memory_path is not None,
            "last_modified": get_last_modified(automation_dir)
        }
    
    return None

def get_last_modified(directory):
    """디렉토리 내 파일들의 최근 수정 시간"""
    try:
        latest = 0
        for file_path in directory.iterdir():
            if file_path.is_file():
                mtime = file_path.stat().st_mtime
                if mtime > latest:
                    latest = mtime
        
        if latest > 0:
            return datetime.fromtimestamp(latest).strftime('%Y-%m-%d %H:%M')
        else:
            return "알 수 없음"
    except:
        return "알 수 없음"

def check_befs_agent_status(installations):
    """각 설치에서 BEFS Agent 상태 확인"""
    
    print("\n🤖 BEFS Agent 실행 상태 확인:")
    print("-" * 40)
    
    # 일반적인 포트들 확인
    ports_to_check = [8765, 8766, 8767, 8768]
    
    for port in ports_to_check:
        try:
            import requests
            response = requests.get(f"http://127.0.0.1:{port}/health", timeout=1)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 포트 {port}: BEFS Agent 실행 중 (v{data.get('version', 'unknown')})")
            else:
                print(f"⚠️ 포트 {port}: 응답 오류")
        except:
            print(f"❌ 포트 {port}: 연결 실패")

def generate_deployment_report(installations):
    """배포 현황 보고서 생성"""
    
    print(f"\n📊 BEFS 시스템 배포 현황 보고서")
    print("=" * 60)
    
    if not installations:
        print("❌ BEFS 시스템이 설치된 위치를 찾을 수 없습니다.")
        return
    
    print(f"📍 총 {len(installations)}개 위치에 BEFS 시스템 설치됨")
    print()
    
    for i, install in enumerate(installations, 1):
        print(f"🏗️ [{i}] {install['project_path']}")
        print(f"   📁 Automation: {install['automation_path']}")
        
        if install['has_memory']:
            print(f"   🧠 Memory: {install['memory_path']}")
        else:
            print(f"   ⚠️ Memory: 없음")
        
        print(f"   📄 BEFS 파일: {install['file_count']}개")
        print(f"      {', '.join(install['befs_files'][:5])}")
        if len(install['befs_files']) > 5:
            print(f"      ... 외 {len(install['befs_files'])-5}개")
        
        if install['config_files']:
            print(f"   ⚙️ 설정 파일: {', '.join(install['config_files'])}")
        
        print(f"   🕐 최근 수정: {install['last_modified']}")
        
        # codex_context_update.py 특별 확인
        if 'codex_context_update.py' in install['befs_files']:
            print(f"   ✨ Codex Context Updater: 설치됨")
        else:
            print(f"   ⚠️ Codex Context Updater: 없음")
        
        print()
    
    # 요약 통계
    total_files = sum(install['file_count'] for install in installations)
    with_memory = sum(1 for install in installations if install['has_memory'])
    with_codex_updater = sum(1 for install in installations if 'codex_context_update.py' in install['befs_files'])
    
    print("📈 요약 통계:")
    print(f"   • 총 BEFS 파일: {total_files}개")
    print(f"   • 메모리 시스템 있음: {with_memory}/{len(installations)}개")
    print(f"   • Codex Context Updater: {with_codex_updater}/{len(installations)}개")
    
    # 권장사항
    print(f"\n💡 권장사항:")
    if with_codex_updater < len(installations):
        missing_count = len(installations) - with_codex_updater
        print(f"   • {missing_count}개 위치에 Codex Context Updater 추가 필요")
    
    if with_memory < len(installations):
        missing_memory = len(installations) - with_memory
        print(f"   • {missing_memory}개 위치에 메모리 시스템 설치 필요")
    
    return installations

def main():
    """메인 실행 함수"""
    
    # BEFS 설치 위치 찾기
    installations = find_befs_installations()
    
    # BEFS Agent 상태 확인
    check_befs_agent_status(installations)
    
    # 보고서 생성
    generate_deployment_report(installations)
    
    # 결과를 파일로 저장
    report_file = Path.home() / "Desktop" / f"befs_deployment_report_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"BEFS 시스템 배포 현황 보고서\n")
            f.write(f"생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 60 + "\n\n")
            
            for i, install in enumerate(installations, 1):
                f.write(f"[{i}] {install['project_path']}\n")
                f.write(f"    Automation: {install['automation_path']}\n")
                f.write(f"    Memory: {install['memory_path'] or '없음'}\n")
                f.write(f"    BEFS 파일: {len(install['befs_files'])}개\n")
                f.write(f"    최근 수정: {install['last_modified']}\n")
                f.write(f"    Codex Updater: {'있음' if 'codex_context_update.py' in install['befs_files'] else '없음'}\n")
                f.write("\n")
        
        print(f"\n💾 보고서 저장됨: {report_file}")
        
    except Exception as e:
        print(f"⚠️ 보고서 저장 실패: {e}")

if __name__ == "__main__":
    main()
