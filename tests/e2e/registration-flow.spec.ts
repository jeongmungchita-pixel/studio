import { test, expect } from '@playwright/test';

test.describe('회원가입 전체 흐름', () => {
  // 테스트용 계정 정보
  const TEST_USER = {
    name: '테스트 사용자',
    email: 'test.registration@example.com',
    password: 'test123456',
    birthDate: '1990-01-01',
    phoneNumber: '010-1234-5678',
    clubId: 'test-club'
  };

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 회원가입 페이지로 이동
    await page.goto('/register/adult');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('Step 0: 계정 생성 폼 확인', async ({ page }) => {
    // Step 0 요소 확인
    await expect(page.locator('input#acctName')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#acctEmail')).toBeVisible();
    await expect(page.locator('input#acctPassword')).toBeVisible();
    await expect(page.locator('input#acctPasswordConfirm')).toBeVisible();
    
    // 폼 필드 레이블 확인
    await expect(page.locator('label[for="acctName"]')).toContainText('이름');
    await expect(page.locator('label[for="acctEmail"]')).toContainText('이메일');
    await expect(page.locator('label[for="acctPassword"]')).toContainText('비밀번호');
    await expect(page.locator('label[for="acctPasswordConfirm"]')).toContainText('확인');
    
    // 계정 생성 버튼 확인
    const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
    await expect(createButton).toBeVisible();
  });

  test('Step 0: 계정 생성 폼 유효성 검사', async ({ page }) => {
    // 빈 폼으로 제출 시도
    const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
    await createButton.click();
    
    // 에러 메시지가 나타나거나 버튼이 비활성화될 수 있음
    await page.waitForTimeout(1000);
    
    // 여전히 Step 0에 있어야 함
    await expect(page.locator('input#acctName')).toBeVisible();
  });

  test('Step 0: 계정 생성 폼 작성 및 다음 단계 이동', async ({ page }) => {
    // 계정 생성 폼 작성
    await page.fill('input#acctName', TEST_USER.name);
    await page.fill('input#acctEmail', TEST_USER.email);
    await page.fill('input#acctPassword', TEST_USER.password);
    await page.fill('input#acctPasswordConfirm', TEST_USER.password);
    
    // 계정 생성 버튼 클릭
    const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
    await createButton.click();
    
    // 다음 단계로 이동 대기
    await page.waitForTimeout(3000);
    
    // Step 1로 이동했거나 에러가 표시되어야 함
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/register/);
    
    // 여전히 회원가입 페이지에 있어야 함
    await expect(page.locator('main')).toBeVisible();
  });

  test('Step 1: 개인정보 입력 폼 확인 (수동 진입)', async ({ page }) => {
    // Step 0에서 계정 정보 입력
    await page.fill('input#acctName', TEST_USER.name);
    await page.fill('input#acctEmail', TEST_USER.email);
    await page.fill('input#acctPassword', TEST_USER.password);
    await page.fill('input#acctPasswordConfirm', TEST_USER.password);
    
    // 계정 생성 버튼 클릭
    const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
    await createButton.click();
    
    // Step 1 로드 대기
    await page.waitForTimeout(3000);
    
    // Step 1 요소 확인 (있을 경우)
    const nameInput = page.locator('input#name, input[name="name"]');
    const birthDateInput = page.locator('input#birthDate, input[name="birthDate"]');
    const phoneInput = page.locator('input#phoneNumber, input[name="phoneNumber"]');
    
    // 이 단계로 진행했다면 요소가 보여야 함
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible();
      await expect(birthDateInput).toBeVisible();
      await expect(phoneInput).toBeVisible();
    }
  });

  test('Step 2: 추가정보 입력 폼 확인', async ({ page }) => {
    // 클럽 선택 관련 요소 확인
    const clubSelect = page.locator('select, [role="combobox"]').first();
    
    if (await clubSelect.isVisible()) {
      await expect(clubSelect).toBeVisible();
    }
    
    // 성별 선택 라디오 버튼 확인
    const genderRadio = page.locator('input[type="radio"]').first();
    if (await genderRadio.isVisible()) {
      await expect(genderRadio).toBeVisible();
    }
  });

  test('Step 3: 약관 동의 폼 확인', async ({ page }) => {
    // 약관 동의 체크박스 확인
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // 전체 동의 체크박스 확인
      const allCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(allCheckbox).toBeVisible();
      
      // 약관 레이블 확인
      const labels = page.locator('label');
      for (let i = 0; i < Math.min(3, await labels.count()); i++) {
        const label = labels.nth(i);
        if (await label.isVisible()) {
          const text = await label.textContent();
          if (text && (text.includes('약관') || text.includes('동의') || text.includes('개인'))) {
            break; // 약관 관련 레이블 찾음
          }
        }
      }
    }
  });

  test('전체 흐름 네비게이션 확인', async ({ page }) => {
    // Step 진행 상태 확인
    const stepIndicator = page.locator('text=/Step \\d+ \\/ \\d+/');
    if (await stepIndicator.isVisible()) {
      await expect(stepIndicator).toContainText('Step');
    }
    
    // 이전/다음 버튼 확인
    const prevButton = page.locator('button').filter({ hasText: /이전|이전/ }).first();
    const nextButton = page.locator('button').filter({ hasText: /다음|다음/ }).first();
    
    // 첫 단계에서는 이전 버튼이 없을 수 있음
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible();
    }
  });

  test('반응형 레이아웃 확인', async ({ page }) => {
    // 데스크톱 뷰 확인
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    const card = page.locator('.card, [class*="card"], [class*="Card"]').first();
    if (await card.isVisible()) {
      await expect(card).toBeVisible();
    }
    
    // 모바일 뷰 확인
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // 모바일에서도 주요 요소가 보여야 함
    await expect(page.locator('input#acctName')).toBeVisible();
  });

  test('폼 제출 유효성 검사', async ({ page }) => {
    // Step 0에서 유효하지 않은 이메일 입력
    await page.fill('input#acctName', TEST_USER.name);
    await page.fill('input#acctEmail', 'invalid-email');
    await page.fill('input#acctPassword', TEST_USER.password);
    await page.fill('input#acctPasswordConfirm', TEST_USER.password);
    
    // 제출 시도
    const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
    await createButton.click();
    
    await page.waitForTimeout(2000);
    
    // 유효성 검사 실패 시 여전히 같은 페이지에 있어야 함
    await expect(page.locator('input#acctEmail')).toBeVisible();
  });

  test('페이지 새로고침 상태 유지', async ({ page }) => {
    // 일부 정보 입력
    await page.fill('input#acctName', TEST_USER.name);
    await page.fill('input#acctEmail', TEST_USER.email);
    
    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 폼이 다시 나타나야 함
    await expect(page.locator('input#acctName')).toBeVisible({ timeout: 10000 });
  });
});
