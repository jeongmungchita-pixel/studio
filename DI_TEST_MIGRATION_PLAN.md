# DI 테스트 전환 계획

## 📊 현황
- 총 테스트 파일: 177개
- DI 적용 완료: 3개 (container, di-integration, link-member)
- 전환 필요: 174개

## 🎯 전환 우선순위

### 🔥 높음 (즉시 전환)
1. **API Routes** (약 30개)
   - `/api/admin/*` 모든 엔드포인트
   - `/api/users/*` 사용자 관리 API
   - 이유: DI 적용 핵심, 가장 많은 실패

2. **Services** (약 15개)
   - auth-service.ts
   - user-service.ts  
   - member-service.ts
   - notification-service.ts
   - 이유: 비즈니스 로직 핵심

### 🟡 중간 (다음 단계)
3. **Components** (약 50개)
   - admin/ 페이지 컴포넌트들
   - 공통 컴포넌트
   - 이유: UI 테스트, DI 서비스 의존

4. **Hooks** (약 20개)
   - use-user, use-role 등
   - 이유: 서비스 레이어 연결

### 🟢 낮음 (마지막)
5. **Utils/Helpers** (약 30개)
   - 순수 함수들은 기존 유지
   - DI 의존성 있는 것만 전환

6. **Middleware** (약 20개)
   - 독립적인 미들웨어는 기존 유지
   - 서비스 의존성 있는 것만 전환

## 🛠️ 전환 방법

### 기존 테스트 폐기
```bash
# 기존 실패 테스트들 백업 후 삭제
mkdir -p backup/old-tests
mv src/app/api/admin/users/update-status/__tests__/route*.test.ts backup/old-tests/
```

### DI 테스트 템플릿 적용
```typescript
// 기존 방식
import { authService } from '@/services/auth-service';

// DI 방식  
import { createMockServiceContainer } from '@/components/__tests__/test-utils';

const mockContainer = createMockServiceContainer();
vi.stubGlobal('services', mockContainer.services);
```

## ⏱️ 예상 시간
- API Routes: 2-3시간
- Services: 1-2시간  
- Components: 3-4시간
- Hooks: 1-2시간
- **총**: 7-11시간

## 🎯 목표
- 모든 테스트 DI 기반으로 전환
- 커버리지 50% 달성
- 빌드 안정성 확보
