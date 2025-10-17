# 🏗️ 개발 표준 및 유지보수 가이드

깔끔하게 정리된 프로젝트를 지속적으로 유지하고 발전시키기 위한 종합 가이드입니다.

## 📋 목차
1. [코드 품질 기준](#코드-품질-기준)
2. [파일 구조 규칙](#파일-구조-규칙)
3. [증축 가이드라인](#증축-가이드라인)
4. [보수 및 리팩토링](#보수-및-리팩토링)
5. [자동화 도구](#자동화-도구)
6. [코드 리뷰 체크리스트](#코드-리뷰-체크리스트)

---

## 🎯 코드 품질 기준

### TypeScript 표준
```typescript
// ✅ 올바른 타입 정의
interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ❌ 피해야 할 패턴
const userData: any = { ... };
```

### 네이밍 컨벤션
```typescript
// 파일명: kebab-case
user-profile.tsx
member-stats.component.tsx

// 컴포넌트: PascalCase
export function UserProfile() { }
export const MemberStats = () => { }

// 함수/변수: camelCase
const getUserData = () => { }
const isAuthenticated = true;

// 상수: SCREAMING_SNAKE_CASE
const API_ENDPOINTS = { }
const MAX_RETRY_COUNT = 3;

// 타입/인터페이스: PascalCase
interface UserProfile { }
type AuthState = 'loading' | 'authenticated' | 'unauthenticated';
```

### Import 순서 및 구조
```typescript
// 1. React 관련
import React from 'react';
import { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

// 3. 내부 모듈 (절대 경로)
import { UserRole } from '@/types/auth';
import { ROUTES } from '@/constants/routes';

// 4. 상대 경로 (같은 디렉토리)
import './styles.css';
```

---

## 📁 파일 구조 규칙

### 디렉토리 구조 원칙
```
src/
├── app/                    # Next.js 페이지 (App Router)
├── components/
│   ├── common/            # 재사용 가능한 공통 컴포넌트
│   ├── layout/            # 레이아웃 전용 컴포넌트
│   └── ui/               # 기본 UI 컴포넌트 (shadcn/ui)
├── constants/             # 애플리케이션 상수
├── domains/              # 도메인별 모듈
│   ├── auth/
│   ├── member/
│   ├── club/
│   └── business/
├── hooks/                # 커스텀 훅
├── lib/                  # 외부 라이브러리 설정
├── types/                # 타입 정의
└── utils/                # 유틸리티 함수
```

### 파일 명명 규칙
```bash
# 컴포넌트 파일
user-profile.tsx           # 일반 컴포넌트
user-profile.client.tsx    # 클라이언트 컴포넌트
user-profile.server.tsx    # 서버 컴포넌트

# 페이지 파일 (App Router)
page.tsx                   # 기본 페이지
layout.tsx                 # 레이아웃
loading.tsx                # 로딩 UI
error.tsx                  # 에러 UI
not-found.tsx             # 404 페이지

# 유틸리티 파일
form-helpers.ts           # 폼 관련 헬퍼
date-utils.ts             # 날짜 유틸리티
api-client.ts             # API 클라이언트

# 타입 파일
auth.types.ts             # 인증 관련 타입
member.types.ts           # 회원 관련 타입
```

### 도메인별 구조
```
domains/member/
├── components/           # 도메인 전용 컴포넌트
│   ├── member-card.tsx
│   ├── member-search.tsx
│   └── index.ts         # 배럴 익스포트
├── hooks/               # 도메인 전용 훅
│   ├── use-member-data.ts
│   └── index.ts
├── utils/               # 도메인 전용 유틸리티
│   ├── member-filters.ts
│   └── index.ts
├── types.ts             # 도메인 타입
└── index.ts             # 도메인 진입점
```

---

## 🚀 증축 가이드라인

### 새로운 기능 추가 프로세스

#### 1. 기능 분석 및 설계
```markdown
## 기능 분석 체크리스트
- [ ] 어떤 도메인에 속하는가?
- [ ] 기존 컴포넌트를 재사용할 수 있는가?
- [ ] 새로운 타입 정의가 필요한가?
- [ ] API 엔드포인트가 필요한가?
- [ ] 상태 관리가 필요한가?
```

#### 2. 파일 생성 순서
```bash
# 1. 타입 정의
src/types/new-feature.ts

# 2. 유틸리티 함수
src/utils/new-feature-helpers.ts

# 3. 커스텀 훅 (필요시)
src/hooks/use-new-feature.ts

# 4. 컴포넌트
src/components/new-feature/
├── new-feature-card.tsx
├── new-feature-list.tsx
└── index.ts

# 5. 페이지
src/app/new-feature/page.tsx
```

#### 3. 도메인 확장 가이드
```typescript
// 기존 도메인 확장 시
domains/member/
├── components/
│   └── new-member-component.tsx  // 새 컴포넌트 추가
├── utils/
│   └── new-member-utility.ts     // 새 유틸리티 추가
└── index.ts                      // 익스포트 업데이트

// 새 도메인 생성 시
domains/new-domain/
├── components/
│   └── index.ts
├── hooks/
│   └── index.ts
├── utils/
│   └── index.ts
├── types.ts
└── index.ts
```

### 컴포넌트 작성 표준

#### 컴포넌트 구조
```typescript
'use client'; // 필요시에만

import React from 'react';
import { ComponentProps } from '@/types/common';

// 1. 인터페이스 정의
interface NewComponentProps {
  title: string;
  description?: string;
  onAction: (data: ActionData) => void;
  className?: string;
}

// 2. 컴포넌트 구현
export function NewComponent({
  title,
  description,
  onAction,
  className
}: NewComponentProps) {
  // 3. 상태 및 훅
  const [isLoading, setIsLoading] = useState(false);
  
  // 4. 이벤트 핸들러
  const handleAction = useCallback((data: ActionData) => {
    setIsLoading(true);
    onAction(data);
    setIsLoading(false);
  }, [onAction]);

  // 5. 렌더링
  return (
    <div className={cn('base-styles', className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {/* 컴포넌트 내용 */}
    </div>
  );
}

// 6. 기본값 (필요시)
NewComponent.defaultProps = {
  description: undefined,
  className: undefined
};
```

---

## 🔧 보수 및 리팩토링

### 정기 점검 항목

#### 주간 점검 (매주 금요일)
```bash
# 1. 정리 스크립트 실행
npm run cleanup:analyze
npm run cleanup:imports
npm run cleanup:console

# 2. 타입 체크
npm run type-check

# 3. 린트 체크
npm run lint

# 4. 테스트 실행
npm run test
```

#### 월간 점검 (매월 마지막 주)
```bash
# 1. 의존성 업데이트 체크
npm outdated

# 2. 번들 크기 분석
npm run analyze

# 3. 사용되지 않는 파일 체크
npm run cleanup:unused-files

# 4. 성능 메트릭 체크
npm run lighthouse
```

### 리팩토링 기준

#### 리팩토링이 필요한 신호들
```typescript
// 🚨 리팩토링 필요 신호들

// 1. 파일이 너무 큰 경우 (>300줄)
// 2. 함수가 너무 긴 경우 (>50줄)
// 3. 중복 코드가 3번 이상 반복
// 4. any 타입 사용
// 5. console.log가 남아있는 경우
// 6. 사용되지 않는 import
// 7. 하드코딩된 값들
```

#### 리팩토링 우선순위
```markdown
## 우선순위 1 (즉시 수정)
- [ ] 타입 안전성 문제
- [ ] 보안 취약점
- [ ] 성능 병목

## 우선순위 2 (이번 스프린트)
- [ ] 코드 중복
- [ ] 복잡한 함수 분리
- [ ] 네이밍 개선

## 우선순위 3 (다음 스프린트)
- [ ] 파일 구조 개선
- [ ] 문서화 업데이트
- [ ] 테스트 커버리지 향상
```

---

## 🤖 자동화 도구

### Package.json 스크립트
```json
{
  "scripts": {
    "cleanup:analyze": "node src/scripts/cleanup-analyzer.js",
    "cleanup:imports": "node src/scripts/cleanup-imports.js",
    "cleanup:console": "node src/scripts/remove-console-logs.js",
    "cleanup:all": "npm run cleanup:imports && npm run cleanup:console",
    
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "build:analyze": "ANALYZE=true npm run build",
    "audit:routes": "node src/scripts/route-audit.js",
    "audit:security": "npm audit"
  }
}
```

### Git Hooks 설정
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 1. 린트 체크
npm run lint

# 2. 타입 체크
npm run type-check

# 3. 자동 정리
npm run cleanup:imports
npm run cleanup:console

# 4. 변경사항 스테이징
git add .
```

### ESLint 규칙
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-imports": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

---

## ✅ 코드 리뷰 체크리스트

### 기본 체크리스트
```markdown
## 코드 품질
- [ ] TypeScript 타입이 올바르게 정의되었는가?
- [ ] any 타입을 사용하지 않았는가?
- [ ] 네이밍이 명확하고 일관성이 있는가?
- [ ] 함수가 단일 책임을 지고 있는가?

## 파일 구조
- [ ] 올바른 디렉토리에 파일이 위치하는가?
- [ ] 파일명이 컨벤션을 따르는가?
- [ ] Import 순서가 올바른가?
- [ ] 사용되지 않는 import가 없는가?

## 성능
- [ ] 불필요한 리렌더링이 없는가?
- [ ] useCallback, useMemo가 적절히 사용되었는가?
- [ ] 이미지 최적화가 되어있는가?
- [ ] 번들 크기에 영향을 주지 않는가?

## 보안
- [ ] 사용자 입력이 검증되는가?
- [ ] 민감한 정보가 노출되지 않는가?
- [ ] XSS 취약점이 없는가?

## 테스트
- [ ] 핵심 로직에 테스트가 있는가?
- [ ] 엣지 케이스가 고려되었는가?
- [ ] 테스트가 실패하지 않는가?
```

### 도메인별 체크리스트

#### 인증 (Auth) 도메인
```markdown
- [ ] 권한 체크가 올바른가?
- [ ] 토큰 만료 처리가 되어있는가?
- [ ] 로그아웃 시 상태 정리가 되는가?
```

#### 회원 (Member) 도메인
```markdown
- [ ] 개인정보 보호가 적용되었는가?
- [ ] 데이터 검증이 충분한가?
- [ ] 페이지네이션이 구현되었는가?
```

#### 클럽 (Club) 도메인
```markdown
- [ ] 클럽 권한이 올바르게 체크되는가?
- [ ] 데이터 일관성이 유지되는가?
- [ ] 실시간 업데이트가 필요한가?
```

---

## 📈 성능 모니터링

### 메트릭 추적
```typescript
// 성능 메트릭 추적 예시
const performanceMetrics = {
  // Core Web Vitals
  LCP: 'Largest Contentful Paint',
  FID: 'First Input Delay', 
  CLS: 'Cumulative Layout Shift',
  
  // 커스텀 메트릭
  pageLoadTime: 'Page Load Time',
  apiResponseTime: 'API Response Time',
  bundleSize: 'Bundle Size'
};
```

### 번들 분석
```bash
# 번들 크기 분석
npm run build:analyze

# 중요 메트릭
- Total bundle size < 1MB
- Individual chunk < 250KB
- Unused code < 5%
```

---

## 🎯 품질 목표

### 단기 목표 (1개월)
- [ ] TypeScript strict 모드 100%
- [ ] ESLint 에러 0개
- [ ] 사용되지 않는 코드 0%
- [ ] Console.log 0개

### 중기 목표 (3개월)
- [ ] 테스트 커버리지 80%+
- [ ] 번들 크기 최적화 (1MB 이하)
- [ ] Core Web Vitals 모든 지표 Good
- [ ] 자동화 파이프라인 구축

### 장기 목표 (6개월)
- [ ] 완전한 도메인 분리
- [ ] 마이크로 프론트엔드 준비
- [ ] 성능 모니터링 대시보드
- [ ] 자동 리팩토링 도구

---

## 🚨 경고 신호

### 즉시 조치가 필요한 상황
```markdown
🔴 Critical
- 빌드 실패
- 타입 에러
- 보안 취약점
- 성능 저하 (>3초 로딩)

🟡 Warning  
- 번들 크기 증가 (>20%)
- 테스트 실패
- 린트 에러 증가
- 중복 코드 발견

🟢 Info
- 새로운 의존성 추가
- 파일 구조 변경
- 네이밍 컨벤션 변경
```

이 가이드를 따라 프로젝트를 체계적으로 관리하면 항상 깔끔하고 확장 가능한 상태를 유지할 수 있습니다! 🏗️✨
