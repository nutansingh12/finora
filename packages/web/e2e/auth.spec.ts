import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the login page
    await page.goto('/auth/login');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click submit without filling form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Check for email validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should attempt login with valid credentials', async ({ page }) => {
    // Fill valid credentials
    await page.fill('input[name="email"]', 'demo@finora.com');
    await page.fill('input[name="password"]', 'demo123');

    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: '1',
              email: 'demo@finora.com',
              firstName: 'Demo',
              lastName: 'User',
            },
            token: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
          },
        }),
      });
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill invalid credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Mock failed login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials',
        }),
      });
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await page.click('text=Don\'t have an account? Sign up');

    // Should navigate to register page
    await expect(page).toHaveURL('/auth/register');
    await expect(page.locator('h1')).toContainText('Sign Up');
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill credentials
    await page.fill('input[name="email"]', 'demo@finora.com');
    await page.fill('input[name="password"]', 'demo123');

    // Mock slow login response
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', email: 'demo@finora.com' },
            token: 'mock-token',
          },
        }),
      });
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Check for loading state
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('text=Signing in...')).toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    // Click forgot password link
    await page.click('text=Forgot password?');

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/auth/forgot-password');
    await expect(page.locator('h1')).toContainText('Reset Password');

    // Fill email
    await page.fill('input[name="email"]', 'demo@finora.com');

    // Mock forgot password response
    await page.route('**/api/auth/forgot-password', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password reset email sent',
        }),
      });
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Check for success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('should remember login credentials', async ({ page }) => {
    // Fill credentials and check remember me
    await page.fill('input[name="email"]', 'demo@finora.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.check('input[name="rememberMe"]');

    // Mock successful login
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', email: 'demo@finora.com' },
            token: 'mock-token',
          },
        }),
      });
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Verify localStorage contains remember me flag
    const rememberMe = await page.evaluate(() => localStorage.getItem('rememberMe'));
    expect(rememberMe).toBe('true');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Fill credentials
    await page.fill('input[name="email"]', 'demo@finora.com');
    await page.fill('input[name="password"]', 'demo123');

    // Mock network error
    await page.route('**/api/auth/login', async route => {
      await route.abort('failed');
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Check for network error message
    await expect(page.locator('text=Network error. Please try again.')).toBeVisible();
  });

  test('should validate password strength on register', async ({ page }) => {
    // Navigate to register page
    await page.goto('/auth/register');

    // Fill form with weak password
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for password strength error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.fill('input[name="email"]', 'demo@finora.com');
    await page.fill('input[name="password"]', 'demo123');

    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', email: 'demo@finora.com' },
            token: 'mock-token',
          },
        }),
      });
    });

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Mock logout response
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Logged out successfully',
        }),
      });
    });

    // Click user menu and logout
    await page.click('[aria-label="account of current user"]');
    await page.click('text=Logout');

    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login');
  });
});
