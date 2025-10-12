# KGF 넥서스 - 전체 데이터 흐름

> 최종 업데이트: 2025-10-12

---

## 🏗️ 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages/     │  │  Components  │  │    Hooks     │     │
│  │   Routes     │  │     (UI)     │  │  (Logic)     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                       │
│                   │ Firebase Context │                       │
│                   │   (Provider)     │                       │
│                   └────────┬────────┘                       │
└────────────────────────────┼──────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Firebase SDK   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
   │  Auth   │        │ Firestore │       │ Storage │
   └────┬────┘        └─────┬─────┘       └────┬────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Firebase    │
                    │   Backend     │
                    └───────────────┘
```

---

## 🔐 1. 인증 흐름 (Authentication Flow)

### 1.1 로그인 프로세스

```typescript
// 1. 사용자가 로그인 시도
/app/login/page.tsx
  ↓
signInWithEmailAndPassword(auth, email, password)
  ↓
// 2. Firebase Auth 인증
Firebase Auth
  ↓
// 3. onAuthStateChanged 트리거
/hooks/use-user.tsx → useUser()
  ↓
// 4. Firestore에서 사용자 프로필 조회
getDoc(firestore, 'users', uid)
  ↓
// 5. 클럽 오너/매니저인 경우 clubId 조회
query(firestore, 'clubs', where('name', '==', clubName))
  ↓
// 6. 통합된 User 객체 생성
User & UserProfile & { clubId?: string }
  ↓
// 7. 전역 상태로 제공
useUser() → { user, isUserLoading }
```

### 1.2 사용자 프로필 구조

```typescript
interface CombinedUser {
  // Firebase Auth (User)
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  
  // Firestore UserProfile
  id: string;
  role: UserRole;
  provider: 'email' | 'google';
  status: 'pending' | 'approved' | 'rejected';
  clubName?: string;
  
