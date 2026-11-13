import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chooseSceneMode, loadTrigger } = require('../../../../js/home.js');

const base = { reducedMotion: false, saveData: false, webgl: true, width: 1280, finePointer: true, cores: 8, memory: 8 };

test('full on capable desktop', () => assert.equal(chooseSceneMode(base), 'full'));
test('none for reduced motion, saveData, no webgl', () => {
  for (const k of ['reducedMotion', 'saveData']) assert.equal(chooseSceneMode({ ...base, [k]: true }), 'none');
  assert.equal(chooseSceneMode({ ...base, webgl: false }), 'none');
});
test('lite for narrow, coarse, few cores, low memory', () => {
  assert.equal(chooseSceneMode({ ...base, width: 400 }), 'lite');
  assert.equal(chooseSceneMode({ ...base, finePointer: false }), 'lite');
  assert.equal(chooseSceneMode({ ...base, cores: 4 }), 'lite');
  assert.equal(chooseSceneMode({ ...base, memory: 4 }), 'lite');
});
test('missing cores and memory do not downgrade', () => assert.equal(chooseSceneMode({ ...base, cores: undefined, memory: undefined }), 'full'));
test('trigger', () => {
  assert.equal(loadTrigger(base), 'idle');
  assert.equal(loadTrigger({ ...base, width: 400 }), 'interaction');
  assert.equal(loadTrigger({ ...base, finePointer: false }), 'interaction');
});
