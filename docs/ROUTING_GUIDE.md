# 라우팅 시스템 가이드

리팩토링된 도메인 기반 아키텍처에 맞춘 라우팅 시스템 완전 가이드입니다.

## 📋 개요

### 라우팅 구조
- **도메인별 라우트 그룹**: Auth, Member, Club, Business 도메인에 따른 라우트 분류
- **역할 기반 접근 제어**: UserRole enum을 활용한 세분화된 권한 관리
- **타입 안전성**: TypeScript와 상수를 통한 라우트 안전성 보장
- **동적 라우트 지원**: 매개변수가 있는 라우트의 체계적 관리

## 🛣️ 라우트 상수 구조

### 기본 라우트 (`/src/constants/routes.ts`)

```typescript
export const ROUTES = {
  // 홈 및 대시보드
  HOME: '/',
  DASHBOARD: '/dashboard',
  
  // 인증 (Auth Domain)
  LOGIN: '/login',
  PENDING_APPROVAL: '/pending-approval',
  PROFILE_SETUP: '/profile-setup',
  
  // 관리자 (Business Domain)
  ADMIN: {
    ROOT: '/admin',
    CLUBS: '/admin/clubs',
    MEMBERS: '/admin/members',
    // ...
  },
  
  // 동적 라우트 헬퍼
  DYNAMIC: {
    MEMBER_DETAIL: (id: string) => `/members/${id}`,
    CLUB_DETAIL: (id: string) => `/clubs/${id}`,
    // ...
  }
};
```

### 라우트 그룹

```typescript
export const ROUTE_GROUPS = {
  ADMIN: [...],           // 관리자 전용
  CLUB_DASHBOARD: [...],  // 클럽 관리
  PUBLIC: [...],          // 공개 접근
  PROTECTED: [...],       // 인증 필요
};
```

## 🔐 권한 기반 라우팅

### 역할 계층 구조

```typescript
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.MEMBER]: 1,
  [UserRole.PARENT]: 1,
  [UserRole.ASSISTANT_COACH]: 2,
  [UserRole.HEAD_COACH]: 3,
  [UserRole.CLUB_STAFF]: 4,
  [UserRole.MEDIA_MANAGER]: 4,
  [UserRole.CLUB_MANAGER]: 5,
  [UserRole.CLUB_OWNER]: 6,
  [UserRole.COMMITTEE_MEMBER]: 7,
  [UserRole.COMMITTEE_CHAIR]: 8,
  [UserRole.FEDERATION_SECRETARIAT]: 9,
  [UserRole.FEDERATION_ADMIN]: 10,
  [UserRole.SUPER_ADMIN]: 11,
  [UserRole.VENDOR]: 0
};
```

### 접근 권한 매트릭스

| 라우트 그룹 | 최소 권한 | 설명 |
|-------------|-----------|------|
| PUBLIC | 없음 | 누구나 접근 가능 |
| PROTECTED | MEMBER | 인증된 사용자만 |
| CLUB_DASHBOARD | CLUB_MANAGER | 클럽 관리자 이상 |
| ADMIN | FEDERATION_ADMIN | 연맹 관리자 이상 |

## 🔍 라우트 검증 시스템

### RouteValidator 클래스

```typescript
import { routeValidator } from '@/utils/route-validator';

// 라우트 검증
const analysis = routeValidator.validateRoute('/members/123');
console.log(analysis.exists);        // true/false
console.log(analysis.group);         // 'protected'
console.log(analysis.requiredRole);  // UserRole.MEMBER

// 접근 권한 확인
const canAccess = routeValidator.canAccess('/admin/clubs', UserRole.CLUB_OWNER);
console.log(canAccess); // false (권한 부족)
```

### 라우트 감사 도구

```bash
# 라우트 감사 실행
node src/scripts/route-audit.js

# 결과:
# - 사용되지 않는 라우트
# - 존재하지 않는 라우트
# - 하드코딩된 라우트
# - 사용되지 않는 상수
```

## 📱 실제 사용법

### 1. 정적 라우트 사용

```typescript
import { ROUTES } from '@/constants/routes';
import { useRouter } from 'next/navigation';

const router = useRouter();

// ✅ 올바른 사용법
router.push(ROUTES.ADMIN.CLUBS);
router.push(ROUTES.MY_PROFILE.FAMILY);

// ❌ 피해야 할 사용법
router.push('/admin/clubs');
router.push('/my-profile/family');
```

### 2. 동적 라우트 사용

```typescript
import { ROUTES } from '@/constants/routes';

// ✅ 올바른 사용법
const memberDetailUrl = ROUTES.DYNAMIC.MEMBER_DETAIL('123');
const clubDetailUrl = ROUTES.DYNAMIC.CLUB_DETAIL('abc');

// ❌ 피해야 할 사용법
const memberDetailUrl = `/members/${memberId}`;
const clubDetailUrl = `/clubs/${clubId}`;
```

### 3. Link 컴포넌트 사용

```tsx
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';

// ✅ 올바른 사용법
<Link href={ROUTES.CLUBS}>클럽 목록</Link>
<Link href={ROUTES.DYNAMIC.CLUB_DETAIL(club.id)}>
  {club.name}
</Link>

// ❌ 피해야 할 사용법
<Link href="/clubs">클럽 목록</Link>
<Link href={`/clubs/${club.id}`}>{club.name}</Link>
```

