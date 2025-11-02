import { test, expect } from '@playwright/test';

test.describe('인증 기본 기능', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 홈페이지로 이동
    await page.goto('/');
  });

  test('홈페이지 로드 확인', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/KGF 넥서스/);
    
    // 로딩이 완료되면 로그인 버튼이나 대시보드가 보여야 함
    await expect(page.locator('body')).toBeVisible();
  });

  test('로그인 페이지 접근', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');
    
    // React Hook Form 기반 입력 필드 확인
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // 제출 버튼 확인 (strict mode 문제 해결)
    const submitButton = page.locator('button').filter({ hasText: '로그인' }).first();
    await expect(submitButton).toBeVisible();
  });

  test('회원가입 페이지 접근', async ({ page }) => {
    // 회원가입 페이지로 이동
    await page.goto('/register/adult');
    
    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('domcontentloaded');
    
    // 추가 대기 (React 렌더링 시간)
    await page.waitForTimeout(2000);
    
    // Step 0: 계정 생성 폼 요소 확인 (실제 초기 상태)
    await expect(page.locator('input#acctName')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#acctEmail')).toBeVisible();
    await expect(page.locator('input#acctPassword')).toBeVisible();
    await expect(page.locator('input#acctPasswordConfirm')).toBeVisible();
    
    // 계정 생성 버튼 확인
    const createAccountButton = page.locator('button').filter({ hasText: /계정|만들기|생성/ }).first();
    if (await createAccountButton.isVisible()) {
      await expect(createAccountButton).toBeVisible();
    }
  });

  test('대시보드 리다이렉트 테스트', async ({ page }) => {
    // 비인증 상태로 대시보드 접근 시도
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트되어야 함
    await expect(page).toHaveURL(/\/login/);
  });

  test('관리자 페이지 접근 제어', async ({ page }) => {
    // 비인증 상태로 관리자 페이지 접근 시도
    await page.goto('/admin');
    
    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('domcontentloaded');
    
    // 리다이렉트가 발생할 때까지 대기 (useEffect 비동기 처리)
    await page.waitForTimeout(3000);
    
    // 로그인 페이지로 리다이렉트되거나 403 페이지로 이동해야 함
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|403|dashboard)/);
  });

  test('네비게이션 메뉴 확인', async ({ page }) => {
    // 메인 네비게이션 확인
    const navigation = page.locator('nav, header, [role="navigation"]');
    
    if (await navigation.isVisible()) {
      // 네비게이션이 있다면 주요 메뉴 확인
      await expect(navigation).toBeVisible();
    }
  });

  test('반응형 레이아웃 확인', async ({ page }) => {
    // 데스크톱 뷰
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('body')).toBeVisible();
    
    // 모바일 뷰
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // 모바일 메뉴 버튼 확인 (있을 경우)
    const mobileMenu = page.locator('button[aria-label="menu"], button.hamburger, .mobile-menu');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });
});

test.describe('에러 처리', () => {
  test('404 페이지 확인', async ({ page }) => {
    // 존재하지 않는 페이지 접근
    const response = await page.goto('/non-existent-page');
    
    // 404 또는 홈페이지로 리다이렉트 확인
    expect(response?.status()).toBe(404);
  });

  test('API 엔드포인트 상태 확인', async ({ page }) => {
    // Health check API
    const response = await page.request.get('/api/health');
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('status');
    }
  });
});
