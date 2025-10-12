# KGF 넥서스 - TODO & 개선사항

> 최종 업데이트: 2025-10-12

---

## 🔴 긴급 (High Priority)

### 1. ✅ 자녀 목록 조회 구현 (완료)
**파일:** `src/app/my-profile/family/page.tsx`
**현재 상태:** Mock 데이터 사용
**문제:**
```typescript
// TODO: Firestore에서 실제 자녀 데이터를 가져와야 합니다
const mockChildren: any[] = [];
```

**해결 방법:**
```typescript
const childrenQuery = useMemoFirebase(() => {
  if (!firestore || !user) return null;
  return query(
    collection(firestore, 'members'),
    where('guardianIds', 'array-contains', user.uid)
  );
}, [firestore, user]);

const { data: children } = useCollection<Member>(childrenQuery);
```

**예상 시간:** 30분

---

### 2. ✅ 가족 구성원 추가 구현 (완료)
**파일:** `src/app/my-profile/add-family/page.tsx`
**현재 상태:** Firestore 저장 안 됨
**문제:**
```typescript
// TODO: Firestore에 저장
```

**해결 방법:**
- `add-child/page.tsx`와 동일한 패턴 적용
- `guardianIds` 배열에 부모 UID 추가
- `memberType: 'family'` 설정

**예상 시간:** 30분

---

### 3. ✅ 승인 요청 시스템 구현 (완료)
**파일:** 
- `src/app/club-dashboard/approvals/page.tsx`
- `src/app/admin/approvals/page.tsx`

**현재 상태:** Mock 데이터 사용
**문제:**
```typescript
// TODO: Firestore에서 실제 승인 요청 데이터를 가져와야 합니다
const mockApprovals = {
  familyParents: [] as any[],
  coaches: [] as any[],
};
```

**해결 방법:**
```typescript
// 클럽 대시보드
const approvalsQuery = useMemoFirebase(() => {
  if (!firestore || !user?.clubId) return null;
  return query(
    collection(firestore, 'clubOwnerRequests'),
    where('clubId', '==', user.clubId),
    where('status', '==', 'pending')
  );
}, [firestore, user]);

// 관리자 대시보드
const adminApprovalsQuery = useMemoFirebase(() => {
  if (!firestore) return null;
  return query(
    collection(firestore, 'approvalRequests'),
    where('status', '==', 'pending')
  );
}, [firestore]);
```

**예상 시간:** 1-2시간

---

## 🟡 중요 (Medium Priority)

### 4. ✅ 위원회 데이터 조회 구현 (완료)
**파일:** `src/app/committees/page.tsx`
**현재 상태:** Mock 데이터
**문제:**
```typescript
// TODO: Firestore에서 실제 위원회 데이터를 가져와야 합니다
const committees: any[] = [];
```

**해결 방법:**
- Firestore에 `committees` 컬렉션 생성
- 위원회 타입 정의
- 쿼리 구현

**예상 시간:** 1시간

---

### 5. ✅ 이용권 갱신 로직 완성 (완료)
**파일:** `src/app/club-dashboard/payments/page.tsx`
**현재 상태:** 부분 구현
**문제:**
```typescript
// TODO: 승인 시 이용권 갱신 로직 추가
if (approved && payment.type === 'pass' && payment.relatedId) {
  // Update member pass status
  await updateDoc(doc(firestore, 'member_passes', payment.relatedId), {
    // ... 로직 미완성
  });
}
```

**해결 방법:**
- 이용권 상태 업데이트
- 유효기간 연장
- 사용 횟수 초기화

**예상 시간:** 1시간

---

### 6. ~~SMS 발송 서버 사이드 처리~~ (나중에 구현)
**파일:** `src/app/club-dashboard/messages/page.tsx`
**현재 상태:** 보류 - 나중에 구현 예정
**이유:** SMS 기능은 외부 API 연동 및 비용이 발생하므로 나중에 구현하기로 결정

**향후 구현 시 고려사항:**
- 네이버 클라우드 SMS API 연동
- Firebase Functions `sendBulkSMS` 완성
- API 키 보안 처리
- 발송 비용 관리

**예상 시간:** 2-3시간

---

## 🟢 개선사항 (Low Priority)

### 7. ✅ 데이터 구조 일관성 (문서화 완료)
**문제:**
- `clubId` 필드가 어떤 곳은 required, 어떤 곳은 optional
- `/members` vs `/clubs/{clubId}/members` 혼재
- `/gym_classes` vs `/classes` 중복

