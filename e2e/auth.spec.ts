import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/KGF 넥서스/);
    await expect(page.locator('h1')).toContainText('로그인');
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Click submit without filling form
    await page.click('button[type="submit"]');
    
    // Check for validation messages (adjust selectors based on your implementation)
    await expect(page.locator('text=/이메일/i')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.click('text=/회원가입/i');
    
    await expect(page).toHaveURL(/\/register/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error toast (adjust based on your toast implementation)
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/올바르지 않습니다/i')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login for club dashboard', async ({ page }) => {
    await page.goto('/club-dashboard');
    
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/KGF 넥서스/);
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check if navigation exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});
