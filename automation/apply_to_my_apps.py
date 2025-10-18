#!/usr/bin/env python3
"""내 앱 2개에 BEFS 시스템 적용"""
import os
import subprocess
import sys
from pathlib import Path

def apply_befs_to_apps():
    """내 앱들에 BEFS 시스템 적용"""
    
    print("🚀 내 앱들에 BEFS 시스템 적용")
    print("=" * 50)
    
    # 1. 현재 앱들 확인
    apps = discover_my_apps()
    
    if not apps:
        print("❌ 앱을 찾을 수 없습니다")
        return
    
    print(f"📱 발견된 앱들:")
    for i, app in enumerate(apps, 1):
        print(f"   {i}. {app['name']} ({app['path']})")
    
    # 2. 사용자 선택
    selected_apps = select_apps_to_apply(apps)
    
    # 3. 각 앱에 BEFS 적용
    for app in selected_apps:
        apply_befs_to_single_app(app)
    
    # 4. Firebase 설정 안내
    show_firebase_setup_guide(selected_apps)

def discover_my_apps():
    """내 앱들 자동 발견"""
    
    apps = []
    
    # 일반적인 앱 위치들 검색
    search_paths = [
        Path.home(),
        Path.home() / "Projects",
        Path.home() / "Development", 
        Path.home() / "federation",
        Path("/Users/daewookjeong")
    ]
    
    for search_path in search_paths:
        if not search_path.exists():
            continue
            
        for item in search_path.iterdir():
            if not item.is_dir():
                continue
                
            # Next.js/React 앱 감지
            if (item / "package.json").exists():
                try:
                    import json
                    with open(item / "package.json") as f:
                        package = json.load(f)
                    
                    # React/Next.js 앱인지 확인
                    deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
                    if any(dep in deps for dep in ["react", "next", "@next/core"]):
                        apps.append({
                            "name": package.get("name", item.name),
                            "path": str(item),
                            "type": "react/nextjs",
                            "has_befs": (item / "automation").exists()
                        })
                except:
                    pass
            
            # Python 앱 감지
            elif (item / "requirements.txt").exists() or (item / "pyproject.toml").exists():
                apps.append({
                    "name": item.name,
                    "path": str(item),
                    "type": "python",
                    "has_befs": (item / "automation").exists()
                })
    
    # 중복 제거 및 정렬
    unique_apps = []
    seen_paths = set()
    
    for app in apps:
        if app["path"] not in seen_paths:
            unique_apps.append(app)
            seen_paths.add(app["path"])
    
    return sorted(unique_apps, key=lambda x: x["name"])

def select_apps_to_apply(apps):
    """적용할 앱 선택"""
    
    print(f"\n📋 BEFS를 적용할 앱을 선택하세요:")
    print(f"   (번호를 쉼표로 구분해서 입력, 예: 1,3)")
    
    try:
        choices = input("선택: ").strip()
        if not choices:
            return []
        
        indices = [int(x.strip()) - 1 for x in choices.split(",")]
        selected = [apps[i] for i in indices if 0 <= i < len(apps)]
        
        print(f"\n✅ 선택된 앱들:")
        for app in selected:
            status = "✅ BEFS 설치됨" if app["has_befs"] else "⚪ BEFS 미설치"
            print(f"   • {app['name']} ({app['type']}) - {status}")
        
        return selected
        
    except (ValueError, IndexError):
        print("❌ 잘못된 입력입니다")
        return []

def apply_befs_to_single_app(app):
    """단일 앱에 BEFS 적용"""
    
    print(f"\n🔧 {app['name']}에 BEFS 적용 중...")
    
    app_path = Path(app["path"])
    
    # 1. 앱 디렉토리로 이동
    original_cwd = os.getcwd()
    os.chdir(app_path)
    
    try:
        # 2. setup_here.py 실행
        setup_script = Path("~/automation/setup_here.py").expanduser()
        
        if setup_script.exists():
            print(f"   📋 automation 시스템 설치 중...")
            result = subprocess.run([sys.executable, str(setup_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"   ✅ {app['name']} BEFS 설치 완료")
                
                # 설정 정보 표시
                show_app_config(app_path)
                
            else:
                print(f"   ⚠️  설치 중 경고: {result.stderr[:200]}...")
        else:
            print(f"   ❌ setup_here.py를 찾을 수 없습니다")
    
    finally:
        os.chdir(original_cwd)

def show_app_config(app_path):
    """앱 설정 정보 표시"""
    
    config_file = app_path / "befs_config.json"
    if config_file.exists():
        try:
            import json
            with open(config_file) as f:
                config = json.load(f)
            
            print(f"   🔧 설정 정보:")
            print(f"      포트: {config.get('befs', {}).get('agent_port', 'N/A')}")
            print(f"      프로젝트: {config.get('project', {}).get('name', 'N/A')}")
        except:
            pass

def show_firebase_setup_guide(apps):
    """Firebase 설정 가이드 표시"""
    
    print(f"\n🔥 Firebase 설정 가이드")
    print("=" * 50)
    
    print(f"📋 Firebase 프로젝트 1개만 필요합니다!")
    print(f"   프로젝트명: befs-automation")
    print(f"   URL: https://befs-automation-default-rtdb.firebaseio.com")
    
    print(f"\n🗂️  네임스페이스 분리:")
    for app in apps:
        app_name = Path(app["path"]).name
        namespace = f"app_{app_name}_{hash(app['path']) % 10000:04d}"
        print(f"   • {app['name']}: {namespace}/")
    
    print(f"\n📋 다음 단계:")
    print(f"   1. Firebase Console에서 'befs-automation' 프로젝트 생성")
    print(f"   2. Realtime Database 활성화")
    print(f"   3. 각 앱의 firebase_config.json에 동일한 설정 입력")
    print(f"   4. 각 앱에서 python3 start_befs.py 실행")
    
    print(f"\n🎯 결과:")
    print(f"   • 모든 앱이 같은 Firebase 사용")
    print(f"   • 네임스페이스로 데이터 완전 분리")
    print(f"   • 각각 다른 포트에서 독립 실행")

def create_unified_firebase_config():
    """통합 Firebase 설정 파일 생성"""
    
    config = {
        "projectId": "befs-automation",
        "databaseURL": "https://befs-automation-default-rtdb.firebaseio.com",
        "apiKey": "YOUR_API_KEY_HERE",
        "authDomain": "befs-automation.firebaseapp.com",
        "storageBucket": "befs-automation.appspot.com",
        "messagingSenderId": "123456789",
        "appId": "1:123456789:web:abcdef123456"
    }
    
    # 홈 디렉토리에 마스터 설정 저장
    master_config = Path.home() / ".befs" / "firebase_master_config.json"
    master_config.parent.mkdir(exist_ok=True)
    
    import json
    with open(master_config, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"🔧 마스터 Firebase 설정: {master_config}")
    print(f"   이 설정을 모든 앱의 firebase_config.json에 복사하세요")

def main():
    """메인 실행"""
    
    # 내 앱들에 BEFS 적용
    apply_befs_to_apps()
    
    # 통합 Firebase 설정 생성
    create_unified_firebase_config()
    
    print(f"\n🎉 내 앱들에 BEFS 적용 완료!")
    print(f"\n💡 핵심 포인트:")
    print(f"   • Firebase 프로젝트 1개로 모든 앱 지원")
    print(f"   • 네임스페이스로 데이터 완전 분리")
    print(f"   • 각 앱별 독립된 포트 할당")
    print(f"   • 동시 실행 가능")

if __name__ == "__main__":
    main()
