# 🤖 AI Agent 구현 체크리스트

> AI Agent가 KGF Nexus 프로젝트를 처음부터 구현할 때 사용하는 단계별 체크리스트

## 📌 Quick Start Commands

```bash
# 1. 프로젝트 초기화
npx create-next-app@latest federation --typescript --tailwind --app

# 2. 의존성 설치
npm install firebase firebase-admin @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-toast react-hook-form zod @hookform/resolvers lucide-react date-fns class-variance-authority clsx tailwind-merge

# 3. 개발 서버 실행
npm run dev
```

---

## ✅ Phase 1: 프로젝트 설정 (Day 1)

### 기초 설정
- [ ] Next.js 15+ 프로젝트 생성 (App Router 사용)
- [ ] TypeScript 설정 확인
- [ ] Tailwind CSS 설정 확인
- [ ] `.env.local` 파일 생성
- [ ] Git 저장소 초기화

### Firebase 설정
- [ ] Firebase 콘솔에서 프로젝트 생성
- [ ] Firebase Authentication 활성화
- [ ] Cloud Firestore 데이터베이스 생성
- [ ] Firebase Storage 활성화
- [ ] 웹 앱 등록 및 설정 키 복사

### 디렉토리 구조
```
✅ src/app/
✅ src/components/
✅ src/hooks/
✅ src/services/
✅ src/types/
✅ src/constants/
✅ src/utils/
✅ src/firebase/
```

---

## ✅ Phase 2: 타입 정의 (Day 2)

### 핵심 타입 생성
- [ ] `src/types/auth.ts` - UserRole, UserStatus 등
- [ ] `src/types/club.ts` - Club, ClubStatus 등
- [ ] `src/types/member.ts` - Member, MemberCategory 등
- [ ] `src/types/class.ts` - GymClass, Schedule 등
- [ ] `src/types/index.ts` - 통합 export

### 예시 코드
```typescript
// src/types/auth.ts
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  FEDERATION_ADMIN = 'federation_admin',
  CLUB_OWNER = 'club_owner',
  CLUB_MANAGER = 'club_manager',
  MEMBER = 'member',
  PARENT = 'parent',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'pending' | 'active';
  clubId?: string;
  createdAt: Date;
}
```

---

## ✅ Phase 3: Firebase 통합 (Day 3-4)

### Firebase 설정
- [ ] `src/firebase/config.ts` - Firebase 설정
- [ ] `src/firebase/admin.ts` - Admin SDK 설정
- [ ] `src/firebase/provider.tsx` - Context Provider
- [ ] `src/firebase/hooks.ts` - Custom Hooks

### 인증 Hooks
- [ ] `useAuth()` - 인증 상태 관리
- [ ] `useUser()` - 사용자 정보 관리
- [ ] `useRole()` - 역할 기반 권한 체크

### Firestore Hooks
- [ ] `useFirestore()` - Firestore 인스턴스
- [ ] `useCollection()` - 컬렉션 실시간 구독
- [ ] `useDocument()` - 단일 문서 구독

---

## ✅ Phase 4: 인증 시스템 (Day 5-6)

### 페이지 생성
- [ ] `/login` - 로그인 페이지
- [ ] `/register` - 회원가입 선택 페이지
- [ ] `/register/club-owner` - 클럽 오너 가입
- [ ] `/register/member` - 일반 회원 가입
- [ ] `/pending-approval` - 승인 대기
- [ ] `/403` - 접근 거부

### 핵심 기능
```typescript
✅ 이메일/비밀번호 로그인
✅ Google OAuth 로그인
✅ 회원가입 with 역할 선택
✅ 이메일 인증
✅ 승인 대기 시스템
✅ 자동 로그아웃 (세션 만료)
```

---

## ✅ Phase 5: 레이아웃 & 네비게이션 (Day 7-8)

### 레이아웃 컴포넌트
- [ ] `ModernLayout` - 메인 레이아웃
- [ ] `Sidebar` - 사이드바 네비게이션
- [ ] `Header` - 헤더 컴포넌트
- [ ] `Footer` - 푸터 컴포넌트

### 역할별 메뉴 구성
```typescript
const menuItems = {
  super_admin: ['시스템 관리', '연맹 관리', '데이터 초기화'],
  federation_admin: ['클럽 관리', '회원 통계', '대회 관리'],
  club_owner: ['회원 관리', '수업 관리', '재무 관리'],
  member: ['내 프로필', '수업 일정', '결제 내역'],
};
```

---

## ✅ Phase 6: 대시보드 구현 (Day 9-12)

### 슈퍼 관리자 (`/super-admin`)
- [ ] 클럽 오너 승인 시스템
- [ ] 연맹 관리자 임명
- [ ] 시스템 통계
- [ ] 데이터 초기화

### 연맹 관리자 (`/admin`)
- [ ] 전체 클럽 목록
- [ ] 전체 회원 통계
- [ ] 대회 관리
- [ ] 공지사항 관리

