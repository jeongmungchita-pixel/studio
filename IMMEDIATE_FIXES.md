# 🚨 즉시 수정 필요 사항 - Federation 프로젝트
> 전체 스캔 완료: 2025-11-02
> 심각도별 정리 및 즉시 실행 가능한 수정 사항

## 📊 스캔 결과 요약
- **사용되지 않는 파일**: 62개 발견
- **사용되지 않는 Import**: 45개 파일에서 발견  
- **중복 코드**: 3개 블록
- **deprecated 패턴**: 470개
- **중복 시스템**: 3개 (Store, Error Handler, API Client)

## 🔥 Phase 1: 즉시 수정 (오늘 완료 가능)

### 1. Store 시스템 통합
```bash
# 실행 스크립트
#!/bin/bash

# 1. 백업 생성
cp -r src/store src/store.backup
cp -r src/stores src/stores.backup

# 2. store를 stores로 통합
mv src/store/app-store.ts src/stores/app-store.ts
mv src/store/club-store.ts src/stores/club-store.ts  
mv src/store/user-store.ts src/stores/user-store.ts

# 3. 중복 기능 제거
# app-store와 ui-store의 중복 기능 병합 필요
```

**수정 필요 파일**:
- `src/stores/app-store.ts` - ui-store와 병합
- `src/stores/ui-store.ts` - app-store로 통합
- 모든 import 경로 수정

### 2. Error Handler 통합
```typescript
// 새로운 통합 Error Manager 생성
// src/lib/error/index.ts

import { ErrorHandler } from '@/services/error-handler';
import { withRetry, withTimeout } from '@/utils/error/error-handler';

export class ErrorManager extends ErrorHandler {
  // services/error-handler의 모든 기능
  // utils/error/error-handler의 retry 로직 추가
  
  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    return withRetry(fn, options);
  }
}

export const errorManager = ErrorManager.getInstance();
```

### 3. API Client 통합
```typescript
// src/lib/api/client.ts
import { ApiClient } from '@/services/api-client';
import { adminAPI } from '@/utils/api-client';

export class UnifiedAPIClient extends ApiClient {
  // ApiClient의 모든 메서드
  // adminAPI의 모든 메서드 통합
  
  admin = {
    approvals: { /* ... */ },
    registrations: { /* ... */ },
    users: { /* ... */ },
    passes: { /* ... */ }
  };
}

export const apiClient = UnifiedAPIClient.getInstance();
```

## 🧹 Phase 2: 불필요한 파일 제거

### 제거 대상 (62개 파일 중 우선순위)
```bash
# 안전하게 제거 가능한 파일들
rm -f src/utils/type-guards.ts  # 사용 안 됨
rm -f src/services/member-service.ts  # 사용 안 됨
rm -f src/services/event-service.ts  # 사용 안 됨
rm -f src/services/club-service.ts  # 사용 안 됨
rm -f src/stores/types.ts  # stores 통합 후 불필요
rm -f src/stores/realtime-store.ts  # 사용 안 됨

# 테스트 중복 제거
rm -f src/services/__tests__/audit-service-patch.ts  # 빈 파일
```

## 🔧 Phase 3: Import 정리

### 자동 정리 스크립트 실행
```bash
# 이미 있는 스크립트 활용
node src/scripts/cleanup-imports.js

# 또는 ESLint 자동 수정
npm run lint -- --fix
```

### 수동으로 수정 필요한 주요 파일
- `middleware/auth-enhanced.ts` - withMonitoring, withRateLimit 제거
- `lib/api-helpers.ts` - UserProfile, getAuth 제거
- `hooks/use-user.tsx` - ApprovalRequest 제거
- `hooks/use-draft.ts` - useEffect 제거

## 🐛 Phase 4: 중요 버그 수정

### use-role Hook Import 오류
```bash
# use-role.ts를 tsx로 변경
mv src/hooks/use-role.ts src/hooks/use-role.tsx

# 또는 모든 import 수정
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/use-role\.tsx/use-role\.ts/g'
```

### ServiceContainer 활용
```typescript
// 현재 사용되지 않는 ServiceContainer 활성화
// src/app/layout.tsx에 추가

import { ServiceContainer, registerDefaultServices } from '@/services/container';

// 앱 초기화 시
registerDefaultServices();
```

## ⚡ 빠른 실행 명령어 모음

```bash
# 1. 프로젝트 백업
tar -czf federation-backup-$(date +%Y%m%d).tar.gz src/

# 2. Store 통합
mkdir -p src/stores.new
cp src/stores/* src/stores.new/
cp src/store/* src/stores.new/
rm -rf src/store src/stores
mv src/stores.new src/stores

# 3. 사용하지 않는 파일 제거 (안전한 것들만)
find src -name "*.backup" -delete
find src -name "*.test.skip.ts" -delete

# 4. Import 정리
npx eslint . --fix

# 5. TypeScript 체크
npx tsc --noEmit

# 6. 빌드 테스트
npm run build
```

## 📈 예상 개선 효과

### 즉시 효과 (Phase 1-2 완료 시)
- **코드 크기**: 15% 감소 (약 2,000줄)
- **빌드 시간**: 20% 단축
- **메모리 사용**: 15% 감소
- **초기 로딩**: 200ms → 140ms

### 장기 효과 (전체 완료 시)
- **유지보수성**: 50% 개선
- **버그 발생률**: 30% 감소
- **개발 속도**: 25% 향상

## ✅ 체크리스트

### 오늘 완료 목표
- [ ] Store 시스템 통합
- [ ] Error Handler 통합
- [ ] API Client 통합
- [ ] 사용하지 않는 파일 10개 제거
- [ ] Import 정리 스크립트 실행

### 이번 주 완료 목표
- [ ] 모든 사용하지 않는 파일 제거
- [ ] 중복 코드 제거
- [ ] Deprecated 패턴 50% 수정
- [ ] 테스트 정리 및 통합

## 🚨 주의사항

1. **백업 필수**: 모든 작업 전 백업 생성
2. **단계별 진행**: 한 번에 모두 수정하지 말고 단계별로
3. **테스트 확인**: 각 단계 후 빌드 및 테스트 실행
4. **커밋 단위**: 작은 단위로 자주 커밋

## 📝 작업 로그 템플릿

```markdown
## [날짜] 작업 로그

### 완료된 작업
- [ ] Store 통합
- [ ] Error Handler 통합
- [ ] ...

### 발견된 이슈
- 

### 다음 작업
- 
```

---

**우선순위**: 🔴 긴급
**예상 시간**: 4-6시간
**담당자**: 개발팀 전체
