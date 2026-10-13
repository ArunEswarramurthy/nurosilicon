import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route('https://accounts.google.com/**', (route) => route.abort());
});

test('login page exposes the email sign-in form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByPlaceholder('Enter your email address')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in →' })).toBeVisible();
});

test('anonymous visitors to student pages are redirected to login', async ({ page }) => {
  await page.goto('/student/profile');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
