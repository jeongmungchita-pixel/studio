# KGF 넥서스 - 테스트 가이드

> 최종 업데이트: 2025-10-12

---

## 🧪 테스트 전략

### 테스트 피라미드

```
        /\
       /  \  E2E Tests (5%)
      /____\
     /      \  Integration Tests (15%)
    /________\
   /          \  Unit Tests (80%)
  /__________  \
```

---

## 1. Unit Tests (Jest + React Testing Library)

### 설치

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @types/jest jest-environment-jsdom
```

### 설정 파일

**jest.config.js**
```javascript
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
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**jest.setup.js**
```javascript
import '@testing-library/jest-dom';
```

### 예시: Hook 테스트

**`__tests__/hooks/use-user.test.ts`**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '@/hooks/use-user';

describe('useUser', () => {
  it('should return user data when authenticated', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
    });
  });

  it('should return null when not authenticated', () => {
    const { result } = renderHook(() => useUser());
    expect(result.current.user).toBeNull();
  });
});
```

### 예시: 컴포넌트 테스트

**`__tests__/components/member-card.test.tsx`**
```typescript
import { render, screen } from '@testing-library/react';
import { MemberCard } from '@/components/member-card';

describe('MemberCard', () => {
  const mockMember = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active' as const,
  };

  it('renders member name', () => {
    render(<MemberCard member={mockMember} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows active status', () => {
    render(<MemberCard member={mockMember} />);
    expect(screen.getByText('활동중')).toBeInTheDocument();
  });
});
```

---

## 2. Integration Tests

### Firestore 모킹

**`__tests__/utils/firebase-mock.ts`**
```typescript
import { collection, query, where } from 'firebase/firestore';

export const mockFirestore = {
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
};

export const mockMembers = [
  {
    id: '1',
    name: 'Member 1',
    clubId: 'club1',
    status: 'active',
  },
  {
    id: '2',
    name: 'Member 2',
    clubId: 'club1',
    status: 'inactive',
  },
];
```

### 예시: 데이터 흐름 테스트

**`__tests__/integration/member-flow.test.tsx`**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembersPage } from '@/app/members/page';

describe('Members Flow', () => {
  it('should load and display members', async () => {
    render(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeInTheDocument();
      expect(screen.getByText('Member 2')).toBeInTheDocument();
    });
  });

  it('should filter members by status', async () => {
    const user = userEvent.setup();
    render(<MembersPage />);

    const filterButton = screen.getByRole('button', { name: /활동중/ });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeInTheDocument();
      expect(screen.queryByText('Member 2')).not.toBeInTheDocument();
    });
  });
});
```

---

## 3. E2E Tests (Playwright)

### 설치

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 설정 파일

**playwright.config.ts**
```typescript
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
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 예시: E2E 테스트

**`e2e/auth.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=대시보드')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
  });
});
```

**`e2e/members.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Members Management', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should add a new member', async ({ page }) => {
    await page.goto('/members');
    await page.click('button:has-text("회원 추가")');

    await page.fill('input[name="name"]', 'New Member');
    await page.fill('input[name="email"]', 'newmember@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=New Member')).toBeVisible();
  });

  test('should search members', async ({ page }) => {
    await page.goto('/members');
    
    await page.fill('input[placeholder*="검색"]', 'John');
    await page.waitForTimeout(500); // 디바운스 대기

    const memberCards = page.locator('[data-testid="member-card"]');
    await expect(memberCards).toHaveCount(1);
    await expect(memberCards.first()).toContainText('John');
  });
});
```

---

## 4. 성능 테스트

### Lighthouse CI

**lighthouserc.js**
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

---

## 5. 테스트 커버리지

### 목표

- Unit Tests: 80% 이상
- Integration Tests: 60% 이상
- E2E Tests: 주요 플로우 커버

### 커버리지 확인

```bash
# Jest 커버리지
npm test -- --coverage

# 커버리지 리포트 보기
open coverage/lcov-report/index.html
```

---

## 6. CI/CD 통합

### GitHub Actions

**.github/workflows/test.yml**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test -- --coverage
        
      - name: Run E2E tests
        run: npx playwright test
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 7. 테스트 모범 사례

### ✅ DO

1. **테스트는 독립적이어야 함**
```typescript
beforeEach(() => {
  // 각 테스트마다 초기화
  jest.clearAllMocks();
});
```

2. **의미 있는 테스트 이름**
```typescript
it('should display error message when email is invalid', () => {
  // ...
});
```

3. **AAA 패턴 사용**
```typescript
it('should add member', () => {
  // Arrange
  const member = { name: 'John', email: 'john@example.com' };
  
  // Act
  const result = addMember(member);
  
  // Assert
  expect(result.success).toBe(true);
});
```

### ❌ DON'T

1. **테스트 간 의존성**
```typescript
// ❌ 나쁜 예
let sharedState;
it('test 1', () => { sharedState = 'value'; });
it('test 2', () => { expect(sharedState).toBe('value'); });
```

2. **구현 세부사항 테스트**
```typescript
// ❌ 나쁜 예
expect(component.state.isLoading).toBe(true);

// ✅ 좋은 예
expect(screen.getByRole('progressbar')).toBeInTheDocument();
```

---

## 8. 테스트 스크립트

**package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

---

## 📝 체크리스트

### 설정
- [ ] Jest 설치 및 설정
- [ ] Playwright 설치 및 설정
- [ ] CI/CD 통합

### 테스트 작성
- [ ] 주요 Hook 테스트
- [ ] 주요 컴포넌트 테스트
- [ ] 인증 플로우 E2E 테스트
- [ ] 회원 관리 E2E 테스트

### 목표
- [ ] 80% 코드 커버리지
- [ ] 모든 E2E 테스트 통과
- [ ] Lighthouse 점수 90점 이상

---

**참고 자료**:
- [Jest 공식 문서](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 공식 문서](https://playwright.dev/)
