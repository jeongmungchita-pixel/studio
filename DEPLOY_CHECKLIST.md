# 배포 체크리스트

> 배포일: 2025-10-15

---

## 📋 배포 전 필수 작업

### 1. Firestore 설정

#### Firestore Rules 배포
```bash
firebase deploy --only firestore:rules
```

#### Firestore 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

**중요**: 인덱스 생성은 시간이 걸릴 수 있습니다 (수 분~수십 분)

---

### 2. 데이터 마이그레이션 (선택)

기존 회원 데이터에 `memberCategory` 추가:

```bash
# 서비스 계정 키 준비
# serviceAccountKey.json을 /scripts 폴더에 배치

# 마이그레이션 실행
npx ts-node scripts/migrate-member-categories.ts
```

**주의**: 프로덕션 데이터 백업 후 실행!

---

### 3. 빌드 및 테스트

#### 로컬 빌드 테스트
```bash
npm run build
```

#### 타입 체크
```bash
npm run type-check
```

#### Lint 체크
```bash
npm run lint
```

---

## 🚀 배포 실행

### Vercel 배포 (권장)
```bash
# 프로덕션 배포
vercel --prod

# 또는 Git push로 자동 배포
git push origin main
```

### Firebase Hosting 배포
```bash
# 빌드
npm run build

# 배포
firebase deploy --only hosting
```

---

## ✅ 배포 후 확인사항

### 1. 기능 테스트

#### 재무관리
- [ ] 수입 추가 테스트
- [ ] 지출 추가 테스트
- [ ] 분할 기능 테스트 (2~12개월)
- [ ] 되돌리기 테스트
- [ ] 회원 분류별 필터링 테스트

#### 회원 분류 시스템
- [ ] 이용권 갱신 필터링 확인
- [ ] 이용권 목록 탭 필터 확인
- [ ] 수업 자격 검증 확인
- [ ] 통계 대시보드 확인

### 2. 성능 확인
- [ ] 페이지 로딩 속도
- [ ] 거래 목록 로딩
- [ ] 필터링 반응 속도
- [ ] 분할 처리 속도

### 3. 데이터 확인
- [ ] Firestore 인덱스 생성 완료 확인
- [ ] 거래 데이터 정상 저장 확인
- [ ] 분할 데이터 정상 생성 확인

---

## 🔧 문제 해결

### Firestore 인덱스 오류
```
Error: The query requires an index
```

**해결**: 
1. 오류 메시지의 링크 클릭
2. 자동으로 인덱스 생성
3. 또는 `firestore.indexes.json` 확인 후 재배포

### 타입 오류
```
Cannot find name 'FinancialTransaction'
```

**해결**:
1. `src/types/index.ts` 확인
2. export 확인
3. import 경로 확인

### 빌드 오류
```
Type error: ...
```

**해결**:
1. `npm run type-check` 실행
2. 오류 수정
3. 재빌드

---

## 📊 모니터링

### 배포 후 24시간 모니터링

#### Firebase Console
- Firestore 읽기/쓰기 횟수
- 오류 로그
- 성능 메트릭

#### Vercel Dashboard
- 배포 상태
- 빌드 로그
- 에러 추적

---

## 🔄 롤백 계획

### 문제 발생 시

#### Vercel 롤백
```bash
# 이전 배포로 롤백
vercel rollback
```

#### Firestore Rules 롤백
```bash
# Git에서 이전 버전 체크아웃
git checkout HEAD~1 firestore.rules

# 재배포
firebase deploy --only firestore:rules
```

---

## 📝 배포 기록

### 변경 사항
- ✅ 회원 분류 시스템 (Phase 1-4)
- ✅ 재무관리 고급 기능
  - 수입/지출 직접 관리
  - 분할 기능
  - 되돌리기 기능
- ✅ Firestore Rules 업데이트
- ✅ Firestore 인덱스 추가

### 영향 범위
- 재무관리 페이지 (`/club-dashboard/payments`)
- 타입 정의 (`src/types/index.ts`)
- Firestore Rules
- Firestore 인덱스

### 하위 호환성
- ✅ 기존 결제 데이터 영향 없음
- ✅ 기존 회원 데이터 영향 없음
- ✅ 기존 기능 정상 작동

---

## 🎯 배포 완료 확인

모든 항목 체크 후 배포 완료:

- [ ] Firestore Rules 배포 완료
- [ ] Firestore 인덱스 배포 완료
- [ ] 빌드 성공
- [ ] 프로덕션 배포 완료
- [ ] 기능 테스트 완료
- [ ] 성능 확인 완료
- [ ] 모니터링 설정 완료

---

**배포 담당자**: _______  
**배포일시**: 2025-10-15  
**배포 버전**: v2.0.0  
**상태**: ✅ 준비 완료
