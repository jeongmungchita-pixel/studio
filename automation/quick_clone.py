#!/usr/bin/env python3
"""빠른 BEFS 시스템 복제 (폴더 자동 생성)"""
import os
import sys

def quick_clone():
    """빠른 복제 실행"""
    
    if len(sys.argv) < 2:
        print("사용법: python3 quick_clone.py <프로젝트경로> [프로젝트명]")
        print("예시: python3 quick_clone.py ~/my-new-app MyApp")
        return
    
    project_path = sys.argv[1]
    project_name = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(project_path)
    
    print(f"🚀 {project_name} 프로젝트에 BEFS 시스템 설치")
    print("=" * 50)
    
    # clone_to_project.py 실행
    import subprocess
    
    # 자동 입력으로 실행
    process = subprocess.Popen(
        [sys.executable, os.path.expanduser("~/automation/clone_to_project.py")],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # 입력 자동 제공
    stdout, stderr = process.communicate(input=f"{project_path}\n{project_name}\n")
    
    print(stdout)
    if stderr:
        print("오류:", stderr)
    
    if process.returncode == 0:
        print(f"\n🎉 {project_name}에 BEFS 시스템 설치 완료!")
        print(f"\n📋 다음 단계:")
        print(f"   cd {project_path}")
        print(f"   python3 start_befs.py")
    else:
        print("❌ 설치 실패")

if __name__ == "__main__":
    quick_clone()
