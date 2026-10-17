// AMB-4 tests for scripts/staging-deploy-check.mjs. Plain node, no network:
// `node --test scripts/staging-deploy-check.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { fingerprint, decide, listDocs, readState, writeState, getAccessToken } from './staging-deploy-check.mjs';

const docs = (...rows) => rows.map(([name, updateTime]) => ({ name, updateTime }));
const NOW = Date.parse('2026-11-02T12:00:00Z');
const base = { hash: 'h2', lastHash: 'h1', lastDeployedAt: '2026-11-02T09:00:00Z', now: NOW, minIntervalMin: 60 };

test('fingerprint: stable regardless of listing order', () => {
  const a = { portal_docs: docs(['a', '1'], ['b', '2']), portal_docs_dev: docs(['c', '3']) };
  const b = { portal_docs_dev: docs(['c', '3']), portal_docs: docs(['b', '2'], ['a', '1']) };
  assert.equal(fingerprint(a, 'sha'), fingerprint(b, 'sha'));
});

test('fingerprint: changes when a doc is updated, added, removed, in either collection, or the code sha moves', () => {
  const ref = { portal_docs: docs(['a', '1']), portal_docs_dev: docs(['c', '3']) };
  const h = fingerprint(ref, 's');
  assert.notEqual(h, fingerprint({ ...ref, portal_docs: docs(['a', '2']) }, 's'));
  assert.notEqual(h, fingerprint({ ...ref, portal_docs: docs(['a', '1'], ['b', '1']) }, 's'));
  assert.notEqual(h, fingerprint({ ...ref, portal_docs_dev: [] }, 's'));
  assert.notEqual(h, fingerprint(ref, 's2'));
});

test('decide: unchanged content exits early for dispatch and schedule', () => {
  for (const eventName of ['repository_dispatch', 'schedule']) {
    const v = decide({ ...base, eventName, hash: 'h1' });
    assert.equal(v.changed, false, eventName);
  }
});

test('decide: push and manual runs always deploy, even if unchanged', () => {
  for (const eventName of ['push', 'workflow_dispatch']) {
    assert.equal(decide({ ...base, eventName, hash: 'h1' }).changed, true, eventName);
  }
  assert.equal(decide({ ...base, eventName: 'schedule', hash: 'h1', force: true }).changed, true);
});

test('decide: a dispatch within the interval is deferred, the schedule sweep is not', () => {
  const recent = { ...base, lastDeployedAt: '2026-11-02T11:30:00Z' };
  const d = decide({ ...recent, eventName: 'repository_dispatch' });
  assert.equal(d.changed, false);
  assert.match(d.reason, /scheduled sweep/);
  assert.equal(decide({ ...recent, eventName: 'schedule' }).changed, true);
});

test('decide: a dispatch past the interval, or with no prior deploy, deploys', () => {
  assert.equal(decide({ ...base, eventName: 'repository_dispatch' }).changed, true);
  assert.equal(decide({ ...base, eventName: 'repository_dispatch', lastHash: undefined, lastDeployedAt: undefined }).changed, true);
});

const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

test('listDocs: follows nextPageToken and keeps only name + updateTime', async () => {
  const urls = [];
  const pages = [
    { documents: [{ name: 'n1', updateTime: 't1', fields: { slug: {} } }], nextPageToken: 'p2' },
    { documents: [{ name: 'n2', updateTime: 't2' }] },
  ];
  const fetchImpl = async (url) => (urls.push(url), json(pages.shift()));
  const out = await listDocs('portal_docs', { projectId: 'p', token: 't', fetchImpl });
  assert.deepEqual(out, [{ name: 'n1', updateTime: 't1' }, { name: 'n2', updateTime: 't2' }]);
  assert.match(urls[0], /mask\.fieldPaths=slug/);
  assert.match(urls[1], /pageToken=p2/);
});

test('listDocs: an empty collection (no "documents" key) is an empty list', async () => {
  assert.deepEqual(await listDocs('c', { projectId: 'p', token: 't', fetchImpl: async () => json({}) }), []);
});

test('readState: 404 means no previous deploy; otherwise parses hash and time', async () => {
  assert.deepEqual(await readState({ projectId: 'p', token: 't', fetchImpl: async () => json({}, 404) }), {});
  const ok = json({ fields: { hash: { stringValue: 'h' }, deployedAt: { timestampValue: '2026-11-02T00:00:00Z' } } });
  assert.deepEqual(await readState({ projectId: 'p', token: 't', fetchImpl: async () => ok }), {
    lastHash: 'h',
    lastDeployedAt: '2026-11-02T00:00:00Z',
  });
  await assert.rejects(readState({ projectId: 'p', token: 't', fetchImpl: async () => json({}, 403) }), /403/);
});

test('writeState: PATCHes only hash + deployedAt', async () => {
  let seen;
  await writeState('abc', {
    projectId: 'p', token: 't', now: new Date('2026-11-02T00:00:00Z'),
    fetchImpl: async (url, init) => ((seen = { url, init }), json({})),
  });
  assert.equal(seen.init.method, 'PATCH');
  assert.match(seen.url, /portal_deploy_state\/staging\?updateMask\.fieldPaths=hash&updateMask\.fieldPaths=deployedAt/);
  assert.deepEqual(JSON.parse(seen.init.body).fields.hash, { stringValue: 'abc' });
});

test('getAccessToken: signs a JWT and exchanges it', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  let body;
  const token = await getAccessToken({ client_email: 'sa@x', private_key: privateKey }, async (_u, init) => ((body = init.body), json({ access_token: 'tok' })), 1000);
  assert.equal(token, 'tok');
  const jwt = body.get('assertion').split('.');
  assert.equal(jwt.length, 3);
  assert.equal(JSON.parse(Buffer.from(jwt[1], 'base64url')).iss, 'sa@x');
});
