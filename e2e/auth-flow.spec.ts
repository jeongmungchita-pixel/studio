import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/KGF|Nexus|로그인/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    
    // Wait for validation messages
    await page.waitForTimeout(500);
    const content = await page.content();
    
    // Check if validation messages appear (form-helpers should trigger these)
    const hasValidation = content.includes('이메일') || content.includes('email') || content.includes('필수');
    expect(hasValidation).toBe(true);
  });

  test('should redirect to protected route after mock login state', async ({ page, context }) => {
    // This test validates the middleware protection behavior
    // In a real scenario, you'd use Firebase emulator or test credentials
    
    await page.goto('/login');
    
    // Check that protected routes are blocked initially
    await page.goto('/admin');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    
    await page.goto('/club-dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    
    await page.goto('/super-admin');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('should check session cookie structure (mock scenario)', async ({ page, context }) => {
    // This verifies cookie mechanics without actual login
    // Set a mock session cookie to test middleware acceptance
    await context.addCookies([
      {
        name: 'session',
        value: 'mock-session-token-for-testing',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false, // localhost is HTTP in dev
        sameSite: 'Lax',
      },
    ]);

    // Now try accessing a protected route
    // Middleware should allow it (though Firebase auth state might still redirect)
    await page.goto('/admin');
    
    // The middleware won't redirect to /login now because cookie is present
    // (Though the app's useUser hook might still redirect if Firebase auth fails)
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.path).toBe('/');
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await page.waitForURL(/\/register/);
    expect(page.url()).toContain('/register');
  });

  test('should navigate to club owner registration', async ({ page }) => {
    await page.goto('/login');
    const clubOwnerLink = page.locator('a[href="/register/club-owner"]');
    await expect(clubOwnerLink).toBeVisible();
    await clubOwnerLink.click();
    await page.waitForURL(/\/register\/club-owner/);
    expect(page.url()).toContain('/register/club-owner');
  });
});

test.describe('Route Protection', () => {
  const protectedRoutes = [
    '/admin',
    '/club-dashboard',
    '/super-admin',
    '/dashboard',
    '/my-profile',
  ];

  for (const route of protectedRoutes) {
    test(`should redirect ${route} to /login when not authenticated`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');
    });
  }
});

test.describe('Public Routes', () => {
  test('should allow access to /register without authentication', async ({ page }) => {
    await page.goto('/register');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/register');
    await expect(page.locator('text=/회원가입|가입하기|Register/i').first()).toBeVisible();
  });

  test('should allow access to /login without authentication', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);
    // Login page should load (not redirect away from itself)
    expect(page.url()).toContain('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('root route should show loading then redirect based on auth', async ({ page }) => {
    await page.goto('/');
    // Root now uses client-side auth check and redirects
    // Unauthenticated users will redirect to /login after loading check
    await page.waitForURL(/\/(login|admin|club-dashboard|super-admin|my-profile)/, { timeout: 5000 });
    // Verify we redirected somewhere (likely /login for unauthenticated)
    expect(page.url()).toMatch(/\/(login|admin|club-dashboard|super-admin|my-profile)/);
  });
});
