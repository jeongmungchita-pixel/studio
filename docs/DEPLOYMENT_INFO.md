# 🚀 배포 정보 (Deployment Information)

> 최종 업데이트: 2025-10-14

---

## 📍 배포 환경

### Firebase 프로젝트
- **Project ID**: `studio-2481293716-bdd83`
- **Project Number**: `279447898825`
- **Region**: 
  - App Hosting: `asia-southeast1` (싱가포르)
  - Cloud Functions: `asia-northeast3` (서울)

---

## 🌐 배포 URL

### 메인 앱 (Firebase App Hosting)
- **Backend Name**: `gymnasticsfed`
- **URL**: https://gymnasticsfed--studio-2481293716-bdd83.asia-southeast1.hosted.app
- **Repository**: `jeongmungchita-pixel/studio`
- **자동 배포**: Git push → 자동 빌드 & 배포

### Firebase Hosting (정적 파일만)
- **URL**: https://studio-2481293716-bdd83.web.app
- **용도**: 정적 파일 서빙 (현재 미사용)

---

## ⚙️ Cloud Functions

### 배포된 Functions (asia-northeast3 서울)

1. **onFederationAdminInviteCreatedV2**
   - 트리거: Firestore `federationAdminInvites` 문서 생성
   - 동작: 연맹 관리자 초대 이메일 발송
   - 이메일: `jeongmungchita@gmail.com`

2. **sendBulkSMSV2**
   - 트리거: HTTP Callable
   - 동작: 단체 문자 발송 (네이버 클라우드)

3. **onPaymentCompletedV2**
   - 트리거: Firestore `payments` 문서 업데이트
   - 동작: 결제 완료 알림

4. **calculateMonthlyStatsV2**
   - 트리거: Cron (매월 1일 자정)
   - 동작: 월별 통계 계산

5. **checkExpiredInvitesV2**
   - 트리거: Cron (매일 자정)
   - 동작: 만료된 초대 확인

### Functions 환경 변수
```bash
email.user = "jeongmungchita@gmail.com"
email.pass = "fqun hwjn slke wbtk" (Gmail 앱 비밀번호)
app.url = "https://gymnasticsfed--studio-2481293716-bdd83.asia-southeast1.hosted.app"
```

---

## 📦 배포 명령어

### App Hosting (메인 앱)
```bash
# Git push만 하면 자동 배포됨
git add .
git commit -m "your message"
git push origin main
```

### Cloud Functions
```bash
# 전체 Functions 배포
firebase deploy --only functions

# 특정 Function만 배포
firebase deploy --only functions:onFederationAdminInviteCreatedV2

# Functions 환경 변수 설정
firebase functions:config:set email.user="your@gmail.com"
firebase functions:config:set email.pass="your-app-password"
firebase functions:config:set app.url="https://your-app-url"
```

### Firestore Rules & Indexes
```bash
# Rules 배포
firebase deploy --only firestore:rules

# Indexes 배포
firebase deploy --only firestore:indexes

# 전체 Firestore 배포
firebase deploy --only firestore
```

---

## 🔐 보안 정보

### Gmail 앱 비밀번호
- **계정**: `jeongmungchita@gmail.com`
- **앱 비밀번호**: `fqun hwjn slke wbtk`
- **용도**: Cloud Functions 이메일 발송
- **생성 위치**: https://myaccount.google.com/apppasswords

### Firebase Service Account
- **파일**: `serviceAccountKey.json`
- **용도**: Admin SDK 초기화 (서버 사이드)
- **⚠️ 주의**: Git에 커밋하지 말 것 (.gitignore에 포함됨)

---

## 📊 Firestore 데이터베이스

### 주요 컬렉션
- `/users` - 사용자 프로필
- `/clubs` - 클럽 정보
- `/members` - 클럽 회원
- `/member_passes` - 이용권
- `/attendance` - 출석 기록
- `/competitions` - 대회
- `/level_tests` - 승급 심사
- `/payments` - 결제
- `/federationAdminInvites` - 연맹 관리자 초대

### 인덱스
- `firestore.indexes.json` 참고
- 자동 생성된 인덱스는 Firebase Console에서 확인

---

## 🔄 CI/CD 파이프라인

### Firebase App Hosting (자동)
```
Git Push → GitHub
    ↓
Firebase App Hosting 감지
    ↓
자동 빌드 (npm run build)
    ↓
배포 (asia-southeast1)
    ↓
완료 (2-3분 소요)
```

### Cloud Functions (수동)
```
코드 수정
    ↓
firebase deploy --only functions
    ↓
빌드 & 업로드
    ↓
배포 (asia-northeast3)
    ↓
완료 (1-2분 소요)
```

---

## 🐛 트러블슈팅

### Functions 배포 실패
```bash
# functions/.next 폴더 삭제 후 재배포
rm -rf functions/.next
firebase deploy --only functions
```

### 이메일 발송 안 됨
```bash
# 환경 변수 확인
firebase functions:config:get

# 로그 확인
firebase functions:log --only onFederationAdminInviteCreatedV2
```

### App Hosting 배포 확인
```bash
# 백엔드 목록 확인
firebase apphosting:backends:list

# 특정 백엔드 상세 정보
firebase apphosting:backends:get gymnasticsfed
```

---

## 📝 중요 체크리스트

### 배포 전 확인사항
- [ ] `npm run build` 로컬 빌드 성공
- [ ] TypeScript 에러 없음
- [ ] Firestore Rules 테스트 완료
- [ ] 환경 변수 설정 확인

### 배포 후 확인사항
- [ ] 메인 앱 URL 접속 확인
- [ ] 로그인/로그아웃 테스트
- [ ] Functions 로그 확인
- [ ] 이메일 발송 테스트

---

## 🔗 유용한 링크

- **Firebase Console**: https://console.firebase.google.com/project/studio-2481293716-bdd83
- **GitHub Repository**: https://github.com/jeongmungchita-pixel/studio
- **App Hosting Dashboard**: Firebase Console → App Hosting
- **Functions Logs**: Firebase Console → Functions → Logs

---

## 📞 연락처

- **개발자**: 정문치타
- **이메일**: jeongmungchita@gmail.com
- **프로젝트**: KGF 넥서스 (대한체조협회 관리 플랫폼)
