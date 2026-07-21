import { test, expect } from '@playwright/test';

test.describe('Role-Based Authentication and Portal Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local application page
    await page.goto('/');
  });

  test('should load the portal selector landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/CUAP/i);
    // Verify all three portal buttons exist
    await expect(page.locator('#portal-student')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('#portal-provider')).toBeVisible();
    await expect(page.locator('#portal-admin')).toBeVisible();
  });

  test('admin login, guard, and logout flow', async ({ page }) => {
    // Click Admin Portal card to open login form
    await page.locator('#portal-admin').click({ force: true });
    await expect(page.locator('#login-username')).toBeVisible({ timeout: 15000 });

    // Use new admin credentials from tempCredentials.json
    await page.locator('#login-username').fill('admin01');
    await page.locator('#login-password').fill('Cuap@3690');
    await page.locator('#login-submit-btn').click({ force: true });

    // Verify redirect to admin dashboard URL (with large timeout for dynamic compilation)
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 35000 });

    // Try unauthorized access to student dashboard
    await page.goto('/student/dashboard');
    // Guard should redirect back to admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 35000 });

    // Logout via header button
    const logoutBtn = page.locator(
      'header button:has-text("Sign Out"), header button:has-text("Log Out")',
    );
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click({ force: true });

    // Verify redirect back to landing page
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
    await expect(page.locator('#portal-admin')).toBeVisible({ timeout: 15000 });
  });

  test('counselor login, guard, and logout flow', async ({ page }) => {
    // Click Counselor Portal card to open login form
    await page.locator('#portal-provider').click({ force: true });
    await expect(page.locator('#login-username')).toBeVisible({ timeout: 15000 });

    // Use counselor credentials from tempCredentials.json
    await page.locator('#login-username').fill('counselor01');
    await page.locator('#login-password').fill('3690');
    await page.locator('#login-submit-btn').click({ force: true });

    // Verify redirect to counselor dashboard URL (with large timeout for dynamic compilation)
    await expect(page).toHaveURL(/\/counselor\/dashboard/, { timeout: 35000 });

    // Try unauthorized access to admin dashboard
    await page.goto('/admin/dashboard');
    // Guard should redirect back to counselor dashboard
    await expect(page).toHaveURL(/\/counselor\/dashboard/, { timeout: 35000 });

    // Logout via header button
    const logoutBtn = page.locator(
      'header button:has-text("Sign Out"), header button:has-text("Log Out")',
    );
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click({ force: true });

    // Verify redirect back to landing page
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
    await expect(page.locator('#portal-provider')).toBeVisible({ timeout: 15000 });
  });

  test('student login, guard, and logout flow', async ({ page }) => {
    // Click Student Portal card to open login form
    await page.locator('#portal-student').click({ force: true });
    await expect(page.locator('#login-username')).toBeVisible({ timeout: 15000 });

    // Use student credentials (Username = Password)
    await page.locator('#login-username').fill('student01');
    await page.locator('#login-password').fill('student01');
    await page.locator('#login-submit-btn').click({ force: true });

    // Verify redirect to student dashboard URL (with large timeout for dynamic compilation)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 35000 });

    // Try unauthorized access to counselor dashboard
    await page.goto('/counselor/dashboard');
    // Guard should redirect back to student dashboard
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 35000 });

    // Logout via header button
    const logoutBtn = page.locator(
      'header button:has-text("Sign Out"), header button:has-text("Log Out")',
    );
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click({ force: true });

    // Verify redirect back to landing page
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
    await expect(page.locator('#portal-student')).toBeVisible({ timeout: 15000 });
  });

  test('database student login flow (day scholar)', async ({ page }) => {
    // Click Student Portal card
    await page.locator('#portal-student').click({ force: true });
    await expect(page.locator('#login-username')).toBeVisible({ timeout: 15000 });

    // Use a student from the JSON database (who is a Day Scholar)
    // Username = Student ID, Password = Student ID
    await page.locator('#login-username').fill('23MTL04');
    await page.locator('#login-password').fill('23MTL04');
    await page.locator('#login-submit-btn').click({ force: true });

    // Verify redirect to student dashboard
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 35000 });

    // Verify student name and registration number are loaded in sidebar
    await expect(page.locator('text=SAKE NARESH')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=23MTL04').first()).toBeVisible();

    // Logout
    const logoutBtn = page.locator(
      'header button:has-text("Sign Out"), header button:has-text("Log Out")',
    );
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click({ force: true });

    // Verify redirect back to landing page
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
  });

  test('database student login flow (hosteller)', async ({ page }) => {
    // Click Student Portal card
    await page.locator('#portal-student').click({ force: true });
    await expect(page.locator('#login-username')).toBeVisible({ timeout: 15000 });

    // Use a student from the JSON database (who is a Hosteller)
    // Username = Student ID, Password = Student ID
    await page.locator('#login-username').fill('23P1EC02');
    await page.locator('#login-password').fill('23P1EC02');
    await page.locator('#login-submit-btn').click({ force: true });

    // Verify redirect to student dashboard
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 35000 });

    // Verify student name and registration number are loaded in sidebar
    await expect(page.locator('text=MALLIDI VEERRAGHAVA REDDY')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=23P1EC02').first()).toBeVisible();

    // Logout
    const logoutBtn = page.locator(
      'header button:has-text("Sign Out"), header button:has-text("Log Out")',
    );
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click({ force: true });

    // Verify redirect back to landing page
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
  });
});
