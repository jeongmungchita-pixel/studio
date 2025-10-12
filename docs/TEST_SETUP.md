# 테스트 설정 가이드

> KGF 넥서스 프로젝트 테스트 환경 설정

---

## 📦 필수 패키지 설치

### 1. Jest 및 React Testing Library

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @types/jest jest-environment-jsdom
npm install --save-dev ts-jest
```

### 2. Playwright (E2E 테스트)

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 3. 추가 유틸리티

```bash
npm install --save-dev @testing-library/react-hooks
```

---

## ⚙️ 설정 파일

모든 설정 파일이 이미 생성되어 있습니다:

- ✅ `jest.config.js` - Jest 설정
- ✅ `jest.setup.js` - Jest 초기화
- ✅ `playwright.config.ts` - Playwright 설정
- ✅ `.github/workflows/test.yml` - CI/CD 설정

---

## 🧪 테스트 실행

### Unit Tests (Jest)

```bash
# 모든 테스트 실행
npm test

# Watch 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage

# 특정 파일만 테스트
npm test -- use-user.test
```

### E2E Tests (Playwright)

```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# UI 모드로 실행
npm run test:e2e:ui

# 디버그 모드
npm run test:e2e:debug

# 특정 브라우저만
npx playwright test --project=chromium
```

### 전체 테스트

```bash
# Unit + E2E 모두 실행
npm run test:all
```

---

## 📁 테스트 파일 구조

```
studio/
├── src/
│   └── __tests__/
│       ├── hooks/
│       │   └── use-user.test.tsx
│       └── components/
│           ├── loading-spinner.test.tsx
│           └── ui/
│               └── button.test.tsx
├── e2e/
│   ├── auth.spec.ts
│   └── navigation.spec.ts
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

---

## ✍️ 테스트 작성 가이드

### Unit Test 예시

```typescript
// src/__tests__/components/my-component.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Test 예시

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('should navigate to page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/KGF 넥서스/);
});
```

---

## 🎯 커버리지 목표

- **Unit Tests**: 80% 이상
- **Integration Tests**: 60% 이상
- **E2E Tests**: 주요 플로우 커버

### 커버리지 확인

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🔧 트러블슈팅

### Jest 관련 문제

**문제**: `Cannot find module '@testing-library/react'`
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**문제**: `SyntaxError: Cannot use import statement outside a module`
```bash
# jest.config.js에 transform 설정 확인
```

### Playwright 관련 문제

**문제**: `browserType.launch: Executable doesn't exist`
```bash
npx playwright install
```

**문제**: 테스트 타임아웃
```typescript
// playwright.config.ts에서 timeout 증가
timeout: 30 * 1000,
```

---

## 🚀 CI/CD 통합

GitHub Actions가 자동으로 다음을 실행합니다:

1. **Lint & Type Check** - 코드 품질 검사
2. **Unit Tests** - Jest 테스트 + 커버리지
3. **E2E Tests** - Playwright 테스트
4. **Build** - 프로덕션 빌드

### PR 체크리스트

- [ ] 모든 테스트 통과
- [ ] 커버리지 80% 이상
- [ ] Lint 에러 없음
- [ ] Type 에러 없음
- [ ] 빌드 성공

---

## 📊 테스트 현황

### 작성된 테스트

#### Unit Tests
- ✅ `use-user.test.tsx` - useUser Hook
- ✅ `loading-spinner.test.tsx` - LoadingSpinner 컴포넌트
- ✅ `button.test.tsx` - Button 컴포넌트

#### E2E Tests
- ✅ `auth.spec.ts` - 인증 플로우
- ✅ `navigation.spec.ts` - 네비게이션 & 성능

### 추가 필요 테스트

- [ ] 회원 관리 테스트
- [ ] 클럽 관리 테스트
- [ ] 결제 플로우 테스트
- [ ] 파일 업로드 테스트

---

## 🎓 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 공식 문서](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 📝 다음 단계

1. **패키지 설치**
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @playwright/test
   ```

2. **Playwright 브라우저 설치**
   ```bash
   npx playwright install
   ```

3. **테스트 실행**
   ```bash
   npm test
   npm run test:e2e
   ```

4. **CI/CD 확인**
   - GitHub에 Push
   - Actions 탭에서 테스트 결과 확인

---

**테스트 설정 완료!** 🎉
