import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { tiltFor, REVEAL_SELECTOR, TILT_SELECTOR } = require('../../../../js/motion.js');

const R = { left: 0, top: 0, width: 200, height: 100 };

test('centre gives no tilt', () => {
  assert.deepEqual(tiltFor(R, 100, 50), { rx: 0, ry: 0, gx: 50, gy: 50 });
});

test('top-left corner tilts to max', () => {
  const t = tiltFor(R, 0, 0);
  assert.equal(t.rx, 6);
  assert.equal(t.ry, -6);
  assert.equal(t.gx, 0);
  assert.equal(t.gy, 0);
});

test('pointer outside rect is clamped', () => {
  const t = tiltFor(R, 999, 999);
  assert.equal(t.rx, -6);
  assert.equal(t.ry, 6);
  assert.equal(t.gx, 100);
  assert.equal(t.gy, 100);
});

test('rect offset is respected and maxDeg is configurable', () => {
  const t = tiltFor({ left: 100, top: 100, width: 200, height: 100 }, 300, 150, 4);
  assert.deepEqual(t, { rx: 0, ry: 4, gx: 100, gy: 50 });
});

test('zero-size rect does not produce NaN', () => {
  assert.deepEqual(tiltFor({ left: 0, top: 0, width: 0, height: 0 }, 5, 5), { rx: 0, ry: 0, gx: 50, gy: 50 });
});

test('selectors never reach into article bodies', () => {
  assert.equal(REVEAL_SELECTOR, '.home-section-head, .section-header, .posts-grid > .post-card, .guide-card, .topic-card, .feature, .log-row');
  assert.equal(TILT_SELECTOR, '.post-card, .guide-card');
});
