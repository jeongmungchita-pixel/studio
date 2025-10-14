# 재무관리 시스템 업데이트

> 업데이트일: 2025-10-15

---

## ✅ 추가된 기능

### 1. 회원 분류별 결제 관리
- **탭 필터**: 전체/성인/주니어로 구분
- **분류별 통계**: 각 분류의 입금 대기/완료/총액 표시
- **회원 배지**: 모든 결제 내역에 회원 분류 배지 표시

### 2. 수입/지출 직접 관리
- **수입 추가**: 회원권, 이벤트, 시합, 후원금, 기타
- **지출 추가**: 시설 임대료, 장비, 급여, 공과금, 마케팅, 유지보수, 기타
- **상세 입력**: 카테고리, 금액, 설명, 날짜

### 3. 수입 분할 기능
- **분할 처리**: 2~12개월로 수입 분할
- **자동 계산**: 월별 금액 자동 계산 (나머지는 첫 달에 포함)
- **분할 표시**: "분할 1/5" 배지로 명확히 표시

### 4. 분할 되돌리기
- **원본 복원**: 분할 취소 시 원본 거래 복원
- **일괄 처리**: 모든 분할 거래 한 번에 취소

---

## 📊 데이터 구조

### FinancialTransaction (신규)
```typescript
export interface FinancialTransaction {
  id: string;
  clubId: string;
  type: 'income' | 'expense';
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string;
  
  // 분할 관련
  isSplit?: boolean;
  splitMonths?: number;
  splitParentId?: string;
  splitIndex?: number;
  
  // 메타데이터
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  
  // 취소/되돌리기
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
}
```

### TransactionCategory (신규)
```typescript
export type TransactionCategory = 
  // 수입
  | 'membership_fee'
  | 'event_fee'
  | 'competition_fee'
  | 'sponsorship'
  | 'other_income'
  // 지출
  | 'facility_rent'
  | 'equipment'
  | 'salary'
  | 'utility'
  | 'marketing'
  | 'maintenance'
  | 'other_expense';
```

---

## 🎨 UI/UX 개선

### 색상 체계
- **전체**: 기본 색상
- **성인**: 파란색 (text-blue-600)
- **주니어**: 초록색 (text-green-600)
- **수입**: 초록색 (text-green-600)
- **지출**: 빨간색 (text-red-600)

### 아이콘
- **성인**: User
- **주니어**: Baby
- **전체**: Users
- **수입**: TrendingUp
- **지출**: TrendingDown
- **분할**: Split
- **되돌리기**: Undo2

---

## 💡 사용 시나리오

### 시나리오 1: 후원금 수입 등록 및 분할
1. "수입 추가" 버튼 클릭
2. 카테고리: 후원금
3. 금액: 1,000,000원
4. 설명: "2025년 상반기 후원금"
5. 날짜: 2025-10-15
6. 등록 후 "분할" 버튼 클릭
7. 5개월 선택
8. 결과: 10월 200,000원, 11월~2월 각 200,000원

### 시나리오 2: 시설 임대료 지출 등록
1. "지출 추가" 버튼 클릭
2. 카테고리: 시설 임대료
3. 금액: 2,000,000원
4. 설명: "10월 체육관 임대료"
5. 날짜: 2025-10-01
6. 등록 완료

### 시나리오 3: 분할 되돌리기
1. 분할된 거래 중 하나 선택
2. "되돌리기" 버튼 클릭
3. 확인
4. 결과: 모든 분할 거래 취소 + 원본 1,000,000원 복원

---

## 🔧 기술 세부사항

### Firestore 컬렉션
- **financial_transactions**: 수입/지출 거래 저장
- 인덱스 필요:
  - `clubId` + `isCancelled` + `date` (desc)
  - `splitParentId` + `isCancelled`

### 쿼리 최적화
- `isCancelled: false` 필터로 취소된 거래 제외
- `orderBy('date', 'desc')`로 최신순 정렬

### 분할 로직
```typescript
const monthlyAmount = Math.floor(totalAmount / months);
const remainder = totalAmount - (monthlyAmount * months);

// 첫 달에 나머지 포함
const firstMonthAmount = monthlyAmount + remainder;
```

---

## 📝 Firestore Rules 추가 필요

```javascript
// financial_transactions 컬렉션
match /financial_transactions/{transactionId} {
  allow read: if isClubMember(request.auth.uid, resource.data.clubId);
  allow create: if isClubAdmin(request.auth.uid, request.resource.data.clubId);
  allow update, delete: if isClubAdmin(request.auth.uid, resource.data.clubId);
}
```

---

## ✨ 주요 개선사항

### Phase 1-4 완료
1. ✅ **Phase 1**: 데이터 구조 (회원 분류 시스템)
2. ✅ **Phase 2**: UI 개선 (필터링, 배지)
3. ✅ **Phase 3**: 고급 기능 (수업 자격 검증, 통계)
4. ✅ **Phase 4**: 최적화 (마이그레이션, 필터)

### 재무관리 업데이트
5. ✅ **회원 분류별 결제 관리**
6. ✅ **수입/지출 직접 관리**
7. ✅ **수입 분할 기능**
8. ✅ **분할 되돌리기**

---

## 🚀 배포 전 체크리스트

### 필수 작업
- [ ] Firestore 인덱스 생성
- [ ] Firestore Rules 업데이트
- [ ] 타입 정의 확인 (`FinancialTransaction`)
- [ ] 기존 회원 데이터 마이그레이션 (선택)

### 테스트 항목
- [ ] 수입 추가 테스트
- [ ] 지출 추가 테스트
- [ ] 분할 기능 테스트 (2~12개월)
- [ ] 되돌리기 테스트
- [ ] 회원 분류별 필터링 테스트
- [ ] 통계 카드 확인

### 성능 확인
- [ ] 거래 목록 로딩 속도
- [ ] 분할 처리 속도
- [ ] 필터링 반응 속도

---

## 📚 관련 문서
- `PHASE1_COMPLETE.md`: 데이터 구조
- `PHASE2_COMPLETE.md`: UI 개선
- `PHASE3_COMPLETE.md`: 고급 기능
- `PHASE4_COMPLETE.md`: 최적화

---

**업데이트 완료일**: 2025-10-15  
**배포 준비**: 완료  
**다음 단계**: Firestore 설정 → 배포
