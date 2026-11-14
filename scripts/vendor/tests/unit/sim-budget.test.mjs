import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const LIMIT = 60 * 1024; // hard ceiling from the spec; the target is 45 KB

export function simBytes(root = ROOT) {
  const files = ['css/sim.css', ...readdirSync(path.join(root, 'js/sim')).filter((f) => f.endsWith('.js')).map((f) => `js/sim/${f}`)];
  return files.reduce((sum, f) => sum + gzipSync(readFileSync(path.join(root, f))).length, 0);
}

test('simulator CSS + JS stay under the 60 KB gzipped ceiling', () => {
  const total = simBytes();
  console.log(`simulator gzipped total: ${(total / 1024).toFixed(1)} KB`);
  assert.ok(total <= LIMIT, `${total} bytes > ${LIMIT}`);
  assert.ok(total > 5 * 1024, 'the measurement found the simulator files');
});
