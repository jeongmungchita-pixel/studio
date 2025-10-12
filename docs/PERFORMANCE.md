# KGF 넥서스 - 성능 최적화 가이드

> 최종 업데이트: 2025-10-12

---

## 📊 성능 최적화 전략

### 1. Firestore 쿼리 최적화

#### ✅ 좋은 예시

```typescript
// 인덱스를 활용한 효율적인 쿼리
const membersQuery = query(
  collection(firestore, 'members'),
  where('clubId', '==', user.clubId),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(50) // 페이지네이션
);
```

#### ❌ 나쁜 예시

```typescript
// 전체 조회 후 필터링 (비효율적)
const allMembers = await getDocs(collection(firestore, 'members'));
const filtered = allMembers.docs
  .filter(doc => doc.data().clubId === user.clubId)
  .filter(doc => doc.data().status === 'active');
```

---

### 2. 인덱스 전략

#### 복합 인덱스가 필요한 경우

1. **여러 필드로 필터링**
```typescript
where('clubId', '==', clubId) + where('status', '==', 'active')
```

2. **필터링 + 정렬**
```typescript
where('clubId', '==', clubId) + orderBy('createdAt', 'desc')
```

3. **배열 필터링 + 정렬**
```typescript
where('guardianIds', 'array-contains', uid) + orderBy('createdAt', 'desc')
```

#### 인덱스 배포

```bash
# 인덱스 배포
firebase deploy --only firestore:indexes

# 인덱스 확인
firebase firestore:indexes
```

---

### 3. 데이터 로딩 전략

#### 페이지네이션

```typescript
// 첫 페이지
const firstQuery = query(
  collection(firestore, 'members'),
  where('clubId', '==', clubId),
  orderBy('createdAt', 'desc'),
  limit(20)
);

// 다음 페이지
const nextQuery = query(
  collection(firestore, 'members'),
  where('clubId', '==', clubId),
  orderBy('createdAt', 'desc'),
  startAfter(lastDoc),
  limit(20)
);
```

#### 실시간 리스너 최적화

```typescript
// ✅ 필요한 데이터만 구독
const unsubscribe = onSnapshot(
  query(
    collection(firestore, 'members'),
    where('clubId', '==', clubId),
    limit(50)
  ),
  (snapshot) => {
    // 변경된 문서만 처리
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        // 추가된 문서 처리
      }
      if (change.type === 'modified') {
        // 수정된 문서 처리
      }
      if (change.type === 'removed') {
        // 삭제된 문서 처리
      }
    });
  }
);

// 컴포넌트 언마운트 시 구독 해제
return () => unsubscribe();
```

---

### 4. 캐싱 전략

#### React Query 도입 (권장)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 데이터 조회 with 캐싱
const { data: members } = useQuery({
  queryKey: ['members', clubId],
  queryFn: () => getMembers(clubId),
  staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  cacheTime: 10 * 60 * 1000, // 10분간 메모리 유지
});

// 데이터 변경 후 캐시 무효화
const mutation = useMutation({
  mutationFn: updateMember,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
  },
});
```

#### 로컬 스토리지 캐싱

```typescript
// 자주 변경되지 않는 데이터 캐싱
const CACHE_KEY = 'club_info';
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

function getCachedClubInfo(clubId: string) {
  const cached = localStorage.getItem(`${CACHE_KEY}_${clubId}`);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  return null;
}

function setCachedClubInfo(clubId: string, data: any) {
  localStorage.setItem(
    `${CACHE_KEY}_${clubId}`,
    JSON.stringify({ data, timestamp: Date.now() })
  );
}
```

---

### 5. 이미지 최적화

#### Next.js Image 컴포넌트 사용

```typescript
import Image from 'next/image';

// ✅ 최적화된 이미지
<Image
  src={photoURL}
  alt="Profile"
  width={200}
  height={200}
  quality={75}
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>

// ❌ 최적화되지 않은 이미지
<img src={photoURL} alt="Profile" />
```

#### Firebase Storage 이미지 리사이징

```typescript
// Storage에 업로드 시 여러 크기 생성
const sizes = [
  { name: 'thumbnail', width: 150 },
  { name: 'medium', width: 500 },
  { name: 'large', width: 1200 },
];

// Cloud Functions에서 자동 리사이징 처리
```

---

### 6. 번들 크기 최적화

#### 동적 임포트

```typescript
// ✅ 필요할 때만 로드
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

