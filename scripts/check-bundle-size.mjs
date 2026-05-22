#!/usr/bin/env node
// scripts/check-bundle-size.mjs
//
// Reads perf-budget.json and a previously-built Meteor client bundle,
// gzips each file, sums by pattern, and fails the process when any
// category exceeds its hardCap. Soft-cap overruns print a warning but
// pass.
//
// Usage:
//   meteor build --debug --directory build/   # produces build/bundle/
//   node scripts/check-bundle-size.mjs build/bundle/programs/web.browser
//
// Designed to run in CI as a regression gate. Local devs can `npm run perf:bundle`
// to spot a bloated PR before pushing.

import { readFile, readdir, stat } from 'node:fs/promises';
import { gzip as gzipCb } from 'node:zlib';
import { promisify } from 'node:util';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const gzip = promisify(gzipCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const ANSI = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`
};

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function matches(path, patterns) {
  // Tiny glob matcher: only supports ** (anything) and a single
  // trailing extension class like *.{js,html}. Sufficient for the
  // patterns in perf-budget.json without dragging in a glob lib.
  return patterns.some((pattern) => {
    if (pattern.endsWith('.js')) return path.endsWith('.js');
    if (pattern.endsWith('.css')) return path.endsWith('.css');
    if (pattern.endsWith('.html')) return path.endsWith('.html');
    return false;
  });
}

function humanBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/check-bundle-size.mjs <web.browser-dir>');
    process.exit(2);
  }

  const budgetPath = join(repoRoot, 'perf-budget.json');
  const budget = JSON.parse(await readFile(budgetPath, 'utf8'));
  const categories = budget.bundle.client;

  let stats;
  try {
    stats = await stat(target);
  } catch (err) {
    console.error(`Cannot stat ${target}: ${err.message}`);
    console.error('Did you run `meteor build --debug --directory build/` first?');
    process.exit(2);
  }
  if (!stats.isDirectory()) {
    console.error(`${target} is not a directory.`);
    process.exit(2);
  }

  const files = await walk(target);
  let hardFail = false;
  let softWarn = false;

  for (const [name, cfg] of Object.entries(categories)) {
    const matched = files.filter((f) => matches(f, cfg.patterns));
    let total = 0;
    const per = [];
    for (const f of matched) {
      const buf = await readFile(f);
      const gz = await gzip(buf);
      total += gz.length;
      per.push({ f: relative(target, f), gz: gz.length });
    }
    per.sort((a, b) => b.gz - a.gz);

    const hard = cfg.hardCapBytes;
    const soft = cfg.softCapBytes;
    const overHard = total > hard;
    const overSoft = total > soft;
    const tag = overHard
      ? ANSI.red(`[FAIL] ${name.padEnd(12)}`)
      : overSoft
        ? ANSI.yellow(`[WARN] ${name.padEnd(12)}`)
        : ANSI.green(`[ OK ] ${name.padEnd(12)}`);

    console.log(
      `${tag} ${humanBytes(total).padStart(10)} gz` +
      `  ${ANSI.dim('soft=' + humanBytes(soft) + ' hard=' + humanBytes(hard))}`
    );

    if (overHard) {
      hardFail = true;
      console.log('  Top 5 contributors:');
      per.slice(0, 5).forEach((p) => {
        console.log(`    ${humanBytes(p.gz).padStart(10)}  ${p.f}`);
      });
    } else if (overSoft) {
      softWarn = true;
    }
  }

  if (hardFail) {
    console.error('\n' + ANSI.red('Bundle exceeds hard cap — failing.'));
    process.exit(1);
  }
  if (softWarn) {
    console.log('\n' + ANSI.yellow('Bundle exceeds soft cap — investigate.'));
  } else {
    console.log('\n' + ANSI.green('All categories within budget.'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
