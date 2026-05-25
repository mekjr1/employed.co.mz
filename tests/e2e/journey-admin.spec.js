// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const API_URL = process.env.API_URL || 'http://localhost:3301';
const MAILHOG_URL = process.env.MAILHOG_URL || 'http://localhost:3310';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const DOCKER = process.platform === 'win32' ? 'docker.exe' : 'docker';
const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'deploy-postgres-1';
const POSTGRES_USER = process.env.POSTGRES_USER || 'employed';
const POSTGRES_DB = process.env.POSTGRES_DB || 'employed';
const PASSWORD = 'Password123!';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function snap(page, testInfo, label) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${testInfo.project.name}-journey-admin-${label}.png`),
    fullPage: true,
  });
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(sql) {
  return execFileSync(
    DOCKER,
    ['exec', POSTGRES_CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', POSTGRES_USER, '-d', POSTGRES_DB, '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  ).trim();
}

async function clearMailhog(request) {
  await request.delete(`${MAILHOG_URL}/api/v1/messages`).catch(() => undefined);
}

async function listMessages(request) {
  const response = await request.get(`${MAILHOG_URL}/api/v2/messages`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function subjectFor(message) {
  return message?.Content?.Headers?.Subject?.[0] || message?.MIME?.Headers?.Subject?.[0] || '';
}

function bodyFor(message) {
  const mimeParts = Array.isArray(message?.MIME?.Parts)
    ? message.MIME.Parts.map((part) => part?.Body || '').join('\n')
    : '';
  return [message?.Content?.Body, mimeParts, message?.Raw?.Data].filter(Boolean).join('\n');
}

async function waitForMessage(request, predicate, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const data = await listMessages(request);
    const match = (data.items || []).find(predicate);
    if (match) {
      return match;
    }
    await delay(1000);
  }
  throw new Error(`Expected matching MailHog message within ${timeout}ms.`);
}

function extractToken(body) {
  const match = body.match(/verify-email\/([A-Za-z0-9._-]+)/i) || body.match(/\/auth\/verify-email\/([A-Za-z0-9._-]+)/i);
  return match ? match[1] : null;
}

async function registerUser(request, email, name) {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { email, password: PASSWORD, name },
  });
  expect(response.ok()).toBeTruthy();
}

async function verifyUserByDb(email) {
  runSql(`update users set email_verified = true where email = ${sqlQuote(email)};`);
}

async function grantAdminByDb(email) {
  runSql(`update users set email_verified = true, roles = ARRAY['admin'] where email = ${sqlQuote(email)};`);
}

async function apiLogin(request, email) {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.access_token || payload.accessToken || payload.token;
}

async function seedSession(page, token) {
  await page.goto('/');
  await page.evaluate((nextToken) => {
    window.localStorage.setItem('employed_token', nextToken);
    document.cookie = `employed_token=${encodeURIComponent(nextToken)}; Path=/; SameSite=Lax`;
  }, token);
  await page.reload();
}

async function createPendingJob(request, email, title) {
  await registerUser(request, email, 'Admin Queue Employer');
  await verifyUserByDb(email);
  const userId = runSql(`select id from users where email = ${sqlQuote(email)} limit 1;`);
  const jobId = randomUUID();
  runSql(`insert into jobs (id, user_id, title, company, country, location, url, contact, job_type, remote, description, html_description, status, created_at, updated_at) values (${sqlQuote(jobId)}, ${sqlQuote(userId)}, ${sqlQuote(title)}, 'Queue Company', 'Mozambique', 'Maputo', 'https://example.com/queue-role', ${sqlQuote(email)}, 'Full Time', false, '<p>Pending job for admin moderation.</p>', '<p>Pending job for admin moderation.</p>', 'pending', timezone('utc', now()), timezone('utc', now()));`);
  return { id: jobId, title };
}

test('Journey 3 — Marta (Admin)', async ({ page, request }, testInfo) => {
  test.setTimeout(180000);

  const runId = `${Date.now()}-${testInfo.project.name}`;
  const adminEmail = `marta-${runId}@test.employed.co.mz`;
  const employerEmail = `admin-queue-${runId}@test.employed.co.mz`;
  const pendingJobTitle = `Admin Pending Job ${runId}`;

  await clearMailhog(request);
  const pendingJob = await createPendingJob(request, employerEmail, pendingJobTitle);
  await clearMailhog(request);

  let adminToken = '';

  await test.step('Register, verify, and bootstrap an admin user', async () => {
    await page.goto('/sign-up');
    await page.getByLabel('Full name').fill('Marta Admin');
    await delay();
    await page.getByLabel('Email').fill(adminEmail);
    await delay();
    await page.locator('#register-password').fill(PASSWORD);
    await delay();
    await page.locator('#register-confirm-password').fill(PASSWORD);
    await delay();
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('body')).toContainText('Check your email');

    let verificationToken = null;
    try {
      const message = await waitForMessage(request, (item) => subjectFor(item).includes('Verify your email'), 12000);
      verificationToken = extractToken(bodyFor(message));
      expect.soft(Boolean(verificationToken)).toBeTruthy();
    } catch (error) {
      expect.soft(false).toBeTruthy();
    }

    if (verificationToken) {
      const verifyResponse = await request.post(`${API_URL}/auth/verify-email/${verificationToken}`);
      expect.soft(verifyResponse.ok()).toBeTruthy();
    }
    await grantAdminByDb(adminEmail);
    await snap(page, testInfo, 'step-1-register-admin');
  });

  await test.step('Sign in as admin', async () => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(adminEmail);
    await delay();
    await page.getByLabel('Password').fill(PASSWORD);
    await delay();
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await delay(1500);

    const uiToken = await page.evaluate(() => window.localStorage.getItem('employed_token'));
    const signedInViaUi = Boolean(uiToken);
    expect.soft(signedInViaUi).toBeTruthy();

    adminToken = signedInViaUi ? uiToken || '' : await apiLogin(request, adminEmail);
    if (!signedInViaUi) {
      await seedSession(page, adminToken);
    }

    await snap(page, testInfo, 'step-2-sign-in-admin');
  });

  await test.step('Open the admin jobs page and filter pending jobs', async () => {
    await page.goto('/admin/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Admin job moderation');
    await page.getByRole('button', { name: /^pending/i }).click();
    await expect(page.locator('body')).toContainText(pendingJobTitle);
    await snap(page, testInfo, 'step-3-admin-queue');
  });

  await test.step('Approve the job via the admin API and verify the status changes', async () => {
    const response = await request.patch(`${API_URL}/admin/jobs/${pendingJob.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'active', reason: 'UAT approval' },
    });
    expect(response.ok()).toBeTruthy();

    await page.reload();
    await page.getByRole('button', { name: /^active/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(pendingJobTitle);
    await snap(page, testInfo, 'step-4-approved');
  });

  await test.step('View admin users and reports panels', async () => {
    await expect(page.locator('body')).toContainText('Admin users');
    await expect(page.locator('body')).toContainText('Reports queue');
    await expect(page.locator('body')).toContainText(adminEmail);
    await snap(page, testInfo, 'step-5-admin-panels');
  });
});
