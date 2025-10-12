import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/KGF 넥서스/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to clubs page', async ({ page }) => {
    await page.goto('/clubs');
    
    await expect(page).toHaveURL(/\/clubs/);
    await expect(page.locator('h1')).toContainText(/클럽/i);
  });

  test('should navigate to members page', async ({ page }) => {
    await page.goto('/members');
    
    await expect(page).toHaveURL(/\/members/);
  });

  test('should navigate to competitions page', async ({ page }) => {
    await page.goto('/competitions');
    
    await expect(page).toHaveURL(/\/competitions/);
  });

  test('should have responsive navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu exists
    const mobileMenu = page.locator('[aria-label="Menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav')).toBeVisible();
    }
  });
});

test.describe('Page Performance', () => {
  test('should load homepage quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should have no critical errors
    expect(errors.length).toBe(0);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab key
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
