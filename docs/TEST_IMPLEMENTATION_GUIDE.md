# 테스트 구현 가이드
> Federation 프로젝트 테스트 작성 실무 가이드

## 🚀 빠른 시작

### 테스트 실행 명령어
```bash
# 전체 테스트 실행
npm run test

# 커버리지 포함 실행
npm run test:coverage

# 특정 파일 테스트
npx vitest run src/services/__tests__/auth-service.test.ts

# Watch 모드
npx vitest watch

# UI 모드
npx vitest --ui
```

## 📁 테스트 파일 구조

### 명명 규칙
```
src/
├── services/
│   ├── auth-service.ts
│   └── __tests__/
│       └── auth-service.test.ts    # 유닛 테스트
│
├── app/
│   └── api/
│       └── admin/
│           ├── route.ts
│           └── __tests__/
│               └── route.test.ts    # 통합 테스트
│
└── components/
    ├── MemberCard.tsx
    └── __tests__/
        └── MemberCard.test.tsx      # 컴포넌트 테스트
```

## 🧪 테스트 패턴별 구현

### 1. 유닛 테스트 (Services/Utils)

#### 기본 패턴
```typescript
// src/services/__tests__/auth-service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { UserRole } from '@/types/auth';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    // 싱글톤 리셋
    vi.clearAllMocks();
    AuthService.resetInstance();
    authService = AuthService.getInstance();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('canAccessRoute', () => {
    it('should allow SUPER_ADMIN to access any route', () => {
      // Arrange
      const role = UserRole.SUPER_ADMIN;
      const route = '/admin/users';
      
      // Act
      const canAccess = authService.canAccessRoute(role, route);
      
      // Assert
      expect(canAccess).toBe(true);
    });
    
    it('should deny MEMBER access to admin routes', () => {
      expect(
        authService.canAccessRoute(UserRole.MEMBER, '/admin')
      ).toBe(false);
    });
  });
});
```

#### 비동기 테스트
```typescript
describe('UserService', () => {
  it('should fetch user profile', async () => {
    // Mock Firebase
    const mockUser = { uid: 'test123', email: 'test@example.com' };
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockUser,
      id: 'test123'
    });
    
    // Test
    const profile = await userService.getUserProfile('test123');
    
    // Verify
    expect(profile).toEqual(expect.objectContaining({
      uid: 'test123',
      email: 'test@example.com'
    }));
  });
  
  it('should handle errors gracefully', async () => {
    // Mock error
    vi.mocked(getDoc).mockRejectedValue(new Error('Network error'));
    
    // Test & Assert
    await expect(
      userService.getUserProfile('test123')
    ).rejects.toThrow('Network error');
  });
});
```

### 2. Hook 테스트

#### 기본 Hook 테스트
```typescript
// src/hooks/__tests__/use-user.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../use-user';
import { createWrapper } from '@/test-utils';

describe('useUser', () => {
  it('should load user data', async () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper({
        user: { uid: 'test123', role: 'MEMBER' }
      })
    });
    
    // Initially loading
    expect(result.current.isUserLoading).toBe(true);
    
    // Wait for data
    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });
    
    // Check data
    expect(result.current._user).toEqual(
      expect.objectContaining({
        uid: 'test123',
        role: 'MEMBER'
      })
    );
  });
  
  it('should handle authentication state changes', async () => {
    const { result, rerender } = renderHook(() => useUser(), {
      wrapper: createWrapper()
    });
    
    // Initially no user
    expect(result.current._user).toBeNull();
    
    // Simulate login
    act(() => {
      mockAuthStateChange({ uid: 'new-user' });
    });
    
    await waitFor(() => {
      expect(result.current._user?.uid).toBe('new-user');
    });
  });
});
```

#### 복잡한 Hook 테스트
```typescript
describe('useOnboarding', () => {
  it('should progress through onboarding steps', async () => {
    const { result } = renderHook(() => useOnboarding());
    
    // Initial state
    expect(result.current.step).toBe('register');
    expect(result.current.progress).toBe(0);
    
    // Progress to next step
    act(() => {
      result.current.goToNextStep();
    });
    
    await waitFor(() => {
      expect(result.current.step).toBe('verify');
      expect(result.current.progress).toBe(25);
    });
    
    // Skip onboarding
    act(() => {
      result.current.skipOnboarding();
    });
    
    expect(result.current.step).toBe('complete');
  });
});
```

### 3. 컴포넌트 테스트

