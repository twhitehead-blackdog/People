import { test, expect } from '@playwright/test';

test.describe('Importar Datos de Payday', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/payroll/import');
    await page.waitForLoadState('networkidle');
  });

  test('should display import page with header', async ({ page }) => {
    await expect(page.getByText('Importar Datos de Payday')).toBeVisible({ timeout: 10000 });
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.getByText('Total Lotes')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Completados')).toBeVisible();
    await expect(page.getByText('En Proceso')).toBeVisible();
    await expect(page.getByText('Registros Importados')).toBeVisible();
  });

  test('should display import type selector', async ({ page }) => {
    const selector = page.locator('p-select').first();
    await expect(selector).toBeVisible({ timeout: 10000 });
  });

  test('should show all import types in dropdown', async ({ page }) => {
    const selector = page.locator('p-select').first();
    await selector.click();

    // Verify import types are available
    await expect(page.getByText('Historial de Salarios')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Saldos de Vacaciones')).toBeVisible();
    await expect(page.getByText('Fondo de Cesantía')).toBeVisible();
    await expect(page.getByText('Deudas / Préstamos Activos')).toBeVisible();
    await expect(page.getByText('Historial de Planillas')).toBeVisible();
    await expect(page.getByText('Historial de XIII Mes')).toBeVisible();
  });

  test('should show file upload after selecting import type', async ({ page }) => {
    const selector = page.locator('p-select').first();
    await selector.click();
    await page.getByText('Historial de Salarios').click();

    // Should show file upload and required columns info
    await expect(page.getByText('Archivo CSV')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/cedula.*salario.*fecha_efectiva/i)).toBeVisible();
  });

  test('should show placeholder when no import type selected', async ({ page }) => {
    await expect(page.getByText('Primero selecciona el tipo de importación')).toBeVisible({ timeout: 10000 });
  });
});