  // 동적으로 추가
  clubId?: string; // 클럽 오너/매니저인 경우
}
```

---

## 📊 2. 데이터 조회 흐름 (Data Fetching Flow)

### 2.1 실시간 데이터 구독 패턴

```typescript
// 1. 컴포넌트에서 쿼리 생성 (메모이제이션 필수!)
const membersQuery = useMemoFirebase(() => {
  if (!firestore || !user?.clubId) return null;
  return query(
    collection(firestore, 'members'),
    where('clubId', '==', user.clubId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
}, [firestore, user?.clubId]);

// 2. useCollection Hook으로 구독
const { data: members, isLoading, error } = useCollection<Member>(membersQuery);

// 3. 내부 동작
useCollection()
  ↓
onSnapshot(query, callback)  // Firestore 실시간 리스너
  ↓
snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
  ↓
setData(results)  // 상태 업데이트
  ↓
컴포넌트 리렌더링
```

### 2.2 데이터 흐름 다이어그램

```
Component
    │
    ├─ useMemoFirebase()  ← 쿼리 메모이제이션
    │       │
    │       └─ query(collection, where, orderBy)
    │
    ├─ useCollection<T>(query)
    │       │
    │       ├─ onSnapshot() ← Firestore 실시간 리스너
    │       │       │
    │       │       ├─ 데이터 변경 감지
    │       │       └─ callback 실행
    │       │
    │       ├─ setData()  ← 상태 업데이트
    │       └─ setIsLoading(false)
    │
    └─ Render with data
```

---

## ✍️ 3. 데이터 생성/수정 흐름 (CRUD Operations)

### 3.1 데이터 생성 (Create)

```typescript
// 예시: 회원 추가
async function addMember(memberData: Omit<Member, 'id'>) {
  // 1. Firestore 참조 생성
  const memberRef = doc(collection(firestore, 'members'));
  
  // 2. 데이터 준비
  const newMember: Member = {
    id: memberRef.id,
    ...memberData,
    createdAt: new Date().toISOString(),
  };
  
  // 3. Firestore에 저장
  await setDoc(memberRef, newMember);
  
  // 4. 실시간 리스너가 자동으로 업데이트 감지
  // → useCollection이 자동으로 새 데이터 반영
}
```

### 3.2 데이터 수정 (Update)

```typescript
// 예시: 회원 상태 변경
async function updateMemberStatus(memberId: string, status: string) {
  // 1. 문서 참조
  const memberRef = doc(firestore, 'members', memberId);
  
  // 2. 부분 업데이트
  await updateDoc(memberRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
  
  // 3. 실시간 리스너가 자동 업데이트
}
```

### 3.3 데이터 삭제 (Delete)

```typescript
// 예시: 회원 삭제
async function deleteMember(memberId: string) {
  const memberRef = doc(firestore, 'members', memberId);
  await deleteDoc(memberRef);
  // 실시간 리스너가 자동으로 UI에서 제거
}
```

---

## 🔄 4. 상태 관리 패턴

### 4.1 전역 상태 (Global State)

```typescript
// Firebase Context를 통한 전역 상태
FirebaseProvider (layout.tsx)
    │
    ├─ FirebaseContext
    │   ├─ firebaseApp
    │   ├─ firestore
    │   ├─ auth
    │   └─ storage
    │
    └─ 모든 하위 컴포넌트에서 접근 가능
        ├─ useFirestore()
        ├─ useAuth()
        ├─ useStorage()
        └─ useUser()
```

### 4.2 로컬 상태 (Local State)

```typescript
// 각 컴포넌트에서 useState 사용
const [isSubmitting, setIsSubmitting] = useState(false);
const [selectedMember, setSelectedMember] = useState<Member | null>(null);

// 또는 useCollection으로 자동 관리
const { data, isLoading, error } = useCollection<Member>(query);
```

### 4.3 폼 상태 (Form State)

```typescript
// React Hook Form 사용 (일부 페이지)
const { register, handleSubmit, formState: { errors } } = useForm();

// 또는 직접 상태 관리
const [formData, setFormData] = useState({
  name: '',
  email: '',
  // ...
});
```

---

## 🎯 5. 주요 데이터 흐름 시나리오

### 5.1 회원 등록 플로우

```
1. 사용자가 /register/member 접속
   ↓
2. 클럽 목록 조회 (useCollection)
   query(collection(firestore, 'clubs'))
   ↓
3. 폼 작성 및 제출
   ↓
4. memberRequests 컬렉션에 저장
   addDoc(collection(firestore, 'memberRequests'), data)
   ↓
5. 클럽 오너가 /club-dashboard/approvals에서 확인
   useCollection(query(memberRequests, where('clubId', '==', clubId)))
   ↓
6. 승인 시:
   - members 컬렉션에 추가
   - memberRequests 상태 업데이트
   ↓
7. 실시간 리스너가 자동으로 UI 업데이트
```

### 5.2 이용권 갱신 플로우

```
1. 회원이 /my-profile에서 이용권 갱신 요청
   ↓
2. pass_renewal_requests 생성
   addDoc(collection(firestore, 'pass_renewal_requests'), {
     memberId,
     passTemplateId,
     status: 'pending'
   })
   ↓
3. 클럽 오너가 /club-dashboard/approvals에서 승인
   ↓
4. 승인 시:
   - member_passes 생성 (status: 'pending')
   - payments 생성
   ↓
5. 결제 승인 시 (/club-dashboard/payments):
   - member_passes.status = 'active'
   - member_passes.startDate = now
   - members.activePassId = passId
   ↓
6. 실시간 업데이트로 회원 화면에 반영
```

### 5.3 출석 체크 플로우

```
1. 코치가 /club-dashboard/class-status 접속
   ↓
2. 수업 목록 조회
   useCollection(query(classes, where('clubId', '==', clubId)))
   ↓
3. 수업 선택 → 회원 목록 표시
   useCollection(query(members, where('classId', '==', classId)))
   ↓
4. 출석 상태 변경
   - attendance 문서 생성/업데이트
   - member_passes.remainingSessions 감소
   - member_passes.attendanceCount 증가
   ↓
5. 배치 작업으로 한 번에 처리
   writeBatch(firestore)
   ↓
6. 실시간 업데이트
```

---

## 🔒 6. 보안 및 권한 흐름

### 6.1 Firestore Rules 검증

```
Client Request
    ↓
Firestore Rules 검증
    ├─ request.auth != null  (인증 확인)
    ├─ request.auth.uid == resource.data.userId  (소유권 확인)
    └─ get(/databases/.../users/$(request.auth.uid)).data.role == 'CLUB_OWNER'
    ↓
허용/거부
```

### 6.2 클라이언트 권한 체크

```typescript
// useUser Hook에서 role 확인
const { user } = useUser();

// 조건부 렌더링
{user?.role === UserRole.CLUB_OWNER && (
  <AdminPanel />
)}

// 또는 페이지 레벨 보호
if (!user || user.role !== UserRole.CLUB_OWNER) {
  redirect('/dashboard');
}
```

---

## 📡 7. 실시간 업데이트 메커니즘

### 7.1 onSnapshot 리스너

```typescript
// Firestore의 실시간 리스너
onSnapshot(query, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // 새 문서 추가
    }
    if (change.type === 'modified') {
      // 문서 수정
    }
    if (change.type === 'removed') {
      // 문서 삭제
    }
  });
});
```

### 7.2 자동 UI 업데이트

```
Firestore 데이터 변경
    ↓
