# 🥋 KGF 넥서스 (KGF Nexus)

대한체조협회 통합 관리 플랫폼

## 🚀 빠른 시작

### 배포 URL
- **메인 앱**: https://gymnasticsfed--studio-2481293716-bdd83.asia-southeast1.hosted.app
- **Firebase Project**: studio-2481293716-bdd83

### 로컬 개발
```bash
npm install
npm run dev  # http://localhost:9002
```

### 배포
```bash
# 메인 앱 (자동 배포)
git push origin main

# Cloud Functions
firebase deploy --only functions
```

📖 **상세 정보**: [docs/DEPLOYMENT_INFO.md](./docs/DEPLOYMENT_INFO.md)

[![Production Ready](https://img.shields.io/badge/Production-95%25-brightgreen)](https://github.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-orange)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## 📊 프로젝트 현황

**전체 완성도**: 98%  
**배포 상태**: Production Ready  
**테스트 커버리지**: 목표 80%  
**마지막 업데이트**: 2025-10-12

---

## 🚀 빠른 시작

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/your-org/kgf-nexus.git
cd kgf-nexus

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 개발 서버 실행
npm run dev
```

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

---

## 🏗️ 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트
- **Lucide Icons** - 아이콘

### Backend
- **Firebase Auth** - 인증
- **Firestore** - 데이터베이스
- **Firebase Storage** - 파일 저장
- **Firebase Functions** - 서버리스 함수
- **Firebase Hosting** - 배포

### 개발 도구
- **ESLint** - 코드 품질
- **Prettier** - 코드 포맷팅
- **Git** - 버전 관리

---

## 📁 프로젝트 구조

```
studio/
├── src/
│   ├── app/              # Next.js 앱 라우터
│   │   ├── dashboard/    # 대시보드
│   │   ├── members/      # 회원 관리
│   │   ├── club-dashboard/ # 클럽 관리
│   │   └── ...
│   ├── components/       # 재사용 컴포넌트
│   │   ├── ui/          # shadcn/ui 컴포넌트
│   │   └── layout/      # 레이아웃 컴포넌트
│   ├── firebase/        # Firebase 설정
│   ├── hooks/           # Custom Hooks
│   ├── lib/             # 유틸리티
│   └── types/           # TypeScript 타입
├── docs/                # 문서
│   ├── SUMMARY.md       # 프로젝트 요약
│   ├── DATA_STRUCTURE.md # 데이터 구조
│   ├── PERFORMANCE.md   # 성능 최적화
│   ├── TESTING.md       # 테스트 가이드
│   └── DEPLOYMENT.md    # 배포 가이드
├── functions/           # Firebase Functions
└── public/              # 정적 파일
```

---

## ✨ 주요 기능

### 인증 & 권한
- 13개 계층적 역할 시스템
- Firebase Auth 통합
- 역할 기반 접근 제어

### 회원 관리
- 회원 등록 및 승인
- 가족 회원 관리
- 출석 관리
- 이용권 관리

### 클럽 관리
- 클럽 대시보드
- 수업 관리
- 결제 관리
- 공지사항

### 대회 & 심사
- 대회 관리
- 승급 심사
- 실시간 스코어보드

### 미디어
- 사진/영상 업로드
- 갤러리
- Firebase Storage 통합

---

## 📚 문서

- **[프로젝트 요약](docs/SUMMARY.md)** - 전체 개요
- **[데이터 구조](docs/DATA_STRUCTURE.md)** - Firestore 스키마
- **[데이터 흐름](docs/DATA_FLOW.md)** - 전체 아키텍처 및 데이터 흐름 ✨
- **[성능 최적화](docs/PERFORMANCE.md)** - 성능 가이드
- **[테스트 가이드](docs/TESTING.md)** - 테스트 전략
- **[테스트 설치](docs/TEST_SETUP.md)** - 테스트 환경 설정
- **[배포 가이드](docs/DEPLOYMENT.md)** - 배포 절차
- **[TODO](docs/TODO.md)** - 개선 사항

---

## 🔧 개발 가이드

### 코드 스타일
- TypeScript Strict 모드
- ESLint + Prettier
- 컴포넌트 기반 아키텍처

### 커밋 컨벤션
```
feat: 새로운 기능
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드/설정 변경
```

### 브랜치 전략
- `main` - 프로덕션
- `develop` - 개발
- `feature/*` - 기능 개발
- `hotfix/*` - 긴급 수정

---

## 🚀 배포

### Firebase 배포
```bash
# 전체 배포
firebase deploy

# Hosting만 배포
firebase deploy --only hosting

# Functions만 배포
firebase deploy --only functions
```

### 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

### Firestore 데이터 초기화

**방법 1: 웹 UI (권장)**
1. 최상위 관리자로 로그인
2. `/super-admin` 페이지 접속
3. 우측 상단 "데이터 초기화" 버튼 클릭
4. `RESET` 입력 후 확인

**방법 2: CLI 스크립트**
```bash
npm run reset:firestore
```

⚠️ **주의**: 이 작업은 되돌릴 수 없습니다!

### Firestore 스키마 검증 및 수정

Firebase Console에서 수동으로 만든 데이터를 코드와 일관성 있게 맞추기:

```bash
# 1. 스키마 검증 (이슈 찾기)
npm run validate:schema

# 2. 자동 수정
npm run fix:schema
```

자세한 내용은 [SCHEMA_VALIDATION.md](docs/SCHEMA_VALIDATION.md) 참조

### 전체 워크플로우 시뮬레이션

실제 사용자처럼 모든 기능을 자동으로 테스트:

```bash
npm run simulate
```

**자동 생성되는 데이터:**
- 클럽 1개 (테스트 태권도장)
- 회원 2명 (홍길동, 김영희)
- 대회 1개 (2025 전국 태권도 대회)
- 대회 신청 2건

**테스트 계정:**
- 클럽 오너: `test-owner@example.com` / `Test1234!`
- 회원1: `member1@example.com` / `Member1234!`
- 회원2: `member2@example.com` / `Member1234!`

---

## 📊 성능

### 목표
- First Contentful Paint: <1초
- Time to Interactive: <2초
- Lighthouse Score: >90점

### 최적화
- Firestore 인덱스 (15개)
- 이미지 최적화 (Next.js Image)
- 코드 스플리팅
- 캐싱 전략

---

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

This project is licensed under the MIT License.

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.

---

**Made with ❤️ by KGF Team**