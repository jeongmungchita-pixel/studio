# Federation 글로벌 개발 규칙 (Global Development Rules)

## 1. 아키텍처 원칙

### 1.1 레이어드 아키텍처 준수
```
src/
├── app/           # Next.js App Router (프레젠테이션)
├── components/    # 재사용 가능한 UI 컴포넌트
├── domains/       # 도메인별 비즈니스 로직
├── services/      # 외부 API 통신 및 데이터 처리
├── lib/          # 공통 유틸리티 및 설정
├── types/        # TypeScript 타입 정의
└── constants/    # 애플리케이션 상수
```

**규칙:**
- 하위 레이어는 상위 레이어를 의존할 수 없음
- 비즈니스 로직은 `domains/`에 위치
- UI 로직은 `components/`에 한정

### 1.2 의존성 주입 (DI) 패턴
```typescript
// ❌ Bad: 직접 의존성
class UserService {
  private api = new APIClient(); // 직접 생성
}

// ✅ Good: 의존성 주입
class UserService {
  constructor(private api: IAPIClient) {}
}

// 팩토리 사용
const userService = ServiceFactory.createUserService();
```

### 1.3 읽기/쓰기 분리 원칙
```typescript
// ✅ 클라이언트 직접 읽기 (70%)
const { data: users } = useCollection(query(
  collection(firestore, 'users'),
  where('status', '==', 'active')
));

// ❌ 클라이언트 직접 쓰기 (민감 데이터)
await updateDoc(doc(firestore, 'users', userId), {
  role: 'ADMIN' // 금지!
});

// ✅ API 경유 쓰기 (민감 데이터)
await adminAPI.users.updateRole(userId, 'ADMIN');
```

## 2. 코드 품질 규칙

### 2.1 TypeScript 엄격 모드
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2.2 ESLint 규칙 강화
```javascript
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 2.3 네이밍 컨벤션
```typescript
// 파일명: kebab-case
user-profile.service.ts
member-management.component.ts

// 변수/함수: camelCase
const userData = getUserData();

// 클래스/인터페이스: PascalCase
class UserProfileService {}
interface IUserProfile {}

// 상수: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// 타입: PascalCase
type UserProfile = {
  // ...
};
```

### 2.4 변수명 특별 규칙
- Firebase Auth의 `UserCredential.user`는 그대로 유지
- `useUser()` hook에서 반환하는 사용자 정보는 `_user` 사용
- 이벤트 핸들러의 event는 `_event` 사용
- Date 객체는 `_today`, `_now` 등 언더스코어 prefix 사용

## 3. Firebase/데이터베이스 규칙

### 3.1 Firestore Rules 보안 원칙
```javascript
// 민감 필드 목록 상수화
const SENSITIVE_FIELDS = [
  'status', 'role', 'linkedMemberId', 
  'clubId', 'clubName', 'permissions'
];

// 헬퍼 함수
function hasSensitiveFields(data) {
  return SENSITIVE_FIELDS.some(field => data[field] !== undefined);
}
```

### 3.2 Firebase 쿼리 패턴
```typescript
// 병렬 쿼리 사용 (성능 최적화)
const results = await Promise.allSettled([
  query1,
  query2,
  query3
]);

// useMemoFirebase 사용 (재렌더링 방지)
const query = useMemoFirebase(() => {
  if (!firestore || !userId) return null;
  return query(collection(firestore, 'users'), where(...));
}, [firestore, userId]);
```

### 3.3 계층적 권한 구조
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FEDERATION_ADMIN = 'FEDERATION_ADMIN',
  CLUB_OWNER = 'CLUB_OWNER',
  CLUB_MANAGER = 'CLUB_MANAGER',
  HEAD_COACH = 'HEAD_COACH',
  ASSISTANT_COACH = 'ASSISTANT_COACH',
  MEMBER = 'MEMBER',
  PARENT = 'PARENT'
}

// 권한 검증 헬퍼
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = Object.values(UserRole);
  const userIndex = roleHierarchy.indexOf(userRole);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  return userIndex <= requiredIndex;
}
```

## 4. API 설계 규칙

### 4.1 RESTful API 설계
```typescript
// GET /api/admin/users - 목록 조회
// GET /api/admin/users/[id] - 상세 조회
// POST /api/admin/users - 생성
// PUT /api/admin/users/[id] - 수정
// DELETE /api/admin/users/[id] - 삭제
```

