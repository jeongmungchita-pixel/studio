#!/usr/bin/env python3
"""Codex 연동 설정 도구"""
import os
import subprocess

def setup_codex_integration():
    print("🤖 Codex 연동 설정")
    print("=" * 50)
    
    # 1. OpenAI API 키 확인
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("⚠️  OpenAI API 키가 설정되지 않았습니다")
        print()
        key = input("OpenAI API 키를 입력하세요: ").strip()
        
        if key:
            # .zshrc에 추가
            with open(os.path.expanduser("~/.zshrc"), "a") as f:
                f.write(f"\n# OpenAI API Key for Codex Integration\n")
                f.write(f"export OPENAI_API_KEY='{key}'\n")
            
            os.environ["OPENAI_API_KEY"] = key
            print("✅ API 키 설정 완료")
        else:
            print("❌ API 키가 필요합니다")
            return False
    else:
        print("✅ OpenAI API 키 확인됨")
    
    # 2. 프로젝트 디렉토리 확인
    studio_dir = os.path.expanduser("~/federation/studio")
    if os.path.exists(studio_dir):
        print(f"✅ 프로젝트 디렉토리 확인: {studio_dir}")
    else:
        print(f"⚠️  프로젝트 디렉토리가 없습니다: {studio_dir}")
        alt_dir = input("프로젝트 디렉토리 경로를 입력하세요: ").strip()
        if alt_dir and os.path.exists(alt_dir):
            # codex_sync.py에서 경로 수정 필요
            print(f"✅ 대체 디렉토리: {alt_dir}")
        else:
            print("❌ 유효한 디렉토리가 필요합니다")
            return False
    
    # 3. BEFS Agent 상태 확인
    try:
        import requests
        response = requests.get("http://127.0.0.1:8765/health", timeout=2)
        if response.status_code == 200:
            print("✅ BEFS Agent 실행 중")
        else:
            print("⚠️  BEFS Agent 시작 필요")
            start = input("BEFS Agent를 시작하시겠습니까? (Y/n): ").strip().lower()
            if start != 'n':
                subprocess.run(["python3", os.path.expanduser("~/automation/befs_start.py")])
    except:
        print("❌ BEFS Agent 연결 실패")
        return False
    
    # 4. 테스트 실행
    print("\n🧪 연동 테스트 실행 중...")
    try:
        result = subprocess.run(
            ["python3", os.path.expanduser("~/automation/codex_sync.py")],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ 연동 테스트 성공")
        else:
            print(f"⚠️  테스트 경고: {result.stderr}")
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
    
    print("\n🎉 Codex 연동 설정 완료!")
    print("\n📚 사용법:")
    print("  Key 12: 수동 동기화 (Codex 작업 후)")
    print("  Key 13: 자동 감시 시작 (백그라운드)")
    print("  Key 14: 자동 감시 중지")
    
    # 5. 자동 감시 시작 제안
    auto_start = input("\n👀 자동 파일 감시를 시작하시겠습니까? (Y/n): ").strip().lower()
    if auto_start != 'n':
        subprocess.Popen(
            ["python3", os.path.expanduser("~/automation/codex_watcher.py"), "start"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print("✅ 자동 감시 시작됨")
    
    return True

if __name__ == "__main__":
    setup_codex_integration()
