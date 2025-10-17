# 🧪 테스팅 가이드

## 개요

이 문서는 체조 연맹 관리 시스템의 테스팅 전략과 구현 방법을 설명합니다.

## 테스팅 전략

### 테스트 피라미드

```
        🔺 E2E Tests (5%)
       🔺🔺 Integration Tests (15%)
    🔺🔺🔺 Unit Tests (80%)
```

### 테스트 유형별 목표

- **Unit Tests**: 개별 함수/컴포넌트 테스트 (80% 커버리지)
- **Integration Tests**: 모듈 간 상호작용 테스트 (주요 플로우)
- **E2E Tests**: 사용자 시나리오 테스트 (핵심 기능)

## 테스트 환경 설정

### Jest 설정

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**',
    '!src/scripts/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### 테스트 유틸리티

```typescript
// src/test-utils/index.ts
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// 커스텀 렌더 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## 단위 테스트 (Unit Tests)

### 유틸리티 함수 테스트

```typescript
// src/__tests__/utils/validation.test.ts
import { validateEmail, validatePhoneNumber } from '@/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.kr')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });
});
```

### React 컴포넌트 테스트

```typescript
// src/__tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-destructive');
  });
});
```

### 커스텀 훅 테스트

```typescript
// src/__tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';

// Firebase 모킹
jest.mock('@/firebase', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe('useAuth Hook', () => {
  it('should return initial auth state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });
});
```

## 통합 테스트 (Integration Tests)

### API 라우트 테스트

```typescript
// src/__tests__/api/members.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/members';

describe('/api/members', () => {
  it('should return members list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('members');
    expect(Array.isArray(data.members)).toBe(true);
  });

  it('should handle unauthorized requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});
```

### 폼 제출 플로우 테스트

```typescript
// src/__tests__/integration/member-registration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MemberRegistrationForm from '@/components/forms/MemberRegistrationForm';

describe('Member Registration Flow', () => {
  it('should complete member registration successfully', async () => {
    const onSubmit = jest.fn();
    render(<MemberRegistrationForm onSubmit={onSubmit} />);

    // 폼 필드 입력
    fireEvent.change(screen.getByLabelText(/이름/i), {
      target: { value: '김철수' }
    });
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: 'kim@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/전화번호/i), {
      target: { value: '010-1234-5678' }
    });

    // 폼 제출
    fireEvent.click(screen.getByRole('button', { name: /등록/i }));

    // 결과 확인
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '김철수',
        email: 'kim@example.com',
        phoneNumber: '010-1234-5678',
      });
    });
  });
});
```

## E2E 테스트 (End-to-End Tests)

### Playwright 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E 테스트 예시

```typescript
// e2e/member-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create new member', async ({ page }) => {
    // 회원 관리 페이지로 이동
    await page.goto('/admin/members');
    
    // 새 회원 추가 버튼 클릭
    await page.click('[data-testid="add-member-button"]');
    
    // 회원 정보 입력
    await page.fill('[data-testid="member-name"]', '김철수');
    await page.fill('[data-testid="member-email"]', 'kim@example.com');
    await page.fill('[data-testid="member-phone"]', '010-1234-5678');
    
    // 저장
    await page.click('[data-testid="save-button"]');
    
    // 성공 메시지 확인
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 회원 목록에서 확인
    await expect(page.locator('text=김철수')).toBeVisible();
  });
});
```

## 테스트 데이터 관리

### 팩토리 패턴

```typescript
// src/test-utils/factories.ts
import { Member, Club } from '@/types';

export const createMockMember = (overrides?: Partial<Member>): Member => ({
  id: 'member-1',
  name: '김철수',
  email: 'kim@example.com',
  phoneNumber: '010-1234-5678',
  dateOfBirth: '1990-01-01',
  gender: 'male',
  status: 'active',
  memberCategory: 'adult',
  clubId: 'club-1',
  createdAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockClub = (overrides?: Partial<Club>): Club => ({
  id: 'club-1',
  name: '서울체조클럽',
  address: '서울시 강남구',
  phoneNumber: '02-1234-5678',
  email: 'info@seoul-gym.com',
  ownerId: 'owner-1',
  ownerName: '박사장',
  status: 'active',
  facilities: ['매트', '평균대'],
  capacity: 100,
  operatingHours: {},
  createdAt: '2023-01-01T00:00:00Z',
  ...overrides,
});
```

### 모킹 전략

```typescript
// src/test-utils/mocks.ts
import { jest } from '@jest/globals';

// Firebase 모킹
export const mockFirebase = {
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  },
  firestore: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
  },
};

// API 응답 모킹
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
};
```

## 성능 테스트

### 컴포넌트 렌더링 성능

```typescript
// src/__tests__/performance/component-rendering.test.ts
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';
import MemberList from '@/components/MemberList';
import { createMockMember } from '@/test-utils/factories';

describe('Component Performance', () => {
  it('should render large member list efficiently', () => {
    const members = Array.from({ length: 1000 }, (_, i) => 
      createMockMember({ id: `member-${i}`, name: `회원 ${i}` })
    );

    const startTime = performance.now();
    render(<MemberList members={members} />);
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // 100ms 이내
  });
});
```

## 접근성 테스트

```typescript
// src/__tests__/accessibility/button.test.ts
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## 테스트 실행 및 리포팅

### 스크립트 설정

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## 테스트 베스트 프랙티스

### DO's ✅

- **명확한 테스트 이름**: 테스트가 무엇을 검증하는지 명확히 표현
- **AAA 패턴**: Arrange, Act, Assert 구조 사용
- **독립적인 테스트**: 각 테스트는 다른 테스트에 의존하지 않음
- **적절한 모킹**: 외부 의존성은 모킹하여 격리
- **데이터 정리**: 테스트 후 데이터 정리

### DON'Ts ❌

- **구현 세부사항 테스트**: 내부 구현보다 동작에 집중
- **과도한 모킹**: 필요 이상으로 많은 것을 모킹하지 않음
- **테스트 간 의존성**: 테스트 순서에 의존하지 않음
- **하드코딩된 값**: 매직 넘버나 하드코딩된 문자열 사용 금지
- **너무 큰 테스트**: 한 번에 너무 많은 것을 테스트하지 않음

## 테스트 메트릭 및 목표

### 커버리지 목표
- **Statements**: 80% 이상
- **Branches**: 75% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상

### 성능 목표
- **Unit Test 실행 시간**: 5초 이내
- **Integration Test**: 30초 이내
- **E2E Test**: 5분 이내

### 품질 지표
- **테스트 통과율**: 100%
- **플레이키 테스트**: 0%
- **코드 리뷰 커버리지**: 100%
