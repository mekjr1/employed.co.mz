#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Regenerate the brand PNG assets in public/images/ from the source SVGs
 * in brand/ and public/images/.
 *
 * Run with: npm run regen-brand-pngs
 *
 * Uses @resvg/resvg-js (pure WASM, no native deps) so this works on any
 * dev machine without ImageMagick / librsvg installed.
 *
 * If a target PNG already exists with the same byte content as the
 * freshly-rendered one, we skip the write — keeps git diffs honest.
 */

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Each job renders one SVG to one PNG at a given pixel size.
 * `fitTo: { mode: 'width', value: <px> }` makes resvg-js scale the SVG
 * viewBox so the output is exactly that many pixels wide (height
 * follows the aspect ratio of the source viewBox).
 */
const jobs = [
  // Favicons — derived from the simplified favicon mark
  { src: 'brand/logo/favicon.svg',     out: 'public/images/favicon-16x16.png',          w: 16 },
  { src: 'brand/logo/favicon.svg',     out: 'public/images/favicon-32x32.png',          w: 32 },

  // Square PWA + browser icons — derived from the full mark
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/favicon.png',                w: 152 },
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/apple-touch-icon.png',       w: 180 },
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/icon-192x192.png',           w: 192 },
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/icon-512x512.png',           w: 512 },
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/maskable-icon-192x192.png',  w: 192 },
  { src: 'brand/logo/logo-mark.svg',   out: 'public/images/maskable-icon-512x512.png',  w: 512 },

  // Open Graph card — 1200×630 social share image
  { src: 'brand/social/og-card.svg',   out: 'public/images/og-card.png',                w: 1200 },

  // Default avatar — 200px covers the largest configured imageSize
  { src: 'public/images/avatar.svg',   out: 'public/images/avatar.png',                 w: 200 },
];

function render(job) {
  const srcAbs = path.join(REPO_ROOT, job.src);
  const outAbs = path.join(REPO_ROOT, job.out);

  if (!fs.existsSync(srcAbs)) {
    console.error(`  MISSING SOURCE  ${job.src}`);
    return { ok: false };
  }

  const svg = fs.readFileSync(srcAbs);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: job.w },
    // Transparent background — the SVG itself paints the rounded square
    // (or leaves the corners alpha for masking).
    background: 'rgba(0,0,0,0)',
    // Tell resvg to load referenced images / patterns relative to the SVG.
    imageRendering: 0, // 0 = optimizeQuality
    shapeRendering: 2, // 2 = geometricPrecision
  });
  const png = resvg.render().asPng();

  let changed = true;
  if (fs.existsSync(outAbs)) {
    const prev = fs.readFileSync(outAbs);
    if (prev.length === png.length && prev.equals(png)) {
      changed = false;
    }
  }

  if (changed) {
    fs.writeFileSync(outAbs, png);
  }

  return { ok: true, changed, bytes: png.length };
}

console.log('Regenerating brand PNGs…');
let nChanged = 0;
let nSkipped = 0;
let nFailed = 0;
for (const job of jobs) {
  process.stdout.write(`  ${job.out.padEnd(46)} `);
  const r = render(job);
  if (!r.ok) { nFailed++; continue; }
  if (r.changed) {
    nChanged++;
    console.log(`✓ ${r.bytes.toLocaleString()} B`);
  } else {
    nSkipped++;
    console.log('· unchanged');
  }
}
console.log(`\nDone. ${nChanged} written, ${nSkipped} unchanged, ${nFailed} failed.`);
process.exit(nFailed === 0 ? 0 : 1);