#### 기본 컴포넌트 테스트
```typescript
// src/components/__tests__/MemberCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemberCard } from '../MemberCard';
import { createMockMember } from '@/test-utils/factories';

describe('MemberCard', () => {
  const mockMember = createMockMember();
  
  it('should render member information', () => {
    render(<MemberCard member={mockMember} />);
    
    expect(screen.getByText(mockMember.name)).toBeInTheDocument();
    expect(screen.getByText(mockMember.email)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      mockMember.photoUrl
    );
  });
  
  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(
      <MemberCard 
        member={mockMember} 
        onClick={handleClick}
      />
    );
    
    const card = screen.getByRole('article');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledWith(mockMember.id);
  });
  
  it('should show loading state', () => {
    render(<MemberCard loading />);
    
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });
});
```

#### Form 컴포넌트 테스트
```typescript
describe('MemberRegistrationForm', () => {
  it('should validate required fields', async () => {
    render(<MemberRegistrationForm />);
    
    // Submit without filling fields
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check validation errors
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
  
  it('should submit valid form data', async () => {
    const handleSubmit = vi.fn();
    render(<MemberRegistrationForm onSubmit={handleSubmit} />);
    
    // Fill form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    
    await userEvent.type(nameInput, 'John Doe');
    await userEvent.type(emailInput, 'john@example.com');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Verify submission
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });
});
```

### 4. API Route 테스트

#### 기본 API 테스트
```typescript
// src/app/api/admin/__tests__/route.test.ts
import { POST } from '../route';
import { createMockRequest } from '@/test-utils';
import * as auth from '@/middleware/auth';

describe('POST /api/admin/approvals', () => {
  beforeEach(() => {
    vi.spyOn(auth, 'withAuth').mockResolvedValue({
      user: { uid: 'admin123', role: 'CLUB_OWNER' }
    });
  });
  
  it('should approve member request', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        requestId: 'req123',
        action: 'approve'
      }
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        requestId: 'req123',
        status: 'approved'
      })
    });
  });
  
  it('should require authentication', async () => {
    vi.spyOn(auth, 'withAuth').mockRejectedValue(
      new Error('Unauthorized')
    );
    
    const request = createMockRequest({
      method: 'POST',
      body: { requestId: 'req123' }
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });
});
```

#### MSW를 사용한 통합 테스트
```typescript
// src/services/__tests__/api-client.integration.test.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiClient } from '../api-client';

const server = setupServer(
  http.post('/api/admin/approvals', async ({ request }) => {
    const body = await request.json();
    
    if (!request.headers.get('authorization')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      data: { ...body, status: 'approved' }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Client Integration', () => {
  it('should handle successful approval', async () => {
    const result = await apiClient.post('/api/admin/approvals', {
      requestId: 'req123',
      action: 'approve'
    });
    
    expect(result).toEqual({
      requestId: 'req123',
      action: 'approve',
      status: 'approved'
    });
  });
  
  it('should handle authentication errors', async () => {
    // Override to simulate no auth
    server.use(
      http.post('/api/admin/approvals', () => {
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      })
    );
    
    await expect(
      apiClient.post('/api/admin/approvals', {})
    ).rejects.toThrow('Unauthorized');
  });
});
```

### 5. E2E 테스트 (Playwright)

#### 설정
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

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
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

#### E2E 테스트 예제
```typescript
// e2e/member-registration.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Member Registration Flow', () => {
  test('should complete adult registration', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register/adult');
    
    // Step 0: Create account
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button:has-text("Continue")');
    
    // Step 1: Select club
    await page.waitForSelector('text=Select Club');
    await page.selectOption('[name="clubId"]', 'club-001');
    await page.click('button:has-text("Next")');
    
    // Step 2: Personal information
    await page.fill('[name="displayName"]', 'John Doe');
    await page.fill('[name="phoneNumber"]', '010-1234-5678');
    await page.fill('[name="birthDate"]', '1990-01-01');
    await page.selectOption('[name="gender"]', 'male');
    await page.click('button:has-text("Next")');
    
    // Step 3: Additional information
    await page.fill('[name="address"]', '서울시 강남구');
    await page.fill('[name="emergencyContact.name"]', 'Jane Doe');
    await page.fill('[name="emergencyContact.phone"]', '010-9876-5432');
    await page.click('button:has-text("Submit")');
    
    // Verify success
    await expect(page).toHaveURL('/register/success');
    await expect(page.locator('h1')).toContainText('Registration Complete');
  });
  
  test('should handle validation errors', async ({ page }) => {
    await page.goto('/register/adult');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Continue")');
    
    // Check validation messages
    await expect(page.locator('.error')).toContainText('Email is required');
    await expect(page.locator('.error')).toContainText('Password is required');
  });
});

test.describe('Admin Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'club-admin@example.com', 'AdminPass123!');
  });
  
  test('should approve pending member', async ({ page }) => {
    // Navigate to approvals
    await page.goto('/club-dashboard/member-approvals');
    
    // Find pending request
    const pendingRow = page.locator('tr:has-text("John Doe")');
    await expect(pendingRow).toBeVisible();
    
    // Click approve button
    await pendingRow.locator('button:has-text("Approve")').click();
    
    // Confirm in dialog
    await page.locator('button:has-text("Confirm")').click();
    
    // Verify success message
    await expect(page.locator('.toast')).toContainText('approved successfully');
    
    // Verify request is removed from pending list
    await expect(pendingRow).not.toBeVisible();
  });
});
```

