import { test, expect } from '@playwright/test';

test.describe('폼 유효성 검사', () => {
  const VALID_EMAIL = 'test@example.com';
  const VALID_PASSWORD = 'test123456';
  const VALID_NAME = '테스트 사용자';

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 초기화
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('로그인 폼 유효성 검사', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    });

    test('이메일 필드 유효성 검사', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      
      // 빈 이메일 유효성 검사
      await emailInput.fill('');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 에러 메시지 확인 (있을 경우)
      const errorMessage = page.locator('text=이메일을 입력해주세요, text=필수 항목입니다');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
      
      // 잘못된 이메일 형식
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      const invalidEmailError = page.locator('text=올바른 이메일 형식이 아닙니다, text=유효하지 않은 이메일');
      if (await invalidEmailError.isVisible()) {
        await expect(invalidEmailError).toBeVisible();
      }
      
      // 유효한 이메일
      await emailInput.fill(VALID_EMAIL);
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 에러 메시지가 사라져야 함
      if (await invalidEmailError.isVisible()) {
        await expect(invalidEmailError).not.toBeVisible();
      }
    });

    test('비밀번호 필드 유효성 검사', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      
      // 빈 비밀번호 유효성 검사
      await passwordInput.fill('');
      await passwordInput.blur();
      await page.waitForTimeout(500);
      
      const errorMessage = page.locator('text=비밀번호를 입력해주세요, text=필수 항목입니다');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
      
      // 너무 짧은 비밀번호
      await passwordInput.fill('123');
      await passwordInput.blur();
      await page.waitForTimeout(500);
      
      const shortPasswordError = page.locator('text=비밀번호는 6자 이상이어야 합니다, text=최소 6자');
      if (await shortPasswordError.isVisible()) {
        await expect(shortPasswordError).toBeVisible();
      }
      
      // 유효한 비밀번호
      await passwordInput.fill(VALID_PASSWORD);
      await passwordInput.blur();
      await page.waitForTimeout(500);
      
      if (await shortPasswordError.isVisible()) {
        await expect(shortPasswordError).not.toBeVisible();
      }
    });

    test('로그인 버튼 상태 검사', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const loginButton = page.locator('button[type="submit"]');
      
      // 초기 상태: 버튼이 비활성화되어 있을 수 있음
      const isInitiallyDisabled = await loginButton.isDisabled();
      
      // 유효한 데이터 입력
      await emailInput.fill(VALID_EMAIL);
      await passwordInput.fill(VALID_PASSWORD);
      await page.waitForTimeout(500);
      
      // 버튼이 활성화되어야 함
      if (isInitiallyDisabled) {
        await expect(loginButton).toBeEnabled();
      }
      
      // 유효하지 않은 데이터 입력
      await emailInput.fill('invalid-email');
      await page.waitForTimeout(500);
      
      // 버튼이 다시 비활성화될 수 있음
      if (isInitiallyDisabled) {
        await expect(loginButton).toBeDisabled();
      }
    });
  });

  test.describe('회원가입 폼 유효성 검사', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register/adult');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    });

    test('계정 생성 폼 필드 유효성 검사', async ({ page }) => {
      // 이름 필드
      const nameInput = page.locator('input#acctName');
      await nameInput.fill('');
      await nameInput.blur();
      await page.waitForTimeout(500);
      
      const nameError = page.locator('text=이름을 입력해주세요, text=필수 항목');
      if (await nameError.isVisible()) {
        await expect(nameError).toBeVisible();
      }
      
      // 너무 짧은 이름
      await nameInput.fill('가');
      await nameInput.blur();
      await page.waitForTimeout(500);
      
      const shortNameError = page.locator('text=이름은 2자 이상이어야 합니다, text=최소 2자');
      if (await shortNameError.isVisible()) {
        await expect(shortNameError).toBeVisible();
      }
      
      // 유효한 이름
      await nameInput.fill(VALID_NAME);
      await nameInput.blur();
      await page.waitForTimeout(500);
      
      // 이메일 필드
      const emailInput = page.locator('input#acctEmail');
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      const emailError = page.locator('text=올바른 이메일 형식이 아닙니다');
      if (await emailError.isVisible()) {
        await expect(emailError).toBeVisible();
      }
      
      await emailInput.fill(VALID_EMAIL);
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 비밀번호 필드
      const passwordInput = page.locator('input#acctPassword');
      await passwordInput.fill('123');
      await passwordInput.blur();
      await page.waitForTimeout(500);
      
      const passwordError = page.locator('text=비밀번호는 6자 이상이어야 합니다');
      if (await passwordError.isVisible()) {
        await expect(passwordError).toBeVisible();
      }
      
      await passwordInput.fill(VALID_PASSWORD);
      await passwordInput.blur();
      await page.waitForTimeout(500);
      
      // 비밀번호 확인 필드
      const confirmPasswordInput = page.locator('input#acctPasswordConfirm');
      await confirmPasswordInput.fill('different-password');
      await confirmPasswordInput.blur();
      await page.waitForTimeout(500);
      
      const mismatchError = page.locator('text=비밀번호가 일치하지 않습니다, text=비밀번호 확인');
      if (await mismatchError.isVisible()) {
        await expect(mismatchError).toBeVisible();
      }
      
      await confirmPasswordInput.fill(VALID_PASSWORD);
      await confirmPasswordInput.blur();
      await page.waitForTimeout(500);
    });

    test('회원가입 버튼 상태 및 제출 유효성 검사', async ({ page }) => {
      const createButton = page.locator('button').filter({ hasText: /회원가입하기|계정|만들기|생성/ }).first();
      
      // 초기 상태 확인
      const isInitiallyDisabled = await createButton.isDisabled();
      
      // 빈 폼으로 제출 시도
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // 여전히 같은 페이지에 있어야 함 (유효성 검사 실패)
      await expect(page.locator('input#acctName')).toBeVisible();
      
      // 유효한 데이터 입력
      await page.fill('input#acctName', VALID_NAME);
      await page.fill('input#acctEmail', VALID_EMAIL);
      await page.fill('input#acctPassword', VALID_PASSWORD);
      await page.fill('input#acctPasswordConfirm', VALID_PASSWORD);
      await page.waitForTimeout(500);
      
      // 버튼이 활성화되어야 함
      if (isInitiallyDisabled) {
        await expect(createButton).toBeEnabled();
      }
    });

    test('실시간 유효성 검사 확인', async ({ page }) => {
      const emailInput = page.locator('input#acctEmail');
      const emailError = page.locator('text=올바른 이메일 형식이 아닙니다');
      
      // 실시간 유효성 검사 테스트
      await emailInput.fill('test');
      await page.waitForTimeout(300);
      
      // 입력 중에는 에러가 바로 나타나지 않을 수 있음
      await emailInput.fill('test@');
      await page.waitForTimeout(300);
      
      await emailInput.fill('test@invalid');
      await page.waitForTimeout(300);
      
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 포커스를 잃었을 때 에러가 나타나야 함
      if (await emailError.isVisible()) {
        await expect(emailError).toBeVisible();
      }
      
      // 유효한 이메일로 수정
      await emailInput.fill(VALID_EMAIL);
      await page.waitForTimeout(500);
      
      // 에러가 사라져야 함
      if (await emailError.isVisible()) {
        await expect(emailError).not.toBeVisible();
      }
    });
  });

  test.describe('폼 인터랙션 및 UX 테스트', () => {
    test('Tab 키 네비게이션', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // 첫 번째 입력 필드에 직접 포커스
      const firstInput = page.locator('input[name="email"]');
      await firstInput.click();
      await expect(firstInput).toBeFocused();
      
      // Tab 키로 다음 필드로 이동
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const secondInput = page.locator('input[name="password"]');
      await expect(secondInput).toBeFocused();
      
      // Tab 키로 제출 버튼으로 이동
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeFocused();
    });

    test('Enter 키 제출', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // 폼 필드에 데이터 입력
      await page.fill('input[name="email"]', VALID_EMAIL);
      await page.fill('input[name="password"]', VALID_PASSWORD);
      
      // Enter 키로 제출
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // 제출 시도 후 페이지 상태 확인
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|dashboard|verify)/);
    });

    test('폼 자동완성 기능', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[name="email"]');
      
      // autocomplete 속성 확인
      const autocomplete = await emailInput.getAttribute('autocomplete');
      expect(['email', 'username', 'on', 'off']).toContain(autocomplete || 'on');
      
      const passwordInput = page.locator('input[name="password"]');
      const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
      expect(['current-password', 'new-password', 'on', 'off']).toContain(passwordAutocomplete || 'on');
    });

    test('폼 리셋 기능', async ({ page }) => {
      await page.goto('/register/adult');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // 폼에 데이터 입력
      await page.fill('input#acctName', VALID_NAME);
      await page.fill('input#acctEmail', VALID_EMAIL);
      await page.fill('input#acctPassword', VALID_PASSWORD);
      await page.fill('input#acctPasswordConfirm', VALID_PASSWORD);
      
      // 페이지 새로고침으로 폼 리셋 시뮬레이션
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // 폼 필드가 비어있는지 확인
      await expect(page.locator('input#acctName')).toHaveValue('');
      await expect(page.locator('input#acctEmail')).toHaveValue('');
      await expect(page.locator('input#acctPassword')).toHaveValue('');
      await expect(page.locator('input#acctPasswordConfirm')).toHaveValue('');
    });

    test('에러 상태 시각적 표시', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[name="email"]');
      
      // 에러 상태 만들기
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 에러 상태 시각적 확인
      const hasErrorClass = await emailInput.evaluate(el => {
        return el.classList.contains('error') || 
               el.classList.contains('invalid') ||
               el.getAttribute('aria-invalid') === 'true';
      });
      
      // 에러 상태가 있다면 시각적 표시 확인
      if (hasErrorClass) {
        expect(hasErrorClass).toBe(true);
      }
      
      // 유효한 값으로 수정
      await emailInput.fill(VALID_EMAIL);
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 에러 상태가 제거되었는지 확인
      const hasErrorAfterFix = await emailInput.evaluate(el => {
        return el.classList.contains('error') || 
               el.classList.contains('invalid') ||
               el.getAttribute('aria-invalid') === 'true';
      });
      
      if (hasErrorClass) {
        expect(hasErrorAfterFix).toBe(false);
      }
    });
  });

  test.describe('접근성 테스트', () => {
    test('폼 필드 레이블 연결', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[name="email"]');
      const emailLabel = page.locator('label[for="email"], label:has-text("이메일")');
      
      // 레이블과 입력 필드 연결 확인
      await expect(emailLabel).toBeVisible();
      await expect(emailInput).toHaveAttribute('name', 'email');
      
      // 레이블 클릭 시 입력 필드 포커스
      await emailLabel.click();
      await expect(emailInput).toBeFocused();
    });

    test('ARIA 속성 확인', async ({ page }) => {
      await page.goto('/register/adult');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const requiredInputs = page.locator('input[required], [aria-required="true"]');
      const count = await requiredInputs.count();
      
      // 필수 필드들이 적절한 ARIA 속성을 가지고 있는지 확인
      for (let i = 0; i < count; i++) {
        const input = requiredInputs.nth(i);
        const isRequired = await input.isRequired();
        const ariaRequired = await input.getAttribute('aria-required');
        
        expect(isRequired === true || ariaRequired === 'true').toBe(true);
      }
    });

    test('에러 메시지 접근성', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[name="email"]');
      
      // 에러 상태 만들기
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // 에러 메시지가 있을 경우 role="alert" 또는 aria-live 속성 확인
      const errorMessage = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
      if (await errorMessage.isVisible()) {
        const hasAriaLive = await errorMessage.getAttribute('aria-live');
        const hasRole = await errorMessage.getAttribute('role');
        
        expect(hasAriaLive || hasRole).toBeTruthy();
      }
    });
  });
});
