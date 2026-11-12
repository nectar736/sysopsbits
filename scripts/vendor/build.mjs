// One-time vendor build. The outputs in js/vendor/ are committed, so the site itself has no build step.
// Re-run only to upgrade a library:  cd scripts/vendor && npm install && node build.mjs
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const out = (name) => fileURLToPath(new URL(`../../js/vendor/${name}`, import.meta.url));
const version = (pkg) =>
  JSON.parse(readFileSync(new URL(`./node_modules/${pkg}/package.json`, import.meta.url), 'utf8')).version;

const BUDGET_GZIP_BYTES = 200 * 1024; // both bundles together

const bundles = [
  {
    entry: 'entries/three.scene.js',
    file: 'three.scene.min.js',
    banner: `/*! three.js ${version('three')} (subset) | MIT License | https://threejs.org */`,
  },
  {
    entry: 'entries/gsap.scroll.js',
    file: 'gsap.scroll.min.js',
    banner: `/*! GSAP ${version('gsap')} + ScrollTrigger | https://gsap.com | Standard License: https://gsap.com/standard-license */`,
  },
];

let total = 0;
for (const b of bundles) {
  await build({
    entryPoints: [b.entry],
    outfile: out(b.file),
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    banner: { js: b.banner },
    logLevel: 'warning',
  });
  const raw = readFileSync(out(b.file));
  const gz = gzipSync(raw).length;
  total += gz;
  console.log(`${b.file}: ${raw.length} bytes, ${gz} gzipped`);
}

console.log(`total gzipped: ${total} bytes (budget ${BUDGET_GZIP_BYTES})`);
if (total > BUDGET_GZIP_BYTES) {
  console.error('Over budget.');
  process.exit(1);
}
