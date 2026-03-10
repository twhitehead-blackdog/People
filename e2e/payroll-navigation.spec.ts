import { test, expect } from '@playwright/test';

test.describe('Payroll Module - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/payroll');
    await page.waitForLoadState('networkidle');
  });

  test('should display all payroll navigation tabs', async ({ page }) => {
    // Verify all navigation tabs are visible
    await expect(page.getByText('Planillas')).toBeVisible();
    await expect(page.getByText('Acreedores')).toBeVisible();
    await expect(page.getByText('Bancos')).toBeVisible();
    await expect(page.getByText('XIII Mes')).toBeVisible();
    await expect(page.getByText('Vacaciones')).toBeVisible();
    await expect(page.getByText('Liquidacion')).toBeVisible();
    await expect(page.getByText('Importar')).toBeVisible();
    await expect(page.getByText('Administración')).toBeVisible();
  });

  test('should navigate to Planillas and show list', async ({ page }) => {
    await page.getByText('Planillas').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/payrolls/);
  });

  test('should navigate to Acreedores', async ({ page }) => {
    await page.getByText('Acreedores').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/creditors/);
  });

  test('should navigate to Bancos', async ({ page }) => {
    await page.getByText('Bancos').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/banks/);
  });

  test('should navigate to XIII Mes', async ({ page }) => {
    await page.getByText('XIII Mes').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/decimo/);
  });

  test('should navigate to Vacaciones', async ({ page }) => {
    await page.getByText('Vacaciones').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/vacations/);
  });

  test('should navigate to Liquidacion', async ({ page }) => {
    await page.getByText('Liquidacion').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/liquidation/);
  });

  test('should navigate to Importar', async ({ page }) => {
    await page.getByText('Importar').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/import/);
  });

  test('should navigate to Administración', async ({ page }) => {
    await page.getByText('Administración').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*payroll\/admin/);
  });
});
