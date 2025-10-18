#!/usr/bin/env python3
"""Codex 변경사항 BEFS Agent 동기화"""
import os
import subprocess
import requests
import json
from datetime import datetime
from openai import OpenAI

# OpenAI 클라이언트 (환경변수에서 API 키 읽기)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8766"

def get_git_diff(repo_path=STUDIO_DIR, max_lines=100):
    """최근 Git diff 가져오기"""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "HEAD"],  # 최근 커밋과 비교
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            # 커밋이 없으면 unstaged 변경사항 확인
            result = subprocess.run(
                ["git", "diff"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
        
        diff = result.stdout.strip()
        if not diff:
            return None
            
        # 너무 길면 잘라내기
        lines = diff.split('\n')
        if len(lines) > max_lines:
            diff = '\n'.join(lines[:max_lines]) + f"\n... (총 {len(lines)}줄 중 {max_lines}줄만 표시)"
        
        return diff
    except Exception as e:
        print(f"❌ Git diff 오류: {e}")
        return None

def get_changed_files(repo_path=STUDIO_DIR):
    """변경된 파일 목록"""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            result = subprocess.run(
                ["git", "diff", "--name-only"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
        
        files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
        return files
    except Exception:
        return []

def analyze_changes_with_gpt(diff, files):
    """GPT로 Codex 변경사항 분석"""
    if not os.getenv("OPENAI_API_KEY"):
        return {
            "summary": "GPT API 키가 설정되지 않음",
            "category": "unknown",
            "key_changes": [],
            "learning": "API 키 설정 필요"
        }
    
    try:
        context = f"""Codex가 수정한 코드 변경사항을 분석해주세요.

변경된 파일 ({len(files)}개):
{chr(10).join(f"- {f}" for f in files[:10])}

Git Diff:
```diff
{diff[:2000]}
```

다음 형식의 JSON으로 응답해주세요:
{{
  "summary": "변경사항을 1-2문장으로 요약",
  "category": "feature|bugfix|refactor|optimization|docs 중 하나",
  "key_changes": [
    "주요 변경사항 1",
    "주요 변경사항 2",
    "주요 변경사항 3"
  ],
  "learning": "이 변경사항에서 배울 수 있는 패턴이나 기법 (1-2문장)"
}}

한국어로 작성하되, JSON 키는 영어로 유지하세요."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "당신은 코드 변경사항을 분석하는 전문가입니다. Codex의 변경사항을 분석하여 학습 포인트를 추출합니다."
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.3,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        
        # JSON 블록 추출
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        return json.loads(content)
        
    except Exception as e:
        print(f"❌ GPT 분석 오류: {e}")
        return {
            "summary": f"분석 실패: {str(e)}",
            "category": "unknown",
            "key_changes": [],
            "learning": "분석 오류 발생"
        }

def save_to_befs(analysis, diff, files):
    """BEFS Agent에 학습 내용 저장"""
    try:
        # 1. Task로 저장
        task_data = {
            "title": f"Codex 변경: {analysis['summary']}",
            "status": "done",
            "priority": 2,
            "metadata": json.dumps({
                "source": "codex",
                "category": analysis['category'],
                "files_count": len(files),
                "learning": analysis['learning']
            }, ensure_ascii=False)
        }
        
        response = requests.post(f"{BEFS_URL}/tasks", json=task_data, timeout=5)
        task_id = None
        if response.status_code == 200:
            task_id = response.json().get('id')
            print(f"✅ Task 저장 완료 (ID: {task_id})")
        
        # 2. Skill로 저장 (패턴이 있으면)
        if analysis['learning'] and len(analysis['learning']) > 10:
            skill_data = {
                "name": f"codex.{analysis['category']}.{datetime.now().strftime('%m%d')}",
                "description": analysis['summary'],
                "prompt": analysis['learning'],
                "tags": f"codex,{analysis['category']},auto-learned"
            }
            
            response = requests.post(f"{BEFS_URL}/skills", json=skill_data, timeout=5)
            if response.status_code == 200:
                skill_id = response.json().get('id')
                print(f"✅ Skill 저장 완료 (ID: {skill_id})")
        
        # 3. 자동 요약 로그에도 저장
        log_data = {
            "text": f"[Codex 학습] {analysis['summary']} | 주요 변경: {', '.join(analysis['key_changes'][:3])}"
        }
        
        requests.post(f"{BEFS_URL}/auto", json=log_data, timeout=5)
        print("✅ 자동 요약 로그 저장 완료")
        
        return True
        
    except Exception as e:
        print(f"❌ BEFS 저장 오류: {e}")
        return False

def sync_codex_changes():
    """Codex 변경사항 동기화 메인 함수"""
    print("🤖 Codex 변경사항 동기화 시작")
    print("=" * 50)
    
    # 1. BEFS Agent 상태 확인
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ BEFS Agent가 실행되지 않았습니다")
            print("   실행: python3 ~/automation/befs_start.py")
            return False
    except:
        print("❌ BEFS Agent 연결 실패")
        return False
    
    # 2. Git 변경사항 수집
    print("📂 Git 변경사항 수집 중...")
    diff = get_git_diff()
    files = get_changed_files()
    
    if not diff and not files:
        print("✅ 변경사항 없음")
        return True
    
    print(f"   📄 변경된 파일: {len(files)}개")
    if files:
        for f in files[:5]:  # 최대 5개만 표시
            print(f"      - {f}")
        if len(files) > 5:
            print(f"      ... 외 {len(files)-5}개")
    
    # 3. GPT로 분석
    print("\n🤖 GPT로 변경사항 분석 중...")
    analysis = analyze_changes_with_gpt(diff or "", files)
    
    print(f"\n📊 분석 결과:")
    print(f"   요약: {analysis['summary']}")
    print(f"   카테고리: {analysis['category']}")
    print(f"   학습 포인트: {analysis['learning']}")
    
    if analysis['key_changes']:
        print(f"   주요 변경사항:")
        for change in analysis['key_changes'][:3]:
            print(f"      • {change}")
    
    # 4. BEFS에 저장
    print(f"\n💾 BEFS Agent에 저장 중...")
    success = save_to_befs(analysis, diff, files)
    
    if success:
        print(f"\n🎉 동기화 완료!")
        print(f"   Codex의 변경사항이 BEFS Agent에 학습되었습니다.")
    else:
        print(f"\n❌ 동기화 실패")
    
    return success

if __name__ == "__main__":
    sync_codex_changes()
