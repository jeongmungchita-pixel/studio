# 🏗️ KGF Nexus 프로젝트 청사진 (Project Blueprint)

> 이 문서는 한국체조협회 관리 시스템(KGF Nexus)을 처음부터 구현하기 위한 완전한 아키텍처 가이드입니다.

## 📋 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [데이터 모델](#4-데이터-모델)
5. [역할 기반 접근 제어](#5-역할-기반-접근-제어)
6. [핵심 기능 모듈](#6-핵심-기능-모듈)
7. [UI/UX 흐름도](#7-uiux-흐름도)
8. [구현 단계](#8-구현-단계)
9. [배포 아키텍처](#9-배포-아키텍처)
10. [보안 및 최적화](#10-보안-및-최적화)

---

## 1. 프로젝트 개요

### 1.1 목적
한국체조협회의 디지털 전환을 위한 통합 관리 플랫폼

### 1.2 핵심 가치
- **중앙집중식 관리**: 연맹 → 클럽 → 회원의 계층적 관리
- **실시간 협업**: 클럽 간 정보 공유 및 대회 관리
- **투명한 운영**: 감사 로그 및 승인 프로세스
- **확장성**: 다중 클럽 및 대규모 회원 지원

### 1.3 주요 이해관계자
```
┌─────────────────┐
│   Super Admin   │ (시스템 최고 관리자)
└────────┬────────┘
         │
┌────────▼────────┐
│ Federation Admin│ (연맹 관리자)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│Club 1│  │Club 2│ (클럽 오너/매니저)
└──┬───┘  └──┬───┘
   │         │
   ▼         ▼
[Members] [Members] (일반 회원/학부모)
```

---

## 2. 기술 스택

### 2.1 프론트엔드
```json
{
  "framework": "Next.js 15.5.6",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 3.x",
  "ui_library": "shadcn/ui",
  "state_management": "React Context + Custom Hooks",
  "form_handling": "react-hook-form + zod"
}
```

### 2.2 백엔드 & 데이터베이스
```json
{
  "authentication": "Firebase Auth",
  "database": "Cloud Firestore",
  "storage": "Firebase Storage",
  "serverless": "Next.js API Routes",
  "admin_sdk": "Firebase Admin SDK"
}
```

### 2.3 배포 & 인프라
```json
{
  "hosting": "Firebase App Hosting / Vercel",
  "ci_cd": "GitHub Actions",
  "monitoring": "Firebase Analytics",
  "version_control": "Git + GitHub"
}
```

---

## 3. 시스템 아키텍처

### 3.1 전체 아키텍처
```
┌──────────────────────────────────────────┐
│            Client (Browser)              │
├──────────────────────────────────────────┤
│          Next.js Application             │
│  ┌────────────────────────────────────┐  │
│  │     Pages (App Directory)          │  │
│  ├────────────────────────────────────┤  │
│  │     Components & Hooks             │  │
│  ├────────────────────────────────────┤  │
│  │     Services & Utils               │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│           API Layer                      │
│  ┌────────────────────────────────────┐  │
│  │    Next.js API Routes              │  │
│  │    Firebase Admin SDK              │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│           Firebase Services              │
├──────────────────────────────────────────┤
│  • Authentication (사용자 인증)          │
│  • Firestore (데이터베이스)              │
│  • Storage (파일 저장소)                 │
│  • Functions (서버리스 함수)             │
└──────────────────────────────────────────┘
```

### 3.2 디렉토리 구조
```
federation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 인증 관련 페이지
│   │   ├── admin/              # 연맹 관리자
│   │   ├── super-admin/        # 최고 관리자
│   │   ├── club-dashboard/     # 클럽 관리자
│   │   └── my-profile/         # 일반 사용자
│   ├── components/
│   │   ├── common/             # 공통 컴포넌트
│   │   ├── layout/             # 레이아웃 컴포넌트
│   │   └── ui/                 # shadcn/ui 컴포넌트
│   ├── hooks/                  # Custom React Hooks
│   ├── services/               # 비즈니스 로직 서비스
│   ├── types/                  # TypeScript 타입 정의
│   ├── constants/              # 상수 정의
│   ├── utils/                  # 유틸리티 함수
│   └── firebase/               # Firebase 설정
├── public/                     # 정적 파일
└── scripts/                    # 유틸리티 스크립트
```

---

## 4. 데이터 모델

### 4.1 핵심 컬렉션 구조

#### Users (사용자)
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;                 // 역할
  status: 'pending' | 'active';   // 승인 상태
  clubId?: string;                // 소속 클럽
  clubName?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

#### Clubs (클럽)
```typescript
interface Club {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  ownerId: string;                // 클럽 오너 UID
  ownerName: string;
  managerIds: string[];            // 클럽 매니저들
  coachIds: string[];              // 코치진
  memberCount: number;
  status: 'active' | 'suspended';
  createdAt: Timestamp;
}
```

#### Members (회원)
```typescript
interface Member {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  email?: string;
  clubId: string;
  clubName: string;
  guardianIds: string[];           // 보호자 UIDs
  category: MemberCategory;        // 연령 카테고리
  status: 'active' | 'inactive';
  createdAt: Timestamp;
}
```

#### Classes (수업)
```typescript
interface GymClass {
  id: string;
  name: string;
  clubId: string;
  coachId: string;
  coachName: string;
  schedule: Schedule[];
  memberIds: string[];
  capacity: number;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
}
```

### 4.2 보조 컬렉션
- `member_passes`: 회원권 정보
- `pass_templates`: 회원권 템플릿
- `attendance`: 출석 기록
- `payments`: 결제 정보
- `competitions`: 대회 정보
- `events`: 이벤트 정보
- `announcements`: 공지사항
- `committees`: 위원회
- `audit_logs`: 감사 로그

---

## 5. 역할 기반 접근 제어 (RBAC)

### 5.1 역할 계층 구조
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',           // 레벨 13
  FEDERATION_ADMIN = 'federation_admin', // 레벨 12
  FEDERATION_STAFF = 'federation_staff', // 레벨 11
  COMMITTEE_CHAIR = 'committee_chair',   // 레벨 10
  COMMITTEE_MEMBER = 'committee_member', // 레벨 9
  JUDGE = 'judge',                       // 레벨 8
  CLUB_OWNER = 'club_owner',            // 레벨 7
  CLUB_MANAGER = 'club_manager',        // 레벨 6
  HEAD_COACH = 'head_coach',            // 레벨 5
  ASSISTANT_COACH = 'assistant_coach',  // 레벨 4
  SENIOR_MEMBER = 'senior_member',      // 레벨 3
  MEMBER = 'member',                     // 레벨 2
  PARENT = 'parent',                     // 레벨 1
}
```

### 5.2 권한 매트릭스
```
┌─────────────────┬────────┬───────┬───────┬────────┐
│      역할       │ 시스템 │ 연맹  │ 클럽  │  개인  │
├─────────────────┼────────┼───────┼───────┼────────┤
│ SUPER_ADMIN     │   ✓    │   ✓   │   ✓   │   ✓    │
│ FEDERATION_ADMIN│   ✗    │   ✓   │   ✓   │   ✓    │
│ CLUB_OWNER      │   ✗    │   ✗   │   ✓   │   ✓    │
│ CLUB_MANAGER    │   ✗    │   ✗   │   ✓   │   ✓    │
│ HEAD_COACH      │   ✗    │   ✗   │  읽기  │   ✓    │
│ MEMBER          │   ✗    │   ✗   │   ✗   │   ✓    │
│ PARENT          │   ✗    │   ✗   │   ✗   │  제한  │
└─────────────────┴────────┴───────┴───────┴────────┘
```

---

## 6. 핵심 기능 모듈

### 6.1 인증 및 온보딩
```
1. 회원가입 플로우
   ├── 역할 선택
   ├── 기본 정보 입력
   ├── 이메일 인증
   ├── 승인 대기
   └── 프로필 완성

2. 로그인 플로우
   ├── 이메일/비밀번호
   ├── Google OAuth
   └── 자동 리다이렉트
```

### 6.2 클럽 관리 기능
```
1. 회원 관리
   ├── 회원 등록/수정/삭제
   ├── 회원권 발급/갱신
   └── 출석 관리

2. 수업 관리
   ├── 수업 생성/편집
   ├── 코치 배정
   └── 시간표 관리

3. 재무 관리
   ├── 결제 처리
   ├── 매출 통계
   └── 미납 관리
```

### 6.3 연맹 관리 기능
```
1. 클럽 관리
   ├── 클럽 승인/정지
   ├── 클럽 통계
   └── 클럽 간 이동

2. 대회 관리
   ├── 대회 생성
   ├── 참가 신청 관리
   └── 결과 입력

3. 공지사항 관리
   ├── 전체 공지
   ├── 클럽별 공지
   └── 이메일 알림
```

---

## 7. UI/UX 흐름도

### 7.1 사용자 여정 맵
```
신규 사용자 → 회원가입 → 역할 선택 → 승인 대기 → 활성화 → 대시보드
     ↓            ↓           ↓           ↓          ↓         ↓
  로그인 ←─────────────────────────────────────────────── 로그아웃
     ↓
역할별 대시보드
     ├── Super Admin → 시스템 관리
     ├── Federation Admin → 연맹 관리
     ├── Club Owner → 클럽 관리
     └── Member → 개인 프로필
```

### 7.2 페이지 라우팅 구조
```
/
├── /login                    # 로그인
├── /register                 # 회원가입
│   ├── /register/club-owner  # 클럽 오너 가입
│   └── /register/member      # 일반 회원 가입
├── /super-admin             # 최고 관리자
├── /admin                   # 연맹 관리자
├── /club-dashboard          # 클럽 관리자
├── /my-profile              # 개인 프로필
└── /pending-approval        # 승인 대기
```

---

## 8. 구현 단계

### Phase 1: 기초 설정 (Week 1)
```
□ Next.js 프로젝트 초기화
□ TypeScript 설정
□ Tailwind CSS + shadcn/ui 설정
□ Firebase 프로젝트 생성 및 연동
□ 기본 디렉토리 구조 생성
```

### Phase 2: 인증 시스템 (Week 2)
```
□ Firebase Auth 설정
□ 회원가입/로그인 페이지
□ 역할 기반 라우팅
□ 미들웨어 설정
□ 세션 관리
```

### Phase 3: 데이터 모델링 (Week 3)
```
□ Firestore 컬렉션 설계
□ TypeScript 타입 정의
□ Firebase Rules 설정
□ 데이터 검증 로직
```

### Phase 4: 핵심 기능 구현 (Week 4-6)
```
□ 클럽 관리 모듈
  □ 회원 CRUD
  □ 수업 관리
  □ 회원권 시스템
  
□ 연맹 관리 모듈
  □ 클럽 관리
  □ 대회 관리
  □ 공지사항
  
□ 사용자 대시보드
  □ 역할별 대시보드
  □ 프로필 관리
```

### Phase 5: 고급 기능 (Week 7-8)
```
□ 실시간 권한 업데이트
□ 감사 로깅 시스템
□ 통계 및 분석
□ 알림 시스템
□ 파일 업로드
```

### Phase 6: 최적화 및 배포 (Week 9-10)
```
□ 성능 최적화
□ SEO 설정
□ 보안 강화
□ 테스트 작성
□ 배포 파이프라인 구축
□ 모니터링 설정
```

---

## 9. 배포 아키텍처

### 9.1 Firebase App Hosting 설정
```yaml
# apphosting.yaml
runConfig:
  maxInstances: 1
  minInstances: 0
  concurrency: 100
```

### 9.2 환경 변수
```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 9.3 CI/CD 파이프라인
```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: firebase deploy
```

---

## 10. 보안 및 최적화

### 10.1 보안 체크리스트
```
✓ Firebase Security Rules 설정
✓ 환경 변수 관리
✓ XSS/CSRF 방어
✓ SQL Injection 방어 (Firestore 자동)
✓ 비밀번호 정책
✓ 2단계 인증 (옵션)
✓ 감사 로깅
✓ 데이터 암호화
```

### 10.2 성능 최적화
```
✓ 이미지 최적화 (Next.js Image)
✓ 코드 스플리팅
✓ 레이지 로딩
✓ 캐싱 전략
✓ 병렬 쿼리 처리
✓ 데이터베이스 인덱싱
✓ CDN 활용
```

### 10.3 모니터링
```
✓ Firebase Analytics
✓ Error Tracking
✓ Performance Monitoring
✓ User Behavior Analytics
✓ Uptime Monitoring
```

---

## 📚 참고 문서

### 공식 문서
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### 프로젝트 문서
- `/ROUTING_GUIDE.md` - 라우팅 가이드
- `/USER_FLOW_SIMULATION_REPORT.md` - 사용자 흐름 테스트
- `/VERCEL_DEPLOYMENT_GUIDE.md` - 배포 가이드

---

## 🎯 성공 지표

### 기술적 지표
- 페이지 로드 시간 < 3초
- 99.9% 가동률
- 0 크리티컬 보안 이슈
- 90% 이상 코드 커버리지

### 비즈니스 지표
- 100+ 클럽 지원
- 10,000+ 동시 사용자
- 실시간 데이터 동기화
- 모바일 반응형 100%

---

*이 청사진을 따라 구현하면 완전히 동일한 KGF Nexus 시스템을 구축할 수 있습니다.*
