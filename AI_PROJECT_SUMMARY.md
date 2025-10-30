# 🤖 AI Agent를 위한 KGF Nexus 프로젝트 요약

> 새로운 AI Agent가 이 프로젝트를 처음부터 구현할 때 필요한 핵심 정보

## 🎯 프로젝트 한 줄 요약
**한국체조협회를 위한 계층적 클럽 관리 시스템 - Next.js + Firebase 기반 풀스택 웹 애플리케이션**

---

## 📁 필수 문서 읽기 순서

1. **AI_PROJECT_SUMMARY.md** (지금 읽고 있는 문서)
   - 전체 개요 파악 (5분)

2. **PROJECT_BLUEPRINT.md**
   - 시스템 아키텍처 이해 (30분)

3. **IMPLEMENTATION_GUIDE.md**
   - 코드 패턴 학습 (30분)

4. **AI_AGENT_CHECKLIST.md**
   - 단계별 구현 체크리스트 (참조용)

5. **SYSTEM_FLOW_ANALYSIS.md**
   - 데이터 흐름 이해 (20분)

---

## 🏗️ 핵심 아키텍처

```
Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS
Backend: Firebase (Auth + Firestore + Storage)
UI: shadcn/ui 컴포넌트 라이브러리
배포: Firebase App Hosting / Vercel
```

---

## 👥 사용자 역할 (13개)

```javascript
최상위: SUPER_ADMIN (시스템 전체 관리)
   ↓
연맹급: FEDERATION_ADMIN (모든 클럽 관리)
   ↓
클럽급: CLUB_OWNER, CLUB_MANAGER (클럽 운영)
   ↓
일반: MEMBER, PARENT (개인 서비스 이용)
```

---

## 📊 핵심 데이터 모델

### 1. 사용자 (users)
- Firebase Auth 연동
- 역할 기반 권한
- 승인 대기 시스템

### 2. 클럽 (clubs)
- 다수 회원 보유
- 클럽별 독립 운영
- 통계 및 재무 관리

### 3. 회원 (members)
- 클럽 소속
- 연령별 카테고리
- 가족 단위 관리

### 4. 수업 (classes)
- 코치 배정
- 스케줄 관리
- 출석 체크

---

## 🔑 핵심 기능

### 인증 & 권한
```typescript
✅ 이메일/Google 로그인
✅ 역할별 회원가입
✅ 승인 대기 시스템
✅ 자동 세션 관리
```

### 클럽 관리
```typescript
✅ 회원 CRUD
✅ 수업 관리
✅ 회원권 시스템
✅ 결제 처리
```

### 실시간 기능
```typescript
✅ 실시간 데이터 동기화
✅ 권한 변경 즉시 반영
✅ 실시간 알림
```

---

## 🚀 빠른 시작 (Quick Start)

```bash
# 1. 프로젝트 생성
npx create-next-app@latest federation --typescript --tailwind --app

# 2. 의존성 설치
npm install firebase firebase-admin
npm install @radix-ui/react-* lucide-react
npm install react-hook-form zod

# 3. Firebase 설정
- Firebase Console에서 프로젝트 생성
- Authentication, Firestore, Storage 활성화
- 환경 변수 설정 (.env.local)

# 4. 개발 시작
npm run dev
```

---

## 📂 프로젝트 구조

```
src/
├── app/                 # 페이지 (라우팅)
│   ├── (auth)/         # 인증 관련
│   ├── admin/          # 연맹 관리자
│   ├── super-admin/    # 최고 관리자
│   └── club-dashboard/ # 클럽 관리자
├── components/         # 재사용 컴포넌트
├── hooks/             # Custom Hooks
├── services/          # 비즈니스 로직
├── types/             # TypeScript 타입
├── firebase/          # Firebase 설정
└── utils/             # 유틸리티 함수
```

---

## 💻 주요 코드 패턴

### 1. 페이지 컴포넌트
```typescript
'use client';

export default function PageComponent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // 접근 제어
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user]);

  // 로딩 처리
  if (isUserLoading) return <Loader />;

  // 메인 렌더링
  return <div>...</div>;
}
```

### 2. 데이터 페칭
```typescript
const { data, loading, error } = useCollection(
  query(
    collection(firestore, 'members'),
    where('clubId', '==', user.clubId)
  )
);
```

### 3. 폼 처리
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {}
});

const onSubmit = async (data) => {
  try {
    await addDoc(collection(firestore, 'members'), data);
  } catch (error) {
    handleError(error);
  }
};
```

---

## 🔐 보안 체크리스트

```typescript
✅ Firebase Security Rules 설정
✅ 환경 변수 보호
✅ 역할 기반 접근 제어
✅ 입력 값 검증
✅ XSS/CSRF 방어
✅ 감사 로그
```

---

## 📈 성능 목표

```typescript
페이지 로드: < 3초
Lighthouse: 90+
동시 사용자: 10,000+
가동률: 99.9%
```

---

## 🛠️ 개발 도구

```bash
# 코드 품질
npm run lint        # ESLint
npm run typecheck   # TypeScript

# 테스트
npm run test       # Jest
npm run test:e2e   # Playwright

# 빌드 & 배포
npm run build      # 프로덕션 빌드
npm run deploy     # Firebase 배포
```

---

## 🎓 학습 리소스

### 공식 문서
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

### 프로젝트 문서
- ROUTING_GUIDE.md - 라우팅 구조
- USER_FLOW_SIMULATION_REPORT.md - 사용자 흐름
- VERCEL_DEPLOYMENT_GUIDE.md - 배포 가이드

---

## 💡 AI Agent 개발 팁

### DO ✅
1. **타입 우선 개발** - TypeScript 타입을 먼저 정의
2. **컴포넌트 재사용** - 공통 컴포넌트 라이브러리 구축
3. **에러 처리** - 모든 비동기 작업에 try-catch
4. **실시간 기능** - onSnapshot 리스너 활용
5. **병렬 처리** - Promise.all로 성능 최적화

### DON'T ❌
1. 하드코딩된 값 사용
2. console.log 남기기
3. 환경 변수 노출
4. 동기적 Firestore 호출
5. 무한 루프 useEffect

---

## 🚦 구현 우선순위

### Phase 1 (필수)
```
1. Firebase 설정
2. 인증 시스템
3. 역할 기반 라우팅
4. 기본 CRUD
```

### Phase 2 (핵심)
```
5. 클럽 관리 기능
6. 회원 관리 기능
7. 실시간 업데이트
8. 대시보드
```

### Phase 3 (고급)
```
9. 통계 및 분석
10. 알림 시스템
11. 결제 연동
12. 성능 최적화
```

---

## 🎯 최종 목표

**"한국체조협회의 모든 클럽과 회원을 효율적으로 관리할 수 있는 통합 플랫폼"**

- 100+ 클럽 지원
- 10,000+ 회원 관리
- 실시간 데이터 동기화
- 모바일 완벽 지원
- 99.9% 가동률

---

## 📝 마지막 조언

1. **문서를 충분히 읽고 시작하세요** - 급하게 코딩하지 마세요
2. **작은 기능부터 완성하세요** - MVP 먼저, 고급 기능은 나중에
3. **테스트를 작성하세요** - 특히 권한 관련 테스트는 필수
4. **성능을 측정하세요** - 느려지기 전에 최적화
5. **보안을 최우선으로** - Firebase Rules는 반드시 설정

---

*이 요약을 읽고 나머지 문서들을 참고하면, 새로운 AI Agent도 완전히 동일한 시스템을 구축할 수 있습니다.*

**행운을 빕니다! 🚀**
