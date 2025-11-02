# Phase 3 실행 계획 - 테스트 커버리지 & 코드 품질

**작성일**: 2025-11-02  
**목표**: 테스트 커버리지 50% 달성 및 코드 품질 개선

## 📊 현재 상황 분석

### 테스트 실행 상태
- **많은 테스트 실패**: Phase 1/2 리팩토링으로 인한 import 경로 깨짐
- **주요 문제**:
  - `../api-client` 경로 없음 (→ `@/lib/api/unified-api-client`로 이동)
  - `../error-handler` 경로 없음 (→ `@/lib/error/error-manager`로 이동)
  - Mock 관련 초기화 오류

### 우선순위 재정리
Phase 1/2의 대규모 리팩토링 후 테스트가 깨진 상태이므로, 
기존 테스트 수정을 우선으로 진행해야 합니다.

## 🎯 Phase 3 목표

### 1. 테스트 인프라 복구 (긴급)
- 깨진 import 경로 수정
- Mock 시스템 재구성
- 테스트 유틸리티 정리

### 2. 핵심 모듈 테스트 (높음)
- `lib/api/unified-api-client.ts` 테스트
- `lib/error/error-manager.ts` 테스트
- `stores/` 통합 테스트

### 3. API Route 테스트 (중간)
- 주요 API endpoint 테스트
- 인증/권한 미들웨어 테스트

### 4. 코드 품질 개선 (낮음)
- == → === 패턴 수정
- 추가 미사용 파일 제거

## 📋 실행 계획

### Step 1: 테스트 파일 정리 (30분)
```bash
# 1. 깨진 테스트 파일 식별
find src -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "api-client\|error-handler"

# 2. 일괄 import 경로 수정
- api-client → unified-api-client
- error-handler → error-manager

# 3. 실제로 없는 파일을 참조하는 테스트 제거
```

### Step 2: Mock 시스템 수정 (30분)
```typescript
// src/test/mocks/index.ts 재구성
// 순환 참조 및 초기화 순서 문제 해결
```

### Step 3: 핵심 테스트 작성 (2시간)
1. **unified-api-client.test.ts**
   - 기본 CRUD 작업
   - 페이지네이션
   - 에러 처리
   - 재시도 로직

2. **error-manager.test.ts**
   - APIError 클래스
   - 에러 변환
   - 로깅

3. **stores 통합 테스트**
   - ui-store
   - user-store
   - club-store

### Step 4: 테스트 커버리지 측정 (30분)
```bash
# 수정된 테스트 실행
npm run test:coverage

# 리포트 생성
npm run test:coverage:report
```

## 🎯 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 테스트 성공률 | ~10% | 90%+ |
| 코드 커버리지 | Unknown | 50%+ |
| 핵심 모듈 커버리지 | 0% | 80%+ |
| API Route 커버리지 | 0% | 60%+ |

## ⏱️ 예상 시간

- **총 예상 시간**: 4-5시간
- **우선순위 높음**: 2-3시간 (테스트 복구 + 핵심 테스트)
- **우선순위 중간**: 1-2시간 (API 테스트)
- **우선순위 낮음**: 1시간 (코드 품질)

## 🚀 시작하기

1. **테스트 파일 정리 스크립트 작성**
2. **Mock 시스템 디버깅**
3. **핵심 모듈부터 테스트 작성**
4. **점진적으로 커버리지 확대**

---

**참고**: Phase 1/2의 대규모 변경으로 인해 기존 테스트가 대부분 깨진 상태입니다.
테스트 복구를 최우선으로 진행한 후, 새로운 테스트를 추가해야 합니다.