### 4.2 Admin API 엔드포인트 구조
```typescript
// /api/admin/[domain]/[action]/route.ts
export async function POST(request: Request) {
  try {
    // 1. 인증 확인
    const authResult = await withAuthEnhanced(request, async (req) => {
      if (!req.user) {
        return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      }
      
      // 2. 권한 검증
      if (!hasMinimumRole(req.user.role, requiredRole)) {
        return NextResponse.json({ error: '권한 없음' }, { status: 403 });
      }
      
      // 3. 트랜잭션 처리
      await adminDB.runTransaction(async (transaction) => {
        // 작업 수행
      });
      
      // 4. 감사 로그
      await auditService.log({
        action: 'USER_ROLE_CHANGED',
        userId: targetUserId,
        performedBy: req.user.uid,
        timestamp: new Date().toISOString()
      });
      
      return successResponse(data);
    });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 4.3 에러 처리 표준
```typescript
// 표준 에러 응답 형식
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// HTTP 상태 코드 활용
400: Bad Request (검증 오류)
401: Unauthorized (인증 없음)
403: Forbidden (권한 없음)
404: Not Found (리소스 없음)
500: Internal Server Error (서버 오류)
```

## 5. 컴포넌트 패턴

### 5.1 페이지 컴포넌트 구조
```typescript
'use client';

export default function PageComponent() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  // 로딩 상태 처리
  if (isUserLoading) {
    return <LoadingSpinner />;
  }
  
  // 권한 검증
  if (!_user || _user.role !== requiredRole) {
    router.push('/dashboard');
    return null;
  }
  
  // 메인 렌더링
  return (
    <main className="flex-1 p-6 space-y-6">
      {/* 컨텐츠 */}
    </main>
  );
}
```

### 5.2 Form 처리
```typescript
// React Hook Form + Zod 사용
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});

// 임시저장 기능
const { saveDraft, loadDraft } = useDraft<FormData>('draft-key');
```

## 6. 테스트 규칙

### 6.1 테스트 커버리지 목표
- **서비스 레이어**: 90% 이상
- **API 엔드포인트**: 85% 이상
- **핵심 비즈니스 로직**: 95% 이상
- **전체 평균**: 80% 이상

### 6.2 테스트 구조 표준
```typescript
// Arrange-Act-Assert 패턴
describe('UserService', () => {
  beforeEach(() => {
    // 테스트 환경 설정
  });

  it('should create user successfully', async () => {
    // Arrange
    const userData = { name: 'Test User', email: 'test@example.com' };
    
    // Act
    const result = await userService.create(userData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.name).toBe(userData.name);
  });
});
```

### 6.3 Firestore Rules 테스트
```typescript
// @firebase/rules-unit-testing 사용
describe('Firestore Rules', () => {
  it('should allow read for authenticated user', async () => {
    // 테스트 코드
  });
});
```

### 6.4 API 테스트
```typescript
// MSW (Mock Service Worker) 사용
import { rest } from 'msw';
import { setupServer } from 'msw/node';
```

## 7. 성능 최적화 규칙

### 7.1 Firebase 쿼리 최적화
```typescript
// ❌ Bad: N+1 쿼리 문제
members.forEach(member => {
  const user = await getDoc(doc(firestore, 'users', member.userId));
});

// ✅ Good: 병렬 쿼리
const userIds = members.map(m => m.userId);
const userQueries = userIds.map(uid => 
  getDoc(doc(firestore, 'users', uid))
);
const userDocs = await Promise.all(userQueries);
```

### 7.2 캐싱 전략
```typescript
// 캐시 TTL 가이드라인
const CACHE_TTL = {
  USER_PROFILE: 5 * 60 * 1000,      // 5분
  CLUB_INFO: 30 * 60 * 1000,       // 30분
  MEMBER_LIST: 10 * 60 * 1000,     // 10분
  API_RESPONSE: 60 * 1000          // 1분
};
```

### 7.3 레이트 리미팅
- strictRateLimit: 5분당 10개 (민감한 작업)
- standardRateLimit: 15분당 100개 (일반 API)
- lenientRateLimit: 15분당 500개 (읽기)

## 8. 에러 처리 규칙

### 8.1 Firebase 에러
```typescript
try {
  // Firebase 작업
} catch (error) {
  if (error.code === 'permission-denied') {
    toast({
      variant: 'destructive',
      title: '권한 없음',
      description: '이 작업을 수행할 권한이 없습니다.'
    });
  }
}
```

### 8.2 API 에러
```typescript
try {
  const result = await adminAPI.someAction();
} catch (error) {
  console.error('API Error:', error);
  toast({
    variant: 'destructive',
    title: '오류',
    description: (error as any)?.message || '작업 중 오류가 발생했습니다.'
  });
}
```

## 9. 개발 워크플로우 규칙

### 9.1 브랜치 전략
```
main                    # 프로덕션 브랜치
├── develop            # 개발 통합 브랜치
├── feature/xxx        # 기능 개발 브랜치
├── bugfix/xxx         # 버그 수정 브랜치
└── hotfix/xxx         # 긴급 수정 브랜치
```

### 9.2 커밋 메시지 규칙
```
<type>(<scope>): <subject>

