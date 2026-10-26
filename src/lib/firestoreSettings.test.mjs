// `node --test src/lib/firestoreSettings.test.mjs`
// Imports the .ts directly: needs Node's built-in type stripping (Node 22.18+ / 24).
import test from 'node:test';
import assert from 'node:assert/strict';
import { firestoreSettings } from './firestoreSettings.ts';

test('emulator run forces long-polling', () => {
  assert.deepEqual(firestoreSettings(true), { experimentalForceLongPolling: true });
});

test('every other path (production, plain dev) keeps the default transport', () => {
  assert.equal(firestoreSettings(false), undefined);
});
