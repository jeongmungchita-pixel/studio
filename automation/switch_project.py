#!/usr/bin/env python3
"""BEFS 프로젝트 전환 도구"""
import os
import sys
from pathlib import Path
from multi_project_firebase import MultiProjectFirebase

def main():
    manager = MultiProjectFirebase()
    
    print("🔄 BEFS 프로젝트 전환")
    print("=" * 50)
    
    # 등록된 프로젝트 목록
    projects = manager.list_projects()
    
    if not projects:
        print("❌ 등록된 프로젝트가 없습니다")
        print("   python3 setup_here.py로 프로젝트를 먼저 설정하세요")
        return
    
    print("📋 등록된 프로젝트:")
    for i, (project_id, config) in enumerate(projects.items(), 1):
        project_name = Path(config["project_path"]).name
        project_type = config["project_type"]
        port = config["befs_port"]
        print(f"   {i}. {project_name} ({project_type}) - 포트 {port}")
    
    # 프로젝트 선택
    try:
        choice = int(input("\n전환할 프로젝트 번호: ")) - 1
        project_list = list(projects.items())
        
        if 0 <= choice < len(project_list):
            project_id, config = project_list[choice]
            project_path = config["project_path"]
            
            print(f"\n🚀 {Path(project_path).name}로 전환 중...")
            
            # 해당 프로젝트 디렉토리로 이동
            os.chdir(project_path)
            
            # Agent 시작
            if Path("isolated_befs_agent.py").exists():
                os.system("python3 isolated_befs_agent.py &")
                print(f"✅ {Path(project_path).name} BEFS Agent 시작됨")
                print(f"🌐 포트: {config['befs_port']}")
            else:
                print("⚠️  isolated_befs_agent.py가 없습니다")
        else:
            print("❌ 잘못된 선택입니다")
    
    except (ValueError, KeyboardInterrupt):
        print("\n❌ 취소되었습니다")

if __name__ == "__main__":
    main()
