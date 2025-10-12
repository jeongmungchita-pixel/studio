# KGF 넥서스 - 개선사항 상세 분석

> 최종 업데이트: 2025-10-12

---

## 📊 현재 상태 분석

### 전체 완성도: 75%

| 카테고리 | 점수 | 상태 | 설명 |
|---------|------|------|------|
| 타입 시스템 | 90% | ✅ 우수 | TypeScript 잘 활용 |
| 인증/권한 | 85% | ✅ 양호 | Firebase Auth + Rules |
| Firebase 통합 | 80% | ✅ 양호 | Firestore, Functions 연동 |
| 데이터 CRUD | 60% | ⚠️ 개선 필요 | 일부 Mock 데이터 |
| UI 일관성 | 75% | ✅ 양호 | Shadcn/ui 사용 |
| 기능 완성도 | 65% | ⚠️ TODO 많음 | 7개 미완성 |
| 에러 처리 | 50% | 🔴 부족 | alert() 남발 |
| 성능 최적화 | 70% | ✅ 양호 | 기본적인 최적화 |

---

## 🔴 Critical Issues (즉시 수정 필요)

### 1. Mock 데이터 제거

#### 문제
```typescript
// ❌ 나쁜 예
const mockChildren: any[] = [];
const mockApprovals = { ... };
```

#### 영향
- 실제 데이터 표시 안 됨
- 사용자 혼란
- 테스트 불가

#### 해결
```typescript
// ✅ 좋은 예
const childrenQuery = useMemoFirebase(() => {
  if (!firestore || !user) return null;
  return query(
    collection(firestore, 'members'),
    where('guardianIds', 'array-contains', user.uid)
  );
}, [firestore, user]);

const { data: children, isLoading } = useCollection<Member>(childrenQuery);
```

---

### 2. 에러 처리 개선

#### 문제
```typescript
// ❌ 나쁜 예
try {
  await someOperation();
  alert('성공!');
} catch (error) {
  alert('실패!');
}
```

#### 영향
- UX 나쁨
- 에러 원인 파악 어려움
- 모바일에서 alert() 문제

#### 해결
```typescript
// ✅ 좋은 예
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

try {
  await someOperation();
  toast({
    title: '성공',
    description: '작업이 완료되었습니다.',
  });
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    variant: 'destructive',
    title: '오류 발생',
    description: error instanceof Error ? error.message : '알 수 없는 오류',
  });
}
```

---

### 3. 로딩 상태 일관성

#### 문제
```typescript
// ❌ 일부 페이지만 로딩 처리
if (isLoading) {
  return <div>Loading...</div>;
}
```

#### 해결
```typescript
// ✅ 일관된 로딩 컴포넌트
if (isLoading) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
```

---

## 🟡 Important Issues (1-2주 내 수정)

### 4. 데이터 구조 일관성

#### 문제: 컬렉션 구조 혼재

```
현재:
- /members (전역)
- /clubs/{clubId}/members (서브컬렉션) ← 사용 안 함

- /gym_classes (구 이름)
- /classes (새 이름) ← 중복
```

#### 권장 구조
```
✅ 권장:
- /users/{userId} - 사용자 프로필
- /clubs/{clubId} - 클럽 정보
- /members/{memberId} - 모든 회원 (clubId로 필터링)
- /classes/{classId} - 수업 정보
- /competitions/{competitionId} - 대회
- /level_tests/{testId} - 승급 심사
```

#### 마이그레이션 필요
```typescript
// 1. gym_classes → classes 통합
// 2. 서브컬렉션 제거
// 3. clubId 필드 일관성 확보
```

---

### 5. 타입 안정성

#### 문제: Optional 필드 불일치

```typescript
// ❌ 일관성 없음
interface UserProfile {
  clubId?: string; // 어떤 역할은 필수, 어떤 역할은 선택
}

interface Member {
  clubId: string; // 항상 필수
}
```

#### 해결: 역할별 타입 분리

```typescript
// ✅ 명확한 타입
interface BaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface ClubStaffProfile extends BaseUserProfile {
  role: UserRole.CLUB_OWNER | UserRole.CLUB_MANAGER;
  clubId: string; // 필수
}

interface MemberProfile extends BaseUserProfile {
  role: UserRole.MEMBER;
  clubId?: string; // 선택 (승인 전)
}

type UserProfile = ClubStaffProfile | MemberProfile | BaseUserProfile;
```

