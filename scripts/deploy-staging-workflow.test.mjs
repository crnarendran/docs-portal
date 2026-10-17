// AMB-4: structural checks on .github/workflows/deploy-staging.yml, since
// the workflow itself can't be run locally. `node --test scripts/deploy-staging-workflow.test.mjs`.
// Parses with js-yaml (present transitively via eslint); skipped if absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.github/workflows/deploy-staging.yml');
const text = readFileSync(file, 'utf8');
let yaml;
try {
  yaml = (await import('js-yaml')).default;
} catch {
  /* skipped below */
}
const opts = { skip: !yaml && 'js-yaml not installed' };
const wf = yaml && yaml.load(text);
const steps = () => wf.jobs['deploy-staging'].steps;
const GATE = "steps.change.outputs.changed == 'true'";

test('parses, and keeps every original trigger', opts, () => {
  assert.deepEqual(
    Object.keys(wf.on).sort(),
    ['push', 'repository_dispatch', 'schedule', 'workflow_dispatch']
  );
  assert.deepEqual(wf.on.push.branches, ['staging']);
  assert.deepEqual(wf.on.repository_dispatch.types, ['docs-synced-staging']);
});

test('queued runs collapse: concurrency group with cancel-in-progress', opts, () => {
  assert.equal(wf.concurrency['cancel-in-progress'], true);
  assert.ok(wf.concurrency.group);
});

test('the change check runs before any install or build', opts, () => {
  const s = steps();
  const check = s.findIndex((x) => x.id === 'change');
  const firstInstall = s.findIndex((x) => /npm (install|ci)/.test(x.run || ''));
  assert.ok(check >= 0, 'check step exists');
  assert.ok(check < firstInstall, 'check precedes the first npm install');
  assert.equal(s.slice(0, check).filter((x) => x.run).length, 0, 'only checkout may precede the check');
  assert.match(s[check].run, /staging-deploy-check\.mjs check/);
});

test('every step after the check is gated on it, so an unchanged run does nothing', opts, () => {
  const s = steps();
  const check = s.findIndex((x) => x.id === 'change');
  for (const step of s.slice(check + 1)) {
    assert.ok(step.if && step.if.includes(GATE), `"${step.name}" must be gated on the change check`);
  }
});

test('DP-12 leak guard still gates the deploy, in order', opts, () => {
  const names = steps().map((x) => x.name || '');
  const leak = names.findIndex((n) => /verify no protected doc leaked/.test(n));
  const deploy = names.findIndex((n) => /^Deploy to Firebase/.test(n));
  assert.ok(leak > 0 && deploy > leak);
});

test('the deploy marker is recorded only after the deploy step', opts, () => {
  const names = steps().map((x) => x.name || '');
  assert.ok(names.findIndex((n) => /record deployed fingerprint/.test(n)) > names.findIndex((n) => /^Deploy to Firebase/.test(n)));
});

test('no sleep-based debounce (a waiting job is billed)', () => {
  assert.doesNotMatch(text, /\bsleep\b/);
});