<body>

<footer>
```

**타입 종류:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드, 설정 변경

**예시:**
```
feat(auth): federation admin 승인 시스템 구현

- 승인 요청 생성 API 추가
- SUPER_ADMIN 권한 검증 로직
- Firestore Rules 보안 강화

Closes #123
```

## 10. 도메인별 구조 규칙

### 10.1 도메인 폴더 구조 표준
```
src/domains/
├── member/
│   ├── components/     # 멤버 관련 컴포넌트
│   ├── services/       # 멤버 비즈니스 로직
│   ├── hooks/          # 멤버 관련 훅
│   ├── utils/          # 멤버 유틸리티
│   ├── types/          # 멤버 타입
│   └── index.ts        # 도메인 진입점
├── club/
├── competition/
└── finance/
```

### 10.2 도메인별 타입 분리
```typescript
// src/domains/member/types/member.types.ts
export interface Member {
  id: string;
  userId: string;
  clubId: string;
  profile: MemberProfile;
  status: MemberStatus;
}

// src/domains/club/types/club.types.ts
export interface Club {
  id: string;
  name: string;
  federationId: string;
  settings: ClubSettings;
}
```

### 10.3 클럽 스코프 데이터 접근
```typescript
// 클럽별 데이터 격리 원칙
const clubQuery = useMemoFirebase(() => {
  if (!firestore || !user?.clubId) return null;
  return query(
    collection(firestore, 'members'),
    where('clubId', '==', user.clubId) // 항상 클럽 ID로 필터링
  );
}, [firestore, user?.clubId]);
```

## 11. 보안 규칙

### 11.1 인증/인가 처리
```typescript
// 모든 API 라우트의 보안 처리 표준
export async function POST(request: NextRequest) {
  return withAuthEnhanced(request, async (req) => {
    // 1. 인증 확인
    if (!req.user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }
    
    // 2. 권한 검증
    if (!hasMinimumRole(req.user.role, requiredRole)) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    }
    
    // 3. 비즈니스 로직 실행
    // ...
  });
}
```

### 11.2 감사 로그 규칙
```typescript
// 모든 민감 작업에 감사 로그 기록
await auditService.log({
  action: 'USER_ROLE_CHANGED',
  userId: targetUserId,
  performedBy: req.user.uid,
  details: { oldRole, newRole },
  timestamp: new Date().toISOString()
});
```

## 12. 배포 체크리스트

- [ ] TypeScript 빌드 에러 없음
- [ ] ESLint 경고 해결
- [ ] 테스트 커버리지 목표 달성
- [ ] Firestore Rules 배포
- [ ] Storage Rules 배포
- [ ] 환경 변수 설정 (.env.local)
- [ ] Service Account 설정 (프로덕션)
- [ ] 모니터링 대시보드 확인
- [ ] 보안 감사 완료

## 13. 규칙 준수 모니터링

### 13.1 자동화 도구 설정
```json
// package.json scripts
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest --coverage",
    "quality-check": "npm run lint && npm run type-check && npm run test",
    "pre-commit": "lint-staged && npm run quality-check"
  }
}
```

### 13.2 코드 리뷰 체크리스트
```markdown
## 코드 리뷰 체크리스트

### 기능적 검토
- [ ] 요구사항이 모두 구현되었는가?
- [ ] 엣지 케이스가 처리되었는가?
- [ ] 에러 핸들링이 적절한가?

### 품질 검토
- [ ] TypeScript 타입이 안전한가?
- [ ] 코드가 읽기 쉽고 이해하기 쉬운가?
- [ ] 중복 코드가 없는가?

### 보안 검토
- [ ] 인증/인가가 올바르게 구현되었는가?
- [ ] 민감 데이터가 노출되지 않았는가?
- [ ] SQL/NoSQL 인젝션 방어가 되었는가?

### 성능 검토
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 데이터베이스 쿼리가 최적화되었는가?
- [ ] 번들 크기가 적절한가?

### 테스트 검토
- [ ] 테스트가 충분히 작성되었는가?
- [ ] 테스트가 의도를 명확히 드러내는가?
- [ ] 테스트 커버리지 목표를 달성했는가?
```

이 규칙들은 장기적으로 유지보수가 용이하고 확장 가능한 코드베이스를 구축하기 위한 기준입니다. 모든 개발자는 이 규칙을 준수해야 하며, 규칙 위반 시 자동으로 감지하고 수정하도록 도구를 설정합니다.
