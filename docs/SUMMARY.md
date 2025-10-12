# KGF 넥서스 - 프로젝트 요약

> 최종 업데이트: 2025-10-12

---

## 🎯 프로젝트 개요

**KGF 넥서스 (Korean Gymnastics Federation Nexus)**
- 대한검도연맹 통합 관리 시스템
- Next.js 15 + Firebase + TypeScript
- PWA 지원 (모바일 앱 설치 가능)

---

## 📊 현재 상태

### 전체 완성도: **75%**

✅ **완성된 기능**
- 인증 시스템 (Firebase Auth)
- 역할 기반 권한 (5가지 역할)
- 보안 Rules (프로덕션 준비)
- Firebase Functions (5개)
- PWA 설정
- 자동 배포 (GitHub → Firebase App Hosting)

⚠️ **미완성 기능**
- 자녀 목록 조회 (Mock 데이터)
- 승인 요청 시스템 (Mock 데이터)
- 위원회 관리 (Mock 데이터)
- SMS 발송 (서버 사이드 미구현)
- 이용권 갱신 로직 (부분 구현)

---

## 🚀 빠른 시작

### 개발 모드
```bash
npm run dev
# http://localhost:3000
```

### 배포
```bash
git add .
git commit -m "메시지"
git push origin main
# 자동 배포 시작 (5-10분)
```

### Functions 배포
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 📁 프로젝트 구조

```
studio/
├── src/
│   ├── app/                    # Next.js 페이지
│   │   ├── dashboard/          # 대시보드
│   │   ├── club-dashboard/     # 클럽 관리
│   │   ├── super-admin/        # 최고 관리자
│   │   ├── my-profile/         # 내 프로필
│   │   └── invite/[token]/     # 초대 수락
│   ├── components/             # UI 컴포넌트
│   │   ├── ui/                 # Shadcn/ui
│   │   └── layout/             # 레이아웃
│   ├── firebase/               # Firebase 설정
│   ├── hooks/                  # Custom Hooks
│   ├── types/                  # TypeScript 타입
│   └── lib/                    # 유틸리티
├── functions/                  # Firebase Functions
│   └── src/
│       └── index.ts            # 5개 Functions
├── docs/                       # 문서
│   ├── TODO.md                 # TODO 목록
│   ├── IMPROVEMENTS.md         # 개선사항
│   └── SUMMARY.md              # 이 파일
├── public/                     # 정적 파일
│   └── manifest.json           # PWA 설정
├── firestore.rules             # 보안 Rules
├── firebase.json               # Firebase 설정
└── next.config.ts              # Next.js 설정
```

---

## 👥 역할 시스템

| 역할 | 권한 | 페이지 |
|------|------|--------|
| **SUPER_ADMIN** | 전체 시스템 관리 | `/super-admin` |
| **FEDERATION_ADMIN** | 연맹 관리 | `/admin` |
| **CLUB_OWNER** | 클럽 소유 및 관리 | `/club-dashboard` |
| **CLUB_MANAGER** | 클럽 운영 | `/club-dashboard` |
| **MEMBER** | 개인 정보 관리 | `/my-profile` |

---

## 🔥 Firebase 구성

### Firestore 컬렉션
```
/users/{userId}                 - 사용자 프로필
/clubs/{clubId}                 - 클럽 정보
/members/{memberId}             - 회원 정보
/competitions/{competitionId}   - 대회
/level_tests/{testId}           - 승급 심사
/federationAdminInvites/{id}    - 연맹 관리자 초대
/approvalRequests/{id}          - 승인 요청
/member_passes/{id}             - 이용권
/classes/{id}                   - 수업
```

### Functions
1. **onFederationAdminInviteCreated** - 초대 이메일 발송
2. **sendBulkSMS** - 단체문자 발송
3. **onPaymentCompleted** - 결제 완료 알림
4. **calculateMonthlyStats** - 월별 통계 (매월 1일)
5. **checkExpiredInvites** - 만료 체크 (매일)

---

## 📋 TODO 요약

### 🔴 긴급 (이번 주)
- [ ] 자녀 목록 조회 구현 (30분)
- [ ] 가족 구성원 추가 구현 (30분)
- [ ] 승인 요청 시스템 구현 (2시간)

