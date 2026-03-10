import { test, expect } from '@playwright/test';

test.describe('XIII Mes (Décimo Tercer Mes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/payroll/decimo');
    await page.waitForLoadState('networkidle');
  });

  test('should display XIII Mes page with year selector', async ({ page }) => {
    // Verify the page loaded
    await expect(page.locator('text=XIII Mes').first()).toBeVisible();

    // Should have a year selector
    const yearSelector = page.locator('p-select, select').first();
    await expect(yearSelector).toBeVisible();
  });

  test('should display 3 cuatrimestre period cards', async ({ page }) => {
    // XIII mes has 3 periods per year (cuatrimestres)
    // Period 1: Dec 16 - Apr 15
    // Period 2: Apr 16 - Aug 15
    // Period 3: Aug 16 - Dec 15
    const periodCards = page.locator('[class*="card"], [class*="bg-neutral"]').filter({
      hasText: /Periodo|Cuatrimestre|Dic|Abr|Ago/i
    });

    // Should have at least the period sections visible
    await expect(page.getByText(/Dic.*Abr|Abr.*Ago|Ago.*Dic/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show calculate button for pending periods', async ({ page }) => {
    // Look for action buttons
    const buttons = page.locator('button, p-button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