### 4. 조건부 라우팅

```typescript
import { routeUtils } from '@/constants/routes';
import { useUser } from '@/hooks/use-user';

const { user } = useUser();
const currentPath = usePathname();

// 라우트 그룹 확인
if (routeUtils.isAdminRoute(currentPath)) {
  // 관리자 페이지 로직
}

if (routeUtils.isClubDashboardRoute(currentPath)) {
  // 클럽 대시보드 로직
}

// 접근 권한 확인
const canAccessAdmin = routeValidator.canAccess(
  ROUTES.ADMIN.ROOT, 
  user?.role
);
```

## 🚀 마이그레이션 가이드

### 기존 하드코딩된 라우트 수정

1. **라우트 감사 실행**
   ```bash
   node src/scripts/route-audit.js
   ```

2. **하드코딩된 라우트 식별**
   - 감사 결과에서 "Hardcoded Routes" 섹션 확인
   - 각 파일에서 문자열 라우트 찾기

3. **상수로 교체**
   ```typescript
   // Before
   router.push('/admin/clubs');
   
   // After
   import { ROUTES } from '@/constants/routes';
   router.push(ROUTES.ADMIN.CLUBS);
   ```

4. **동적 라우트 교체**
   ```typescript
   // Before
   router.push(`/members/${memberId}`);
   
   // After
   import { ROUTES } from '@/constants/routes';
   router.push(ROUTES.DYNAMIC.MEMBER_DETAIL(memberId));
   ```

### 새로운 라우트 추가

1. **라우트 상수 정의**
   ```typescript
   // /src/constants/routes.ts
   export const ROUTES = {
     // ...
     NEW_FEATURE: {
       ROOT: '/new-feature',
       DETAIL: '/new-feature/detail',
     }
   };
   ```

2. **라우트 그룹에 추가**
   ```typescript
   export const ROUTE_GROUPS = {
     PROTECTED: [
       // ...
       ROUTES.NEW_FEATURE.ROOT,
       ROUTES.NEW_FEATURE.DETAIL,
     ]
   };
   ```

3. **권한 설정**
   ```typescript
   // RouteValidator에서 권한 설정
   // 필요시 동적 라우트 패턴 추가
   ```

## 🔧 도구 및 유틸리티

### 1. 라우트 검증기 (`route-validator.ts`)
- 라우트 존재 여부 확인
- 권한 기반 접근 제어
- 동적 라우트 매칭

### 2. 라우트 감사기 (`route-audit.js`)
- 사용되지 않는 라우트 탐지
- 하드코딩된 라우트 식별
- 누락된 상수 발견

### 3. 라우트 매퍼 (`route-mapper.ts`)
- 하드코딩된 라우트를 상수로 매핑
- 자동 수정 제안 생성
- 코드 품질 개선

### 4. Firebase 규칙 연동
- 라우트 권한과 Firebase 보안 규칙 동기화
- 일관된 접근 제어 보장

## 📊 성능 최적화

### 1. 라우트 프리로딩
```typescript
import { ROUTES } from '@/constants/routes';
import { useRouter } from 'next/navigation';

const router = useRouter();

// 중요한 라우트 프리로드
useEffect(() => {
  router.prefetch(ROUTES.DASHBOARD);
  router.prefetch(ROUTES.MY_PROFILE.ROOT);
}, []);
```

### 2. 조건부 임포트
```typescript
// 필요할 때만 라우트 상수 로드
const loadAdminRoutes = () => import('@/constants/routes').then(m => m.ROUTES.ADMIN);
```

### 3. 라우트 캐싱
```typescript
// RouteValidator에서 분석 결과 캐싱
const cachedAnalysis = routeValidator.validateRoute('/cached-route');
```

## 🧪 테스트 전략

### 1. 라우트 존재 테스트
```typescript
describe('Routes', () => {
  test('all route constants should have corresponding pages', () => {
    Object.values(ROUTES.ADMIN).forEach(route => {
      expect(routeValidator.validateRoute(route).exists).toBe(true);
    });
  });
});
```

### 2. 권한 테스트
```typescript
test('admin routes require proper permissions', () => {
  expect(routeValidator.canAccess(ROUTES.ADMIN.ROOT, UserRole.MEMBER)).toBe(false);
  expect(routeValidator.canAccess(ROUTES.ADMIN.ROOT, UserRole.FEDERATION_ADMIN)).toBe(true);
});
```

### 3. 동적 라우트 테스트
```typescript
test('dynamic routes generate correct URLs', () => {
  expect(ROUTES.DYNAMIC.MEMBER_DETAIL('123')).toBe('/members/123');
  expect(ROUTES.DYNAMIC.CLUB_DETAIL('abc')).toBe('/clubs/abc');
});
```

## 📚 참고 자료

- [Next.js App Router 공식 문서](https://nextjs.org/docs/app)
- [TypeScript 타입 안전성 가이드](https://www.typescriptlang.org/docs/)
- [Firebase 보안 규칙 가이드](/docs/FIREBASE_RULES_GUIDE.md)
- [도메인 아키텍처 가이드](/docs/DOMAIN_ARCHITECTURE.md)
