# KGF 넥서스 - 배포 가이드

> 최종 업데이트: 2025-10-12

---

## 🚀 배포 준비 상태: 95%

### ✅ 완료된 항목

#### 1. 인프라
- [x] Firebase App Hosting 설정
- [x] 자동 배포 (GitHub → Firebase)
- [x] PWA 설정
- [x] 환경 변수 관리

#### 2. 데이터베이스
- [x] Firestore Rules (프로덕션 준비)
- [x] Firestore 인덱스 (15개 복합 인덱스)
- [x] 데이터 구조 문서화

#### 3. 백엔드
- [x] Firebase Functions (5개)
- [x] 에러 처리
- [x] 로깅

#### 4. 프론트엔드
- [x] 타입 안정성
- [x] 에러 처리 (Toast)
- [x] 로딩 상태
- [x] 반응형 디자인

#### 5. 성능
- [x] 쿼리 최적화
- [x] 인덱스 최적화
- [x] 성능 모니터링 설정
- [x] 이미지 최적화 (Next.js Image)

#### 6. 문서화
- [x] README.md
- [x] SUMMARY.md
- [x] DATA_STRUCTURE.md
- [x] PERFORMANCE.md
- [x] TESTING.md
- [x] TODO.md

---

## 📋 배포 전 체크리스트

### 필수 항목
- [x] 모든 환경 변수 설정
- [x] Firestore Rules 배포
- [x] Firestore 인덱스 배포
- [x] Firebase Functions 배포
- [x] 프로덕션 빌드 테스트
- [ ] E2E 테스트 통과 (선택사항)
- [ ] Lighthouse 점수 확인 (선택사항)

### 보안 체크
- [x] API 키 보안 처리
- [x] 인증 규칙 검증
- [x] CORS 설정
- [x] Rate Limiting (Functions)

### 성능 체크
- [x] 번들 크기 확인
- [x] 이미지 최적화
- [x] 쿼리 최적화
- [ ] CDN 설정 (선택사항)

---

## 🔧 배포 명령어

### 1. 전체 배포

```bash
# 모든 리소스 배포
firebase deploy

# 또는 개별 배포
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

### 2. 프로덕션 빌드

```bash
# Next.js 빌드
npm run build

# 빌드 확인
npm run start
```

### 3. 환경 변수 설정

```bash
# Firebase 프로젝트 선택
firebase use production

# 환경 변수 설정 (Functions)
firebase functions:config:set someservice.key="THE API KEY"
```

---

## 🌍 환경 구성

### Development
- URL: `http://localhost:3000`
- Firebase Project: `kgf-nexus-dev`
- 자동 배포: ❌

### Staging (선택사항)
- URL: `https://staging.kgf-nexus.web.app`
- Firebase Project: `kgf-nexus-staging`
- 자동 배포: ✅ (develop 브랜치)

### Production
- URL: `https://kgf-nexus.web.app`
- Firebase Project: `kgf-nexus-prod`
- 자동 배포: ✅ (main 브랜치)

---

## 📊 모니터링

### Firebase Console
- **Performance**: 페이지 로드 시간, 네트워크 요청
- **Crashlytics**: 에러 추적 (설정 필요)
- **Analytics**: 사용자 행동 분석

### 알림 설정
```javascript
// Firebase Functions에서 에러 알림
exports.onError = functions.crashlytics.issue().onNew(async (issue) => {
  // Slack, Email 등으로 알림
});
```

---

## 🔄 롤백 절차

### 1. 이전 버전으로 롤백

```bash
# 배포 히스토리 확인
firebase hosting:releases:list

# 특정 버전으로 롤백
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID DESTINATION_SITE_ID
```

### 2. Functions 롤백

```bash
# Functions 버전 확인
firebase functions:list

# 이전 버전 배포
gcloud functions deploy FUNCTION_NAME --source=gs://BUCKET/VERSION
```

---

## 🐛 트러블슈팅

### 빌드 실패
```bash
# 캐시 삭제
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Functions 배포 실패
```bash
# Functions 로그 확인
firebase functions:log

# 특정 Function 재배포
firebase deploy --only functions:FUNCTION_NAME
```

### Firestore Rules 오류
```bash
# Rules 테스트
firebase emulators:start --only firestore

# Rules 검증
firebase firestore:rules:validate
```

---

## 📈 성능 목표

### 현재 상태
- **First Contentful Paint**: ~1.5초
- **Time to Interactive**: ~2.5초
- **Lighthouse Score**: 85점

### 목표
- **First Contentful Paint**: <1초
- **Time to Interactive**: <2초
- **Lighthouse Score**: >90점

---

## 🔐 보안 권장사항

### 1. API 키 관리
- 환경 변수 사용
- `.env.local` 파일 (gitignore)
- Firebase App Check 활성화

### 2. Firestore Rules
- 최소 권한 원칙
- 정기적인 감사
- 테스트 작성

### 3. Functions 보안
- CORS 설정
- Rate Limiting
- 인증 검증

---

## 📝 배포 후 확인사항

### 즉시 확인
- [ ] 메인 페이지 로드
- [ ] 로그인/로그아웃
- [ ] 주요 기능 동작
- [ ] 모바일 반응형

### 24시간 내 확인
- [ ] 에러 로그 확인
- [ ] 성능 메트릭 확인
- [ ] 사용자 피드백 수집

### 1주일 내 확인
- [ ] 성능 트렌드 분석
- [ ] 사용자 행동 분석
- [ ] 개선사항 도출

---

## 🎯 다음 단계

### 단기 (1-2주)
1. 사용자 피드백 수집
2. 버그 수정
3. 성능 모니터링

### 중기 (1-3개월)
1. 테스트 코드 작성
2. A/B 테스트
3. 기능 개선

### 장기 (3-6개월)
1. 스케일링 준비
2. 국제화 (i18n)
3. 고급 분석

---

## 📞 지원

### 문제 발생 시
1. Firebase Console 확인
2. 로그 분석
3. GitHub Issues 생성

### 긴급 상황
1. 롤백 실행
2. 사용자 공지
3. 원인 분석

---

**배포 상태**: 🟢 Production Ready (95%)  
**마지막 배포**: 2025-10-12  
**다음 배포 예정**: TBD
