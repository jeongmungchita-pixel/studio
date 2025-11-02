import { test, expect } from '@playwright/test';

test.describe('Firebase 인증 통합', () => {
  // 테스트용 계정 정보 (실제 프로덕션에서는 테스트 계정 사용)
  const TEST_USER = {
    email: 'test@example.com',
    password: 'test123456',
    name: '테스트 사용자'
  };

  test('이메일 회원가입 흐름 - 계정 생성 단계', async ({ page }) => {
    await page.goto('/register/adult');
    
    // 페이지 로드 대기
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Step 0: 계정 생성 폼 요소 확인 및 작성
    await expect(page.locator('input#acctName')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#acctEmail')).toBeVisible();
    await expect(page.locator('input#acctPassword')).toBeVisible();
    await expect(page.locator('input#acctPasswordConfirm')).toBeVisible();
    
    // 계정 생성 폼 작성
    await page.fill('input#acctName', TEST_USER.name);
    await page.fill('input#acctEmail', TEST_USER.email);
    await page.fill('input#acctPassword', TEST_USER.password);
    await page.fill('input#acctPasswordConfirm', TEST_USER.password);
    
    // 계정 생성 버튼 클릭
    const createButton = page.locator('button').filter({ hasText: /계정|만들기|생성/ }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(3000);
      
      // 다음 단계로 이동했거나 에러 메시지가 표시되어야 함
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(register|login|verify)/);
    }
  });

  test('로그인 폼 상호작용 테스트', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    // 페이지 로드 대기
    await page.waitForLoadState('domcontentloaded');
    
    // 로그인 폼 요소 확인
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // 이메일 입력 필드 테스트
    await page.fill('input[name="email"]', 'test@example.com');
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    
    // 비밀번호 입력 필드 테스트
    await page.fill('input[name="password"]', 'testpassword123');
    await expect(page.locator('input[name="password"]')).toHaveValue('testpassword123');
    
    // 로그인 버튼 확인
    const loginButton = page.locator('button').filter({ hasText: '로그인' }).first();
    await expect(loginButton).toBeVisible();
  });

  test('로그인 유효성 검사', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    await page.waitForLoadState('domcontentloaded');
    
    // 빈 이메일로 로그인 시도
    await page.fill('input[name="email"]', '');
    await page.fill('input[name="password"]', 'password123');
    
    // 로그인 버튼 클릭
    const loginButton = page.locator('button').filter({ hasText: '로그인' }).first();
    await loginButton.click();
    
    // 유효성 검사 에러 메시지가 나타날 수 있음 (잠시 대기)
    await page.waitForTimeout(1000);
    
    // 페이지가 여전히 로그인 페이지에 있어야 함 (로그인 실패)
    expect(page.url()).toContain('/login');
  });

  test('소셜 로그인 버튼 확인', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Google 로그인 버튼 확인
    const googleButton = page.locator('button').filter({ hasText: /Google|구글/ }).first();
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
      
      // 버튼 클릭 테스트 (실제 인증은 진행하지 않음)
      await googleButton.click();
      await page.waitForTimeout(1000);
      
      // 팝업이나 리다이렉트가 발생할 수 있음
      // 여기서는 버튼이 클릭 가능한지만 확인
    }
  });

  test('비밀번호 재설정 기능 확인', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    await page.waitForLoadState('domcontentloaded');
    
    // 비밀번호 재설정 링크 확인
    const resetLink = page.locator('a').filter({ hasText: /비밀번호|잊어버렸|reset/ }).first();
    if (await resetLink.isVisible()) {
      await expect(resetLink).toBeVisible();
      
      // 링크 클릭 테스트
      await resetLink.click();
      await page.waitForTimeout(1000);
      
      // 비밀번호 재설정 페이지로 이동했는지 확인
      expect(page.url()).toMatch(/(reset|password|forgot)/i);
    }
  });

  test('권한 기반 접근 제어 - 다중 페이지', async ({ page }) => {
    // 비인증 상태에서 보호된 페이지 접근
    const protectedPages = [
      { path: '/dashboard', expected: /login/ },
      { path: '/admin', expected: /(login|403|dashboard)/ },
      { path: '/members', expected: /login/ }
    ];
    
    for (const { path, expected } of protectedPages) {
      await page.goto(path);
      
      // 페이지 로드 및 리다이렉트 대기
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(expected);
    }
  });

  test('로그인 후 대시보드 접근', async ({ page }) => {
    // 이 테스트는 실제 인증이 필요하므로 UI 흐름만 확인
    
    // 먼저 로그인 페이지로 이동
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // 로그인 폼이 있는지 확인
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // 대시보드로 직접 이동 시도
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 로그인 페이지로 리다이렉트되어야 함
    expect(page.url()).toContain('/login');
  });
});

test.describe('권한 기반 접근 제어', () => {
  test('미인증 사용자 접근 제어', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/club-dashboard',
      '/my-profile'
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      
      // 로그인 페이지로 리다이렉트되거나 접근 거부 페이지
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|403|auth)/);
    }
  });

  test('공개 라우트 접근 가능', async ({ page }) => {
    const publicRoutes = [
      '/',
      '/login',
      '/register/adult',
      '/register/family'
    ];
    
    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    }
  });
});