### 🟡 중요 (다음 주)
- [ ] 위원회 데이터 조회 (1시간)
- [ ] 이용권 갱신 로직 (1시간)
- [ ] SMS 서버 사이드 처리 (2시간)

### 🟢 개선 (장기)
- [ ] 데이터 구조 일관성 (1일)
- [ ] 에러 처리 강화 (1일)
- [ ] 타입 안정성 강화 (2일)

**상세 내용**: `docs/TODO.md`

---

## 🎨 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Library**: Shadcn/ui
- **Icons**: Lucide React

### Backend
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Functions**: Firebase Functions (Node.js 18)
- **Storage**: Firebase Storage
- **Hosting**: Firebase App Hosting

### DevOps
- **Version Control**: Git + GitHub
- **CI/CD**: Firebase App Hosting (자동 배포)
- **Monitoring**: Firebase Console

---

## 🔒 보안

### 인증
- Firebase Authentication
- 이메일/비밀번호 로그인
- 역할 기반 접근 제어

### Firestore Rules
```javascript
// 역할별 권한 체크
function isSuperAdmin() {
  return getUserData().role == 'SUPER_ADMIN';
}

function isClubOwner() {
  return getUserData().role == 'CLUB_OWNER';
}

// 자기 데이터만 접근
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
}
```

**상세 내용**: `firestore.rules`

---

## 📱 PWA 기능

### 설치 방법
**iOS (Safari)**
1. 사이트 접속
2. 공유 버튼 → "홈 화면에 추가"

**Android (Chrome)**
1. 사이트 접속
2. 메뉴 → "앱 설치"

### 기능
- ✅ 홈 화면 아이콘
- ✅ 전체 화면 모드
- ✅ 오프라인 지원 (Service Worker)
- ✅ 빠른 로딩 (캐싱)

---

## 🐛 알려진 이슈

1. **자녀 목록이 표시되지 않음**
   - 원인: Mock 데이터 사용
   - 해결: `docs/TODO.md` #1 참고

2. **승인 요청이 표시되지 않음**
   - 원인: Mock 데이터 사용
   - 해결: `docs/TODO.md` #3 참고

3. **SMS 발송 안 됨**
   - 원인: 클라이언트 사이드 구현
   - 해결: `docs/TODO.md` #6 참고

---

## 📞 도움말

### 문서
- **TODO 목록**: `docs/TODO.md`
- **개선사항**: `docs/IMPROVEMENTS.md`
- **데이터 구조**: `docs/backend.json`
- **역할 시스템**: `ROLE_SYSTEM_USAGE.md`

### 주요 파일
- **타입 정의**: `src/types/index.ts`
- **보안 Rules**: `firestore.rules`
- **Functions**: `functions/src/index.ts`
- **Firebase 설정**: `src/firebase/config.ts`

### 명령어
```bash
# 개발
npm run dev

# 빌드
npm run build

# Functions 배포
cd functions && npm run build
firebase deploy --only functions

# Rules 배포
firebase deploy --only firestore:rules

# 전체 배포
git push origin main
```

---

## 🎯 다음 단계

### 이번 주 목표
1. Mock 데이터 제거
2. 기본 CRUD 완성
3. 에러 처리 개선

### 다음 주 목표
1. 모든 TODO 완료
2. 데이터 일관성 확보
3. 사용자 테스트 시작

### 장기 목표
1. 성능 최적화
2. 테스트 추가
3. 모니터링 구축

---

## 📊 진행 상황

```
[████████████████░░░░] 75%

완료: 15/20 주요 기능
TODO: 7개
개선사항: 10개
```

---

## 🎉 최근 업데이트

**2025-10-12**
- ✅ PWA 설정 완료
- ✅ 보안 Rules 프로덕션 준비
- ✅ Firebase Functions 5개 배포
- ✅ 연맹 관리자 초대 시스템
- ✅ 자녀 추가 기능 구현
- ✅ 자동 배포 설정

---

**프로젝트 상태**: 🟢 Active Development
**배포 상태**: 🟢 Production Ready (75%)
**다음 리뷰**: 1주일 후