// ❌ 모든 페이지에서 로드
import HeavyComponent from './HeavyComponent';
```

#### Tree Shaking

```typescript
// ✅ 필요한 것만 임포트
import { Button } from '@/components/ui/button';

// ❌ 전체 라이브러리 임포트
import * as UI from '@/components/ui';
```

---

### 7. 성능 측정

#### Firebase Performance Monitoring

```typescript
import { measureTrace, measureQuery } from '@/lib/performance';

// 커스텀 트레이스
await measureTrace('load_dashboard', async () => {
  // 대시보드 로드 로직
});

// 쿼리 성능 측정
const members = await measureQuery('get_members', () =>
  getDocs(membersQuery)
);
```

#### React Profiler

```typescript
import { Profiler } from 'react';

<Profiler
  id="MembersList"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} (${phase}) took ${actualDuration}ms`);
  }}
>
  <MembersList />
</Profiler>
```

---

### 8. 메모이제이션

#### useMemo

```typescript
// 비용이 큰 계산 메모이제이션
const sortedMembers = useMemo(() => {
  return members?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [members]);
```

#### useCallback

```typescript
// 함수 메모이제이션
const handleMemberClick = useCallback((memberId: string) => {
  router.push(`/members/${memberId}`);
}, [router]);
```

#### React.memo

```typescript
// 컴포넌트 메모이제이션
const MemberCard = React.memo(({ member }: { member: Member }) => {
  return <Card>{member.name}</Card>;
});
```

---

### 9. 데이터베이스 설계 최적화

#### 비정규화 (Denormalization)

```typescript
// ✅ 자주 함께 조회되는 데이터는 중복 저장
interface Member {
  id: string;
  name: string;
  clubId: string;
  clubName: string; // 중복 저장 (조인 방지)
}

// ❌ 매번 조인 필요
interface Member {
  id: string;
  name: string;
  clubId: string; // clubName을 얻으려면 clubs 컬렉션 조회 필요
}
```

#### 집계 데이터 미리 계산

```typescript
// ✅ 집계 데이터 저장
interface Club {
  id: string;
  name: string;
  memberCount: number; // 미리 계산된 값
  activePassCount: number;
}

// Cloud Functions로 자동 업데이트
export const updateClubStats = functions.firestore
  .document('members/{memberId}')
  .onWrite(async (change, context) => {
    // memberCount 업데이트
  });
```

---

### 10. 네트워크 최적화

#### 오프라인 지원

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// 오프라인 캐싱 활성화
enableIndexedDbPersistence(firestore)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.log('Browser not supported');
    }
  });
```

#### 배치 작업

```typescript
// ✅ 배치로 한 번에 처리
const batch = writeBatch(firestore);
members.forEach((member) => {
  const ref = doc(firestore, 'members', member.id);
  batch.update(ref, { status: 'active' });
});
await batch.commit();

// ❌ 개별 업데이트
for (const member of members) {
  await updateDoc(doc(firestore, 'members', member.id), {
    status: 'active',
  });
}
```

---

## 📈 성능 목표

### 현재 상태
- 첫 페이지 로드: ~2초
- Firestore 쿼리: ~500ms
- 이미지 로드: ~1초

### 목표
- 첫 페이지 로드: <1초
- Firestore 쿼리: <200ms
- 이미지 로드: <500ms

---

## 🔍 모니터링 도구

1. **Firebase Performance Monitoring**
   - 자동 성능 추적
   - 커스텀 트레이스

2. **Lighthouse**
   - 웹 성능 점수
   - 접근성 점수

3. **Chrome DevTools**
   - Network 탭
   - Performance 탭
   - React Profiler

---

## 📝 체크리스트

### 쿼리 최적화
- [x] 복합 인덱스 생성
- [x] 페이지네이션 구현
- [x] limit() 사용
- [ ] React Query 도입

### 성능 모니터링
- [x] Firebase Performance 설정
- [ ] Lighthouse 점수 측정
- [ ] 성능 대시보드 구축

### 코드 최적화
- [x] useMemo/useCallback 사용
- [x] 동적 임포트
- [ ] 번들 분석

---

**참고 문서**:
- `docs/DATA_STRUCTURE.md` - 데이터 구조
- `firestore.indexes.json` - 인덱스 정의
- `src/lib/performance.ts` - 성능 측정 유틸리티
