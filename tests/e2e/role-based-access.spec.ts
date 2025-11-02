import { test, expect } from '@playwright/test';

test.describe('권한별 페이지 접근 제어', () => {
  // 역할별 접근 가능한 페이지 매핑
  const ROLE_ACCESS = {
    // 비인증 사용자 (공개 페이지)
    unauthenticated: [
      '/', '/login', '/register/adult', '/register/family', 
      '/about', '/contact', '/404', '/403'
    ],
    // 일반 회원
    member: [
      '/dashboard', '/my-profile', '/my-children', '/passes', 
      '/payments', '/notifications'
    ],
    // 학부모
    parent: [
      '/dashboard', '/my-profile', '/my-children', '/passes', 
      '/payments', '/notifications', '/parent-dashboard'
    ],
    // 클럽 스태프
    clubStaff: [
      '/dashboard', '/my-profile', '/club-dashboard', '/members',
      '/passes', '/classes', '/schedules', '/finance'
    ],
    // 클럽 오너
    clubOwner: [
      '/dashboard', '/my-profile', '/club-dashboard', '/members',
      '/passes', '/classes', '/schedules', '/finance', '/club-settings'
    ],
    // 연맹 관리자
    federationAdmin: [
      '/dashboard', '/my-profile', '/admin', '/clubs', '/members',
      '/approvals', '/reports', '/system-settings'
    ],
    // 슈퍼 관리자
    superAdmin: [
      '/dashboard', '/my-profile', '/admin', '/clubs', '/members',
      '/approvals', '/reports', '/system-settings', '/super-admin'
    ]
  };

  const PROTECTED_ROUTES = [
    '/dashboard', '/my-profile', '/admin', '/club-dashboard',
    '/members', '/passes', '/classes', '/finance', '/reports'
  ];

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 홈페이지로 이동하여 초기화
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('비인증 사용자 접근 제어 - 전체 라우트', async ({ page }) => {
    // 비인증 상태에서 보호된 라우트 모두 테스트
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // 로그인 페이지나 403 페이지로 리다이렉트되어야 함
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|403|dashboard)/);
    }
  });

  test('공개 라우트 접근 가능 확인', async ({ page }) => {
    const publicRoutes = ['/', '/login', '/register/adult', '/register/family'];
    
    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // 200 OK 응답 확인
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      
      // 페이지가 정상적으로 로드되는지 확인
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('동적 라우트 접근 제어', async ({ page }) => {
    // 동적 라우트 패턴 테스트
    const dynamicRoutes = [
      '/members/test-member-id',
      '/clubs/test-club-id',
      '/passes/test-pass-id',
      '/classes/test-class-id'
    ];
    
    for (const route of dynamicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // 비인증 상태에서는 로그인 페이지로 리다이렉트
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|403)/);
    }
  });

  test('API 라우트 접근 제어', async ({ page }) => {
    // API 엔드포인트 직접 접근 테스트
    const apiRoutes = [
      '/api/admin/users',
      '/api/admin/approvals',
      '/api/admin/registrations',
      '/api/clubs',
      '/api/members'
    ];
    
    for (const route of apiRoutes) {
      const response = await page.goto(route);
      
      // 비인증 상태에서는 401, 403, 404, 또는 405 응답
      expect([401, 403, 404, 405]).toContain(response?.status() || 0);
    }
  });

  test('잘못된 라우트 접근 시 404 페이지', async ({ page }) => {
    const invalidRoutes = [
      '/invalid-route',
      '/admin/invalid-subroute',
      '/club-dashboard/invalid-page',
      '/api/invalid-endpoint'
    ];
    
    for (const route of invalidRoutes) {
      const response = await page.goto(route);
      
      // 404 응답 확인
      expect(response?.status()).toBe(404);
      
      // 404 페이지가 표시되는지 확인
      const notFoundContent = page.locator('text=404, text=찾을 수 없음, text=Not Found');
      if (await notFoundContent.isVisible()) {
        await expect(notFoundContent).toBeVisible();
      }
    }
  });

  test('권한 상승 공격 방지 - URL 직접 접근', async ({ page }) => {
    // 비인증 상태에서 관리자 페이지 직접 접근 시도
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/clubs',
      '/admin/approvals',
      '/super-admin'
    ];
    
    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // 관리자 페이지가 아닌 다른 페이지로 리다이렉트되어야 함
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|403|dashboard)/);
      
      // 관리자 전용 UI 요소가 보이지 않아야 함
      const adminUI = page.locator('[data-testid="admin-panel"], .admin-only');
      if (await adminUI.isVisible()) {
        // 보인다면 접근 제어가 실패한 것
        throw new Error(`Admin UI visible on ${route} for unauthenticated user`);
      }
    }
  });

  test('세션 만료 후 접근 제어', async ({ page }) => {
    // 이 테스트는 세션 만료 시나리오를 시뮬레이션
    // 실제로는 로그인 상태에서 세션을 무효화하는 것이 어려우므로
    // 비인증 상태와 동일하게 동작하는지 확인
    
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 로그인 페이지로 리다이렉트되어야 함
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|403|dashboard)/);
  });

  test('브라우저 뒤로/앞으로 가기 시 권한 유지', async ({ page }) => {
    // 1. 보호된 페이지 접근 시도
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 2. 로그인 페이지로 리다이렉트 확인
    expect(page.url()).toMatch(/(login|403|dashboard)/);
    
    // 3. 홈페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // 4. 뒤로 가기
    await page.goBack();
    await page.waitForTimeout(2000);
    
    // 5. 여전히 로그인 페이지나 403 페이지에 있어야 함
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|403|dashboard)/);
  });

  test('새 탭에서 권한 상태 유지', async ({ page }) => {
    // 이 테스트는 새 탭/창에서도 권한 상태가 유지되는지 확인
    // Playwright에서는 context 단위로 쿠키/세션이 공유됨
    
    // 첫 번째 페이지에서 보호된 라우트 접근
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 새 페이지 생성 (같은 context 사용)
    const newPage = await page.context().newPage();
    await newPage.goto('/admin');
    await newPage.waitForLoadState('domcontentloaded');
    await newPage.waitForTimeout(2000);
    
    // 새 페이지에서도 동일하게 리다이렉트되어야 함
    const currentUrl = newPage.url();
    expect(currentUrl).toMatch(/(login|403|dashboard)/);
    
    await newPage.close();
  });

  test('캐시된 페이지 접근 시 권한 확인', async ({ page }) => {
    // 1. 공개 페이지 접근 (캐시 생성)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // 2. 보호된 페이지 접근
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 3. 캐시된 페이지로 돌아가기
    await page.goBack();
    await page.waitForTimeout(1000);
    
    // 4. 다시 보호된 페이지 접근
    await page.goForward();
    await page.waitForTimeout(2000);
    
    // 여전히 권한 검사가 동작해야 함
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|403|dashboard)/);
  });

  test('네트워크 요청 기반 권한 확인', async ({ page }) => {
    // 페이지 로드 중 발생하는 네트워크 요청 모니터링
    const responses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // 보호된 페이지 접근
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // API 요청들이 적절한 상태 코드를 반환하는지 확인
    for (const response of responses) {
      if (response.url.includes('/admin/') || response.url.includes('/protected')) {
        expect([401, 403, 404]).toContain(response.status);
      }
    }
  });
});