### 클럽 관리자 (`/club-dashboard`)
- [ ] 회원 관리 (CRUD)
- [ ] 수업 관리
- [ ] 회원권 관리
- [ ] 결제 관리

### 일반 사용자 (`/my-profile`)
- [ ] 프로필 정보
- [ ] 가족 회원 관리
- [ ] 수업 일정
- [ ] 결제 내역

---

## ✅ Phase 7: 핵심 기능 구현 (Day 13-20)

### 회원 관리
```typescript
✅ 회원 등록 (개인/가족)
✅ 회원 정보 수정
✅ 회원 상태 변경 (활성/비활성)
✅ 회원 검색 및 필터링
✅ 회원 카테고리 자동 분류
```

### 수업 관리
```typescript
✅ 수업 생성/수정/삭제
✅ 코치 배정
✅ 수업 스케줄 관리
✅ 회원 등록/취소
✅ 출석 체크
```

### 회원권 시스템
```typescript
✅ 회원권 템플릿 관리
✅ 회원권 발급
✅ 회원권 갱신
✅ 회원권 만료 알림
✅ 회원권 통계
```

---

## ✅ Phase 8: 고급 기능 (Day 21-25)

### 실시간 기능
- [ ] 실시간 권한 업데이트
- [ ] 실시간 알림
- [ ] 실시간 채팅 (옵션)

### 보안 기능
- [ ] 세션 관리자
- [ ] 감사 로깅
- [ ] 2단계 인증 (옵션)

### 성능 최적화
- [ ] 이미지 최적화
- [ ] 레이지 로딩
- [ ] 캐싱 전략
- [ ] 병렬 쿼리

---

## ✅ Phase 9: 테스트 & 디버깅 (Day 26-28)

### 테스트 작성
- [ ] 유닛 테스트 (Jest)
- [ ] 통합 테스트
- [ ] E2E 테스트 (Playwright)

### 테스트 시나리오
```typescript
✅ 회원가입 → 승인 → 로그인
✅ 역할별 접근 권한 테스트
✅ CRUD 작업 테스트
✅ 에러 처리 테스트
✅ 성능 테스트
```

---

## ✅ Phase 10: 배포 (Day 29-30)

### 배포 준비
- [ ] 환경 변수 설정
- [ ] 빌드 최적화
- [ ] 보안 점검

### Firebase App Hosting
```bash
# 1. Firebase CLI 설치
npm install -g firebase-tools

# 2. Firebase 로그인
firebase login

# 3. Firebase 초기화
firebase init hosting

# 4. 배포
firebase deploy --only hosting
```

### Vercel 배포 (대안)
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 배포
vercel --prod
```

---

## 🎯 검증 체크리스트

### 기능 검증
- [ ] 모든 역할로 로그인 가능
- [ ] 역할별 대시보드 접근 확인
- [ ] CRUD 작업 정상 동작
- [ ] 실시간 업데이트 확인
- [ ] 에러 처리 확인

### 성능 검증
- [ ] Lighthouse 점수 90+ 
- [ ] 페이지 로드 < 3초
- [ ] TTI < 5초
- [ ] CLS < 0.1

### 보안 검증
- [ ] Firebase Rules 설정
- [ ] XSS 방어
- [ ] 환경 변수 보호
- [ ] 민감 정보 노출 없음

---

## 📚 필수 참고 문서

1. **PROJECT_BLUEPRINT.md** - 전체 아키텍처 및 설계
2. **IMPLEMENTATION_GUIDE.md** - 코드 패턴 및 예제
3. **ROUTING_GUIDE.md** - 라우팅 구조 및 권한
4. **USER_FLOW_SIMULATION_REPORT.md** - 사용자 흐름 테스트

---

## 🚀 완성도 체크

### MVP (최소 기능 제품)
```
✅ 인증 시스템 (로그인/가입)
✅ 역할 기반 접근 제어
✅ 클럽 & 회원 관리
✅ 기본 대시보드
```

### Production Ready
```
✅ 모든 CRUD 기능
✅ 실시간 업데이트
✅ 에러 처리
✅ 성능 최적화
✅ 테스트 커버리지 80%+
✅ 문서화 완료
```

---

## 💡 Pro Tips for AI Agents

1. **단계별 구현**: 각 Phase를 순서대로 완료하세요
2. **타입 우선**: TypeScript 타입을 먼저 정의하고 구현하세요
3. **컴포넌트 재사용**: 공통 컴포넌트를 만들어 재사용하세요
4. **에러 처리**: 모든 비동기 작업에 try-catch를 사용하세요
5. **실시간 피드백**: Firebase 실시간 리스너를 활용하세요
6. **성능 고려**: 대량 데이터는 페이지네이션을 구현하세요
7. **보안 우선**: Firebase Security Rules를 반드시 설정하세요

---

*이 체크리스트를 따라가면 30일 안에 완전한 KGF Nexus 시스템을 구축할 수 있습니다.*
