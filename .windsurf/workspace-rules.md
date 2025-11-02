# Federation 워크스페이스 룰
첫번째 원칙 : 토큰사용량을 지정해주면 지정사용량까지 
두번째 아래원칙을 따른다 

{
  "cascade": {
    "turboMode": {
      "value": true,
      "locked": true
    },
    "autoConfirmEdits": {
      "value": true,
      "locked": true
    },
    "fastContextAgent": {
      "value": true,
      "locked": true
    },
    "toolInvocationLimit": {
      "value": 15,
      "locked": true
    },
    "commands": {
      "allowList": {
        "value": ["npm", "vitest", "git"],
        "locked": true
      },
      "denyList": {
        "value": ["rm", "shutdown", "reboot"],
        "locked": true
      }
    }
  },
  "agentPolicy": {
    "askBeforeWrite": {
      "value": false,
      "locked": true
    }
  },
  "testing": {
    "coverageMode": {
      "value": "full",
      "locked": true
    }
  },
  "search": {
    "maxWorkspaceFileCount": {
      "value": 0,
      "locked": true
    }
  },
  "editor": {
    "inlineSuggest": {
      "value": true,
      "locked": true
    },
    "maxTokenizationLineLength": {
      "value": 20000,
      "locked": true
    }
  },
  "files": {
    "autoSave": {
      "value": "onFocusChange",
      "locked": true
    }
  }
}
## 1. 아키텍처 원칙

### 1.1 읽기/쓰기 분리
- **읽기**: 클라이언트에서 Firestore SDK 직접 사용 허용
- **쓰기 (민감한 작업)**: 반드시 Admin SDK API 경유
  - 회원 가입 승인/거부
  - 사용자 상태 변경 (active/pending/inactive)
  - 권한(role) 변경
  - 클럽 소속 변경
  - 이용권 발급/취소

### 1.2 계층적 권한 구조
```typescript
SUPER_ADMIN
  └─ FEDERATION_ADMIN
      └─ CLUB_OWNER
          └─ CLUB_MANAGER
              └─ HEAD_COACH
                  └─ ASSISTANT_COACH
                      └─ MEMBER/PARENT
```

## 2. 코딩 컨벤션

### 2.1 변수명 규칙
- Firebase Auth의 `UserCredential.user`는 그대로 유지
- `useUser()` hook에서 반환하는 사용자 정보는 `_user` 사용
- 이벤트 핸들러의 event는 `_event` 사용
- Date 객체는 `_today`, `_now` 등 언더스코어 prefix 사용

### 2.2 Firebase 쿼리 패턴
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

### 2.3 타입 정의
```typescript
// 도메인별 타입 분리
import { UserProfile } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
```

## 3. API 패턴

### 3.1 Admin API 엔드포인트 구조
```typescript
// /api/admin/[domain]/[action]/route.ts
export async function POST(request: Request) {
  try {
    // 1. 인증 확인
    const authResult = await withAuth(request);
    
    // 2. 권한 검증
    if (!isClubStaff(authResult.user)) {
      return unauthorizedResponse();
    }
    
    // 3. 트랜잭션 처리
    await db.runTransaction(async (transaction) => {
      // 작업 수행
    });
    
    // 4. 감사 로그
    await logAuditEvent({...});
    
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 3.2 API 클라이언트 사용
```typescript
import { adminAPI } from '@/utils/api-client';

// 사용 예시
const result = await adminAPI.approvals.approveAdult(requestId);
```

## 4. Firestore Rules 정책

### 4.1 민감 필드 차단
```javascript
// users 컬렉션의 민감 필드
const sensitiveFields = ['status', 'role', 'linkedMemberId', 'clubId', 'clubName'];

// members 컬렉션의 민감 필드
const memberSensitiveFields = ['status', 'userId', 'clubId', 'guardianUserIds'];
```

### 4.2 승인 요청 컬렉션
- 모든 쓰기 작업은 API 전용
- 읽기는 관리자, 스태프, 본인만 가능

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

## 6. 에러 처리

### 6.1 Firebase 에러
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

### 6.2 API 에러
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

## 7. 성능 최적화

### 7.1 캐싱 전략
- 사용자 프로필: 5분 TTL
- 클럽 정보: 30분 TTL
- 멤버 목록: 10분 TTL
- API 응답: 1분 TTL

### 7.2 레이트 리미팅
- strictRateLimit: 5분당 10개 (민감한 작업)
- standardRateLimit: 15분당 100개 (일반 API)
- lenientRateLimit: 15분당 500개 (읽기)

## 8. 테스트 전략

### 8.1 Firestore Rules 테스트
```typescript
// @firebase/rules-unit-testing 사용
describe('Firestore Rules', () => {
  it('should allow read for authenticated user', async () => {
    // 테스트 코드
  });
});
```

### 8.2 API 테스트
```typescript
// MSW (Mock Service Worker) 사용
import { rest } from 'msw';
import { setupServer } from 'msw/node';
```

## 9. 배포 체크리스트

- [ ] TypeScript 빌드 에러 없음
- [ ] ESLint 경고 해결
- [ ] Firestore Rules 배포
- [ ] Storage Rules 배포
- [ ] 환경 변수 설정 (.env.local)
- [ ] Service Account 설정 (프로덕션)
- [ ] 모니터링 대시보드 확인

## 10. 도메인별 구조

```
src/
├── domains/
│   ├── member/
│   │   ├── components/
│   │   ├── utils/
│   │   └── hooks/
│   ├── club/
│   ├── event/
│   └── finance/
├── services/
│   ├── auth-service.ts
│   ├── navigation-manager.ts
│   └── audit-service.ts
└── constants/
    ├── routes.ts
    ├── roles.ts
    └── config.ts
```