## 🔧 테스트 유틸리티

### Mock 데이터 생성
```typescript
// test-utils/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { UserRole, UserStatus } from '@/types/auth';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      uid: faker.string.uuid(),
      email: faker.internet.email(),
      displayName: faker.person.fullName(),
      role: faker.helpers.arrayElement(Object.values(UserRole)),
      status: faker.helpers.arrayElement(['active', 'pending', 'inactive']),
      createdAt: faker.date.past().toISOString(),
      ...overrides
    };
  }
  
  static createAdmin(overrides?: Partial<User>): User {
    return this.create({
      role: UserRole.FEDERATION_ADMIN,
      status: 'active',
      ...overrides
    });
  }
  
  static createBatch(count: number): User[] {
    return Array.from({ length: count }, () => this.create());
  }
}
```

### Test Wrapper
```typescript
// test-utils/wrapper.tsx
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FirebaseProvider } from '@/firebase/provider';
import { ThemeProvider } from '@/components/theme-provider';

export function createWrapper(options?: {
  user?: any;
  firestore?: any;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider mockAuth={options?.user} mockFirestore={options?.firestore}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </FirebaseProvider>
      </QueryClientProvider>
    );
  };
}
```

### Custom Matchers
```typescript
// test-utils/matchers.ts
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`
    };
  },
  
  toHaveRole(user: User, expectedRole: UserRole) {
    const pass = user.role === expectedRole;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected user not to have role ${expectedRole}`
          : `Expected user to have role ${expectedRole}, but has ${user.role}`
    };
  }
});
```

## 📋 테스트 체크리스트

### 유닛 테스트
- [ ] Happy path 케이스
- [ ] Edge cases (null, undefined, empty)
- [ ] Error cases
- [ ] Boundary values
- [ ] Async operations
- [ ] Side effects

### 통합 테스트
- [ ] API endpoints
- [ ] Database operations
- [ ] External service calls
- [ ] Authentication flows
- [ ] Authorization checks

### E2E 테스트
- [ ] Critical user journeys
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Performance metrics
- [ ] Accessibility checks

## 🚨 일반적인 함정 및 해결책

### 1. Firebase Mock 문제
```typescript
// ❌ Bad: Direct mock
vi.mock('firebase/firestore');

// ✅ Good: Proper mock with implementation
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ test: 'data' })
  }))
}));
```

### 2. 비동기 테스트 타이밍
```typescript
// ❌ Bad: No wait
it('should update state', () => {
  const { result } = renderHook(() => useAsyncData());
  expect(result.current.data).toBe('expected'); // Fails
});

// ✅ Good: Proper waiting
it('should update state', async () => {
  const { result } = renderHook(() => useAsyncData());
  await waitFor(() => {
    expect(result.current.data).toBe('expected');
  });
});
```

### 3. 메모리 누수
```typescript
// ❌ Bad: No cleanup
describe('Component', () => {
  const mockFn = vi.fn();
  window.addEventListener('resize', mockFn);
});

// ✅ Good: Proper cleanup
describe('Component', () => {
  const mockFn = vi.fn();
  
  beforeEach(() => {
    window.addEventListener('resize', mockFn);
  });
  
  afterEach(() => {
    window.removeEventListener('resize', mockFn);
    vi.clearAllMocks();
  });
});
```

## 📈 커버리지 목표 기준

### 파일 타입별 목표
- **Utils/Helpers**: 100%
- **Services**: 95%
- **Hooks**: 90%
- **API Routes**: 85%
- **Components**: 80%
- **Pages**: 70%
- **Type definitions**: Skip

### 제외 대상
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        '**/*.d.ts',
        '**/*.config.ts',
        '**/node_modules/**',
        '**/test-utils/**',
        '**/__mocks__/**',
        '**/types/**'
      ]
    }
  }
});
```

---

*이 가이드는 지속적으로 업데이트되며, 팀의 피드백을 반영합니다.*

*마지막 업데이트: 2025-11-01*