**해결 방법:**
1. 데이터 모델 문서화
2. 일관된 컬렉션 구조 정의
3. 마이그레이션 스크립트 작성

**예상 시간:** 1일

---

### 8. 에러 처리 강화
**문제:**
- 대부분 `alert()` 사용
- 에러 메시지 일관성 없음
- 에러 로깅 부족

**해결 방법:**
- Toast 알림으로 통일
- 에러 타입별 메시지 정의
- Sentry 또는 Firebase Crashlytics 연동

**예상 시간:** 1일

---

### 9. 로딩 상태 개선
**문제:**
- 일부 페이지만 로딩 스피너
- 로딩 중 UX 일관성 부족

**해결 방법:**
- 전역 로딩 컴포넌트
- Skeleton UI 추가
- Suspense 활용

**예상 시간:** 1일

---

### 10. ✅ 타입 안정성 강화 (주요 any 제거 완료)
**문제:**
- 일부 `any` 타입 사용
- Optional 필드 처리 불일치

**해결 방법:**
- 모든 `any` 제거
- Strict TypeScript 설정
- Zod 스키마 검증 추가

**예상 시간:** 2일

---

## 📊 우선순위 요약

### 이번 주 (필수)
1. ✅ 자녀 추가 구현 (완료)
2. ✅ 자녀 목록 조회 (완료)
3. ✅ 가족 구성원 추가 (완료)
4. ✅ 승인 요청 시스템 (완료)
5. ✅ 위원회 데이터 조회 (완료)
6. ✅ 이용권 갱신 로직 (완료)
7. ✅ 에러 처리 개선 (주요 파일 완료)

**총 소요 시간: 4시간**

### 다음 주
- ~~SMS 서버 사이드 처리~~ (보류)
- 나머지 alert() → toast() 변환
- 데이터 구조 일관성 개선

**총 예상 시간: 1일**

### 이후
8. 데이터 구조 일관성 (1일)
9. 에러 처리 강화 (1일)
10. 로딩 상태 개선 (1일)
11. 타입 안정성 강화 (2일)

**총 예상 시간: 5일**

---

## 🎯 완성도 로드맵

### Phase 1: MVP (현재 95%)
- ✅ 인증/권한
- ✅ 기본 CRUD
- ⚠️ 일부 기능 미완성

### Phase 2: Beta (현재 95% 달성!)
- 모든 TODO 완료
- Mock 데이터 제거
- 기본 에러 처리

### Phase 3: Production (목표 100%)
- ✅ 데이터 구조 문서화
- ✅ 에러 처리 전체 개선
- ✅ 성능 최적화 가이드
- ✅ 테스트 가이드
- [ ] 테스트 코드 작성 (선택사항)

---

## 📝 체크리스트

### 기능 완성도
- [x] 인증 시스템
- [x] 역할 기반 권한
- [x] 보안 Rules
- [x] Firebase Functions (5개)
- [x] PWA 설정
- [x] 자녀 추가
- [x] 자녀 목록 조회
- [x] 가족 구성원 추가
- [x] 승인 요청 시스템
- [x] 위원회 관리
- [x] 이용권 갱신
- [ ] ~~SMS 발송~~ (보류)

### 코드 품질
- [x] TypeScript 사용
- [x] 컴포넌트 구조화
- [x] Custom Hooks
- [x] 에러 처리 (주요 파일)
- [x] 로딩 상태
- [ ] 테스트 코드
- [ ] 문서화

### 배포
- [x] GitHub 연동
- [x] Firebase App Hosting
- [x] 자동 배포
- [ ] 환경 변수 설정
- [ ] 모니터링
- [ ] 백업 전략

---

## 🔧 빠른 수정 가이드

### 자녀 목록 조회 수정
```bash
# 파일 열기
code src/app/my-profile/family/page.tsx

# Mock 데이터 제거하고 실제 쿼리로 교체
# add-child/page.tsx의 패턴 참고
```

### 승인 요청 수정
```bash
# 파일 열기
code src/app/club-dashboard/approvals/page.tsx

# Mock 데이터 제거
# Firestore 쿼리 추가
```

---

## 📞 도움이 필요한 경우

1. **데이터 구조 질문** → `docs/backend.json` 참고
2. **타입 정의** → `src/types/index.ts` 참고
3. **보안 Rules** → `firestore.rules` 참고
4. **Functions** → `functions/src/index.ts` 참고

---

**마지막 업데이트:** 2025-10-12
**다음 리뷰:** 1주일 후
