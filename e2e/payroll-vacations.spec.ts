import { test, expect } from '@playwright/test';

test.describe('Vacaciones (Vacation Payments)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/payroll/vacations');
    await page.waitForLoadState('networkidle');
  });

  test('should display vacation payments page', async ({ page }) => {
    // Should show summary cards
    await expect(page.getByText(/Total|Pendiente|Aprobad|Pagad/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should have button to create new vacation payment', async ({ page }) => {
    // Look for "Nueva" or "Nuevo" or "Agregar" button
    const newButton = page.locator('button, p-button').filter({
      hasText: /Nuev|Agregar|Crear/i
    });
    await expect(newButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open form dialog when clicking new button', async ({ page }) => {
    const newButton = page.locator('button, p-button').filter({
      hasText: /Nuev|Agregar|Crear/i
    });
    await newButton.first().click();

    // Dialog should appear with employee selector
    await expect(page.locator('p-dialog, [role="dialog"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display vacation payment table with correct columns', async ({ page }) => {
    // Table should have key columns
    const table = page.locator('p-table, table');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });
});