---

### 6. 쿼리 최적화

#### 문제: 불필요한 전체 조회

```typescript
// ❌ 비효율적
const allMembers = await getDocs(collection(firestore, 'members'));
const myMembers = allMembers.filter(m => m.clubId === user.clubId);
```

#### 해결: 인덱스 활용

```typescript
// ✅ 효율적
const myMembersQuery = query(
  collection(firestore, 'members'),
  where('clubId', '==', user.clubId),
  orderBy('createdAt', 'desc'),
  limit(100)
);
const { data: myMembers } = useCollection(myMembersQuery);
```

---

## 🟢 Nice to Have (장기 개선)

### 7. 캐싱 전략

#### 현재
- Firestore 실시간 리스너만 사용
- 페이지 이동 시 재조회

#### 개선
```typescript
// React Query 도입
import { useQuery } from '@tanstack/react-query';

const { data: clubs } = useQuery({
  queryKey: ['clubs', user?.clubId],
  queryFn: () => getClubs(user?.clubId),
  staleTime: 5 * 60 * 1000, // 5분 캐싱
});
```

---

### 8. 성능 모니터링

#### 도입 필요
- Firebase Performance Monitoring
- Sentry (에러 추적)
- Google Analytics (사용자 행동)

```typescript
// firebase-config.ts
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

---

### 9. 테스트 추가

#### 현재: 테스트 없음

#### 권장
```typescript
// __tests__/hooks/use-user.test.ts
import { renderHook } from '@testing-library/react';
import { useUser } from '@/hooks/use-user';

describe('useUser', () => {
  it('should return user data', () => {
    const { result } = renderHook(() => useUser());
    expect(result.current.user).toBeDefined();
  });
});
```

---

### 10. 접근성 (A11y)

#### 개선 필요
- 키보드 네비게이션
- 스크린 리더 지원
- ARIA 레이블

```typescript
// ✅ 접근성 개선
<button
  aria-label="메뉴 열기"
  aria-expanded={isOpen}
  onClick={toggleMenu}
>
  <Menu />
</button>
```

---

## 📋 체크리스트

### Phase 1: 긴급 (1주)
- [ ] Mock 데이터 제거 (자녀 목록)
- [ ] Mock 데이터 제거 (승인 요청)
- [ ] Mock 데이터 제거 (위원회)
- [ ] 에러 처리 Toast로 변경
- [ ] 로딩 상태 일관성

### Phase 2: 중요 (2-4주)
- [ ] 데이터 구조 정리
- [ ] 타입 안정성 강화
- [ ] 쿼리 최적화
- [ ] SMS 서버 사이드 처리
- [ ] 이용권 갱신 로직

### Phase 3: 장기 (1-3개월)
- [ ] React Query 도입
- [ ] 성능 모니터링
- [ ] 테스트 추가
- [ ] 접근성 개선
- [ ] 문서화 완성

---

## 🎯 우선순위 매트릭스

```
긴급도 ↑
│
│  🔴 Critical        🟡 Important
│  - Mock 제거        - 데이터 구조
│  - 에러 처리        - 타입 안정성
│  - 로딩 상태        - 쿼리 최적화
│
│  🟢 Nice to Have    ⚪ Future
│  - 캐싱             - AI 기능
│  - 모니터링         - 고급 분석
│  - 테스트           - 다국어
│
└────────────────────────────→ 중요도
```

---

## 💡 빠른 승리 (Quick Wins)

### 1시간 안에 할 수 있는 것
1. ✅ 자녀 목록 조회 구현
2. ✅ 가족 구성원 추가 구현
3. ✅ alert() → toast() 변경 (일부)
4. ✅ 로딩 스피너 통일

### 하루 안에 할 수 있는 것
1. ✅ 모든 Mock 데이터 제거
2. ✅ 승인 요청 시스템 완성
3. ✅ 에러 처리 전체 개선
4. ✅ 기본 테스트 추가

---

## 📞 참고 자료

- **타입 정의**: `src/types/index.ts`
- **보안 Rules**: `firestore.rules`
- **Functions**: `functions/src/index.ts`
- **데이터 구조**: `docs/backend.json`
- **TODO 목록**: `docs/TODO.md`

---

**다음 리뷰**: 1주일 후
**목표**: Phase 1 완료 (긴급 항목)
