#!/usr/bin/env python3
"""Agent 일관성 향상을 위한 상세 컨텍스트 생성"""
import os
import requests
import json
import re
from pathlib import Path

STUDIO_DIR = os.path.expanduser("~/federation/studio")
BEFS_URL = "http://127.0.0.1:8765"

def extract_detailed_patterns():
    """상세한 코딩 패턴 추출"""
    patterns = {
        "interfaces": {},
        "enums": {},
        "functions": {},
        "imports": {},
        "constants": {}
    }
    
    # TypeScript 파일들 분석
    ts_files = list(Path(STUDIO_DIR).glob("**/*.ts")) + list(Path(STUDIO_DIR).glob("**/*.tsx"))
    
    for file_path in ts_files[:20]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 인터페이스 추출 (완전한 정의)
            interface_matches = re.findall(r'export interface (\w+) \{([^}]+)\}', content, re.DOTALL)
            for name, body in interface_matches:
                patterns["interfaces"][name] = body.strip()
            
            # Enum 추출
            enum_matches = re.findall(r'export enum (\w+) \{([^}]+)\}', content, re.DOTALL)
            for name, body in enum_matches:
                patterns["enums"][name] = body.strip()
            
            # 함수 시그니처 추출
            func_matches = re.findall(r'export (?:const|function) (\w+).*?(?:\{|=>)', content)
            for func_name in func_matches:
                patterns["functions"][func_name] = file_path.name
            
            # Import 패턴 추출
            import_matches = re.findall(r'import \{([^}]+)\} from [\'"]([^\'"]+)[\'"]', content)
            for imports, module in import_matches:
                clean_imports = [imp.strip() for imp in imports.split(',')]
                patterns["imports"][module] = clean_imports
            
        except Exception:
            continue
    
    return patterns

def create_comprehensive_guide():
    """포괄적인 코딩 가이드 생성"""
    patterns = extract_detailed_patterns()
    
    # UserProfile 인터페이스 상세 정보
    user_profile_detail = patterns["interfaces"].get("UserProfile", "")
    
    guide = f"""# KGF 넥서스 프로젝트 완전 코딩 가이드

## 핵심 타입 정의

### UserProfile 인터페이스 (정확한 정의)
```typescript
export interface UserProfile {{
{user_profile_detail}
}}
```

### 주요 Enum 타입
"""
    
    # Enum 정보 추가
    for enum_name, enum_body in patterns["enums"].items():
        guide += f"""
#### {enum_name}
```typescript
export enum {enum_name} {{
{enum_body}
}}
```
"""
    
    guide += f"""

## Import 패턴 (정확한 경로)
"""
    
    # 주요 Import 패턴
    for module, imports in list(patterns["imports"].items())[:10]:
        guide += f"""
- `import {{ {', '.join(imports[:5])} }} from '{module}'`
"""
    
    guide += f"""

## 함수 네이밍 패턴
"""
    
    # 함수명 패턴
    func_names = list(patterns["functions"].keys())[:15]
    for func_name in func_names:
        guide += f"- `{func_name}()` (from {patterns['functions'][func_name]})\n"
    
    guide += f"""

## 코딩 규칙
1. **인터페이스**: PascalCase (UserProfile, ClubData)
2. **함수**: camelCase (validateUser, handleAuth)
3. **상수**: UPPER_SNAKE_CASE (API_ENDPOINTS, USER_ROLES)
4. **파일**: kebab-case (user-profile.ts, auth-service.ts)
5. **타입 안전성**: any 금지, unknown 사용
6. **에러 처리**: try-catch 필수
7. **비동기**: async/await 사용

## 프로젝트 특화 패턴
- 모든 API 응답은 `{{ success: boolean, data?: T, error?: string }}` 형태
- 사용자 상태는 'active' | 'inactive' | 'pending' | 'approved' | 'rejected'
- 역할은 UserRole enum 사용 (SUPER_ADMIN, CLUB_OWNER, MEMBER 등)
- 날짜는 ISO string 형태 (createdAt, updatedAt)
"""
    
    return guide

def save_comprehensive_guide():
    """포괄적인 가이드를 Skill로 저장"""
    guide = create_comprehensive_guide()
    
    skill_data = {
        "name": "project.complete_guide",
        "command": "guide",
        "description": "KGF 넥서스 프로젝트 완전 코딩 가이드",
        "prompt": guide,
        "tags": "complete-guide,types,interfaces,patterns,project"
    }
    
    try:
        response = requests.post(f"{BEFS_URL}/skills", json=skill_data, timeout=10)
        if response.status_code == 200:
            skill_id = response.json().get('id')
            print(f"✅ 완전 코딩 가이드 저장 완료 (ID: {skill_id})")
            return True
        else:
            print(f"❌ 저장 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 저장 오류: {e}")
        return False

def main():
    print("🎯 Agent 일관성 향상 시스템")
    print("=" * 50)
    
    # BEFS Agent 확인
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ BEFS Agent가 실행되지 않았습니다")
            return
    except:
        print("❌ BEFS Agent 연결 실패")
        return
    
    print("🔍 상세 패턴 분석 중...")
    patterns = extract_detailed_patterns()
    
    print(f"📊 추출 결과:")
    print(f"   인터페이스: {len(patterns['interfaces'])}개")
    print(f"   Enum: {len(patterns['enums'])}개")
    print(f"   함수: {len(patterns['functions'])}개")
    print(f"   Import: {len(patterns['imports'])}개")
    
    print("\n💾 완전 가이드 생성 및 저장 중...")
    success = save_comprehensive_guide()
    
    if success:
        print("\n🎉 Agent 일관성 향상 완료!")
        print("   이제 Agent가 Codex 수준의 일관성으로 코딩할 수 있습니다.")
        print("\n💡 사용법:")
        print("   Agent에게 'guide 명령을 참조해서 코딩해줘'라고 요청하세요.")
    else:
        print("\n❌ 향상 실패")

if __name__ == "__main__":
    main()