onSnapshot 콜백 실행
    ↓
useState 업데이트
    ↓
React 리렌더링
    ↓
UI 자동 업데이트
```

---

## 🎨 8. 컴포넌트 데이터 흐름 예시

### 8.1 회원 목록 페이지

```typescript
// /app/members/page.tsx

export default function MembersPage() {
  // 1. Firebase 서비스 가져오기
  const firestore = useFirestore();
  
  // 2. 쿼리 메모이제이션
  const membersQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'members') : null,
    [firestore]
  );
  
  // 3. 실시간 데이터 구독
  const { data: members, isLoading } = useCollection<Member>(membersQuery);
  
  // 4. 로딩 상태 처리
  if (isLoading) return <LoadingSpinner />;
  
  // 5. 데이터 렌더링
  return (
    <div>
      {members?.map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
```

### 8.2 데이터 흐름 순서

```
1. 컴포넌트 마운트
   ↓
2. useFirestore() → Firestore 인스턴스 가져오기
   ↓
3. useMemoFirebase() → 쿼리 메모이제이션
   ↓
4. useCollection() → 실시간 리스너 시작
   ↓
5. isLoading = true
   ↓
6. Firestore에서 데이터 가져오기
   ↓
7. onSnapshot 콜백 실행
   ↓
8. setData(results)
   ↓
9. isLoading = false
   ↓
10. 컴포넌트 리렌더링 (데이터 표시)
```

---

## 🔄 9. 에러 처리 흐름

### 9.1 Firestore 권한 에러

```typescript
useCollection()
  ↓
onSnapshot() 에러 발생
  ↓
FirestorePermissionError 생성
  ↓
setError(contextualError)
  ↓
컴포넌트에서 error 상태 확인
  ↓
사용자에게 에러 메시지 표시
```

### 9.2 Toast 알림

```typescript
try {
  await updateDoc(memberRef, data);
  toast({
    title: '성공',
    description: '회원 정보가 업데이트되었습니다.',
  });
} catch (error) {
  toast({
    variant: 'destructive',
    title: '오류 발생',
    description: '업데이트에 실패했습니다.',
  });
}
```

---

## 📝 10. 데이터 흐름 최적화

### 10.1 메모이제이션

```typescript
// ✅ 올바른 사용
const query = useMemoFirebase(() => {
  if (!firestore) return null;
  return query(collection(firestore, 'members'));
}, [firestore]);

// ❌ 잘못된 사용 (무한 루프 발생!)
const query = query(collection(firestore, 'members'));
```

### 10.2 조건부 쿼리

```typescript
// clubId가 있을 때만 쿼리 실행
const membersQuery = useMemoFirebase(() => {
  if (!firestore || !user?.clubId) return null;
  return query(
    collection(firestore, 'members'),
    where('clubId', '==', user.clubId)
  );
}, [firestore, user?.clubId]);
```

### 10.3 페이지네이션

```typescript
// limit()으로 데이터 양 제한
const query = query(
  collection(firestore, 'members'),
  orderBy('createdAt', 'desc'),
  limit(50)  // 한 번에 50개만
);
```

---

## 🎯 요약

### 핵심 데이터 흐름

1. **인증**: Firebase Auth → useUser() → 전역 상태
2. **조회**: useMemoFirebase() → useCollection() → 실시간 구독
3. **생성/수정**: setDoc/updateDoc → Firestore → 자동 UI 업데이트
4. **권한**: Firestore Rules + 클라이언트 체크
5. **에러**: try-catch + Toast 알림

### 주요 Hook

- `useUser()` - 인증된 사용자 정보
- `useFirestore()` - Firestore 인스턴스
- `useCollection<T>()` - 실시간 데이터 구독
- `useMemoFirebase()` - 쿼리 메모이제이션
- `useToast()` - 사용자 알림

---

**참고 문서**:
- `docs/DATA_STRUCTURE.md` - 데이터 스키마
- `docs/PERFORMANCE.md` - 성능 최적화
- `src/firebase/` - Firebase 관련 코드
