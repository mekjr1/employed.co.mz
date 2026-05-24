// @ts-check
const { test, expect } = require('@playwright/test');

// ─── Anonymous visitor journeys ───────────────────────────────────

test.describe('Anonymous Visitor', () => {
  test('home page loads with hero and job listings', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Employed/);
    // Hero section should be visible
    const body = page.locator('body');
    await expect(body).toContainText('Local jobs');
  });

  test('healthz endpoint returns ok', async ({ request }) => {
    const res = await request.get('/healthz?readiness=1');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ready).toBe(true);
  });

  test('API jobs endpoint responds', async ({ request }) => {
    const res = await request.get('/api/jobs');
    expect(res.ok()).toBeTruthy();
  });

  test('robots.txt is accessible', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('Sitemap');
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
  });

  test('jobs listing page loads', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveTitle(/Jobs/);
  });

  test('legal page loads', async ({ page }) => {
    await page.goto('/legal/terms');
    // Should load without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('body')).toBeVisible();
  });

  test('sign-in page loads', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('body')).toBeVisible();
  });

  test('non-existent page shows 404', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz');
    await expect(page.locator('body')).toContainText(/no route|not found/i);
  });
});

// ─── Navigation & responsive ──────────────────────────────────────

test.describe('Navigation', () => {
  test('header nav links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, .navbar, header');
    await expect(nav.first()).toBeVisible({ timeout: 30000 });
  });

  test('footer is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, .footer');
    await expect(footer.first()).toBeVisible();
  });
});

// ─── SEO & meta ───────────────────────────────────────────────────

test.describe('SEO', () => {
  test('home page has meta description', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute('content', /.+/);
  });

  test('home page has og:title or title tag', async ({ page }) => {
    await page.goto('/');
    // og:title may be dynamically set; verify title tag exists at minimum
    await expect(page).toHaveTitle(/Employed/);
  });
});

// ─── Auth routes guard ────────────────────────────────────────────

test.describe('Auth Guards', () => {
  test('admin route redirects non-admin to jobs', async ({ page }) => {
    await page.goto('/admin/jobs');
    // Should redirect away from admin since not logged in
    await page.waitForURL(/\/(jobs|sign-in|$)/);
  });

  test('my jobs route requires sign-in', async ({ page }) => {
    await page.goto('/myjobs');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── MailHog service check ────────────────────────────────────────

test.describe('External Services', () => {
  test('MailHog API is reachable', async ({ request }) => {
    const res = await request.get('http://localhost:8026/api/v2/messages');
    expect(res.ok()).toBeTruthy();
  });
});

// ─── L10: Security headers & API shape ────────────────────────────

test.describe('Security Headers', () => {
  test('X-Content-Type-Options is nosniff', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options is set', async ({ request }) => {
    const res = await request.get('/');
    const xfo = res.headers()['x-frame-options'];
    expect(xfo).toBeTruthy();
  });

  test('Referrer-Policy is set', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['referrer-policy']).toBeTruthy();
  });

  test('Content-Security-Policy header is present', async ({ request }) => {
    const res = await request.get('/');
    const csp = res.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("object-src 'none'");
  });
});

test.describe('API Response Shape', () => {
  test('healthz response has expected fields', async ({ request }) => {
    const res = await request.get('/healthz?readiness=1');
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('ready');
    expect(body).toHaveProperty('time');
  });

  test('/api/jobs returns success envelope with data array', async ({ request }) => {
    const res = await request.get('/api/jobs');
    const body = await res.json();
    expect(body).toHaveProperty('status', 'success');
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });
});
