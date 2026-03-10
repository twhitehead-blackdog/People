import { test as setup, expect } from '@playwright/test';

/**
 * Global setup: Autenticación con Auth0.
 *
 * Este test se ejecuta una sola vez antes de todos los demás.
 * Guarda el estado de autenticación en e2e/.auth/user.json
 * para que los demás tests no tengan que hacer login.
 *
 * Requiere variables de entorno:
 * - E2E_USERNAME: email del usuario de prueba
 * - E2E_PASSWORD: contraseña del usuario de prueba
 */
setup('authenticate', async ({ page }) => {
  const username = process.env['E2E_USERNAME'];
  const password = process.env['E2E_PASSWORD'];

  if (!username || !password) {
    throw new Error(
      'E2E_USERNAME and E2E_PASSWORD environment variables are required.\n' +
      'Usage: E2E_USERNAME=user@example.com E2E_PASSWORD=pass npx playwright test'
    );
  }

  // Navigate to app - Auth0 should redirect to login
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Wait for Auth0 login page
  const currentUrl = page.url();

  if (currentUrl.includes('auth0.com') || currentUrl.includes('login')) {
    // Fill Auth0 Universal Login
    await page.fill('input[name="username"], input[name="email"], input[type="email"]', username);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"], button[name="action"]');

    // Wait for redirect back to app
    await page.waitForURL('**/dashboard/**', { timeout: 30000 });
  }

  // Verify we're logged in
  await expect(page).toHaveURL(/.*dashboard.*/);

  // Save authentication state
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
