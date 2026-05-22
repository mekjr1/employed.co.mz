#!/usr/bin/env node
// scripts/lighthouse-mobile.mjs
//
// Runs Lighthouse against every URL in perf-budget.json#lighthouse.routes
// using the mobile preset. Fails the process if any category score is
// below the configured minScore. Stores raw reports under
// .lighthouse/<host>-<path>.html so a developer can dig in.
//
// Why bespoke and not @lhci/cli?
//   @lhci/cli pulls in ~250 MB of transitive deps and a config schema
//   that fights with our per-market subdomains. This script is ~120
//   lines and uses the `lighthouse` + `chrome-launcher` npm packages
//   directly. CI just installs those two devDeps on demand.
//
// Install (when ready to enable):
//   meteor npm install --save-dev lighthouse chrome-launcher
//
// Usage:
//   node scripts/lighthouse-mobile.mjs
//
// Skips silently if lighthouse isn't installed yet — we land the
// scaffolding first, then enable in CI once Phase 2 (PWA) ships.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const reportsDir = join(repoRoot, '.lighthouse');

const ANSI = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`
};

async function loadLighthouse() {
  try {
    const lighthouse = (await import('lighthouse')).default;
    const chromeLauncher = await import('chrome-launcher');
    return { lighthouse, chromeLauncher };
  } catch (err) {
    console.warn(ANSI.yellow(
      '[skip] lighthouse / chrome-launcher not installed. ' +
      'Run `meteor npm install --save-dev lighthouse chrome-launcher` to enable.'
    ));
    return null;
  }
}

function safeFilename(host, path) {
  return (host + path).replace(/[^\w.-]+/g, '_');
}

async function main() {
  const budget = JSON.parse(
    await readFile(join(repoRoot, 'perf-budget.json'), 'utf8')
  );
  const lh = budget.lighthouse;
  const min = lh.minScore;

  const deps = await loadLighthouse();
  if (!deps) {
    // Soft-skip so CI doesn't break before the deps land.
    process.exit(0);
  }
  const { lighthouse, chromeLauncher } = deps;

  await mkdir(reportsDir, { recursive: true });

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  const options = {
    logLevel: 'error',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 740,
      deviceScaleFactor: 2,
      disabled: false
    },
    throttling: {
      // Slow 4G — realistic for MZ outside major cities.
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4
    }
  };

  let anyFail = false;

  for (const route of lh.routes) {
    const url = `http://${route.host}${route.path}`;
    process.stdout.write(`Auditing ${url} ... `);

    let runner;
    try {
      runner = await lighthouse(url, options);
    } catch (err) {
      console.log(ANSI.red('ERROR'));
      console.error('  ' + err.message);
      anyFail = true;
      continue;
    }

    const reportPath = join(reportsDir, safeFilename(route.host, route.path) + '.html');
    await writeFile(reportPath, runner.report);

    const scores = {
      performance: Math.round(runner.lhr.categories.performance.score * 100),
      accessibility: Math.round(runner.lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(runner.lhr.categories['best-practices'].score * 100),
      seo: Math.round(runner.lhr.categories.seo.score * 100),
      pwa: Math.round((runner.lhr.categories.pwa?.score ?? 0) * 100)
    };

    const fails = [];
    for (const [k, v] of Object.entries(scores)) {
      if (v < min[k]) fails.push(`${k}=${v}<${min[k]}`);
    }

    if (fails.length === 0) {
      console.log(ANSI.green('OK') +
        ` ${ANSI.dim(JSON.stringify(scores))}`);
    } else {
      console.log(ANSI.red('FAIL') +
        ` ${JSON.stringify(scores)} -- below: ${fails.join(', ')}`);
      anyFail = true;
    }
  }

  await chrome.kill();

  console.log(`\nReports written to ${reportsDir}`);
  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
