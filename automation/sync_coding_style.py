#!/usr/bin/env python3
"""코딩 스타일 일관성 동기화"""
import os
import requests
import json
from pathlib import Path

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8766"

def extract_coding_patterns():
    """프로젝트에서 코딩 패턴 추출"""
    patterns = {
        "naming_conventions": [],
        "code_style": [],
        "common_imports": [],
        "function_patterns": [],
        "type_definitions": []
    }
    
    # TypeScript 파일 분석
    ts_files = list(Path(STUDIO_DIR).glob("**/*.ts")) + list(Path(STUDIO_DIR).glob("**/*.tsx"))
    
    for file_path in ts_files[:10]:  # 최대 10개 파일만
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 네이밍 컨벤션 추출
            import re
            
            # 함수명 패턴
            functions = re.findall(r'function\s+(\w+)', content)
            patterns["naming_conventions"].extend(functions[:5])
            
            # 변수명 패턴
            variables = re.findall(r'const\s+(\w+)', content)
            patterns["naming_conventions"].extend(variables[:5])
            
            # import 패턴
            imports = re.findall(r'import.*from\s+[\'"]([^\'"]+)[\'"]', content)
            patterns["common_imports"].extend(imports[:3])
            
            # 타입 정의
            types = re.findall(r'interface\s+(\w+)', content)
            patterns["type_definitions"].extend(types[:3])
            
        except Exception:
            continue
    
    # 중복 제거 및 정리
    for key in patterns:
        patterns[key] = list(set(patterns[key]))[:10]  # 최대 10개씩
    
    return patterns

def create_style_guide_skill(patterns):
    """코딩 스타일 가이드를 Skill로 저장"""
    
    style_guide = f"""프로젝트 코딩 스타일 가이드:

네이밍 컨벤션:
{chr(10).join(f"- {name}" for name in patterns["naming_conventions"][:5])}

공통 Import:
{chr(10).join(f"- {imp}" for imp in patterns["common_imports"][:5])}

타입 정의:
{chr(10).join(f"- {typ}" for typ in patterns["type_definitions"][:5])}

스타일 원칙:
- camelCase 변수명 사용
- PascalCase 컴포넌트/인터페이스명
- kebab-case 파일명
- TypeScript 엄격 모드 준수
"""
    
    skill_data = {
        "name": "project.coding_style",
        "command": "style",
        "description": "프로젝트 코딩 스타일 가이드",
        "prompt": style_guide,
        "tags": "coding-style,consistency,project"
    }
    
    try:
        response = requests.post(f"{BEFS_URL}/skills", json=skill_data, timeout=5)
        if response.status_code == 200:
            skill_id = response.json().get('id')
            print(f"✅ 코딩 스타일 가이드 저장 완료 (ID: {skill_id})")
            return True
        else:
            print(f"❌ 저장 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 저장 오류: {e}")
        return False

def create_codebase_context_skill():
    """현재 코드베이스 컨텍스트를 Skill로 저장"""
    
    # 주요 파일 구조 분석
    important_files = []
    for pattern in ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"]:
        files = list(Path(STUDIO_DIR).glob(pattern))
        important_files.extend([str(f.relative_to(STUDIO_DIR)) for f in files[:20]])
    
    # 패키지 정보
    package_json_path = Path(STUDIO_DIR) / "package.json"
    dependencies = []
    if package_json_path.exists():
        try:
            with open(package_json_path) as f:
                pkg = json.load(f)
                dependencies = list(pkg.get("dependencies", {}).keys())[:10]
        except:
            pass
    
    context = f"""현재 프로젝트 컨텍스트:

프로젝트: KGF 넥서스 (체조 관리 시스템)
기술 스택: Next.js, TypeScript, Firebase, TailwindCSS

주요 파일 구조:
{chr(10).join(f"- {f}" for f in important_files[:15])}

주요 의존성:
{chr(10).join(f"- {dep}" for dep in dependencies[:10])}

아키텍처:
- 도메인 기반 모듈 구조
- 서비스 레이어 추상화
- 타입 안전성 중심 설계
- 라우팅 상수화
"""
    
    skill_data = {
        "name": "project.context",
        "command": "context",
        "description": "현재 프로젝트 컨텍스트 정보",
        "prompt": context,
        "tags": "project,context,architecture"
    }
    
    try:
        response = requests.post(f"{BEFS_URL}/skills", json=skill_data, timeout=5)
        if response.status_code == 200:
            skill_id = response.json().get('id')
            print(f"✅ 프로젝트 컨텍스트 저장 완료 (ID: {skill_id})")
            return True
        else:
            print(f"❌ 저장 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 저장 오류: {e}")
        return False

def sync_coding_style():
    """코딩 스타일 동기화 메인 함수"""
    print("🎨 코딩 스타일 일관성 동기화")
    print("=" * 50)
    
    # BEFS Agent 상태 확인
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ BEFS Agent가 실행되지 않았습니다")
            return False
    except:
        print("❌ BEFS Agent 연결 실패")
        return False
    
    if not os.path.exists(STUDIO_DIR):
        print(f"❌ 프로젝트 디렉토리가 없습니다: {STUDIO_DIR}")
        return False
    
    print("🔍 코딩 패턴 분석 중...")
    patterns = extract_coding_patterns()
    
    print(f"📊 분석 결과:")
    print(f"   네이밍: {len(patterns['naming_conventions'])}개")
    print(f"   Import: {len(patterns['common_imports'])}개")
    print(f"   타입: {len(patterns['type_definitions'])}개")
    
    print("\n💾 스타일 가이드 저장 중...")
    style_success = create_style_guide_skill(patterns)
    
    print("💾 프로젝트 컨텍스트 저장 중...")
    context_success = create_codebase_context_skill()
    
    if style_success and context_success:
        print("\n🎉 코딩 스타일 동기화 완료!")
        print("   이제 Agent가 Codex와 일관된 스타일로 코딩할 수 있습니다.")
        return True
    else:
        print("\n❌ 동기화 실패")
        return False

if __name__ == "__main__":
    sync_coding_style()
