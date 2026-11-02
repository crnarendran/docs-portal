#!/usr/bin/env node
// AMB-4 — decide, before installing anything, whether Deploy (Staging) has
// work to do. A job is billed from its first second, so this runs with plain
// node (no npm install) and talks to Firestore over REST.
//
//   node scripts/staging-deploy-check.mjs check   # writes changed=/hash=/reason= to $GITHUB_OUTPUT
//   node scripts/staging-deploy-check.mjs record  # after a successful deploy; stores DEPLOY_HASH
//
// Fingerprint = sha256 over the (collection, doc name, updateTime) of every
// doc in portal_docs and portal_docs_dev, plus the checked-out code sha. Both
// collections feed the static export (routes are the union of the two), and a
// code push must always redeploy, so all three go into the hash.
//
// The last deployed fingerprint lives in portal_deploy_state/staging. The
// Firestore rules deny every client read/write on unlisted collections, so it
// is invisible to the site; only the Admin service account touches it.
//
// Env: GOOGLE_APPLICATION_CREDENTIALS (service-account JSON path),
//      FIREBASE_PROJECT_ID, GITHUB_EVENT_NAME, CODE_SHA, FORCE ("true"),
//      MIN_INTERVAL_MIN (default 60), GITHUB_OUTPUT, DEPLOY_HASH (record).
import { createHash, createSign } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const COLLECTIONS = ['portal_docs', 'portal_docs_dev'];
const STATE_PATH = 'portal_deploy_state/staging';

export function fingerprint(docsByCollection, codeSha) {
  const lines = [`code|${codeSha || ''}`];
  for (const col of Object.keys(docsByCollection).sort()) {
    const rows = docsByCollection[col].map((d) => `${col}|${d.name}|${d.updateTime}`).sort();
    lines.push(...rows);
  }
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

// A push to staging or a manual run is an explicit "deploy this" and always
// goes ahead. repository_dispatch (fired after every Sync Docs run) and the
// scheduled sweep only deploy when content actually changed; a dispatch also
// waits out minIntervalMin since the last deploy, leaving the change for the
// next scheduled sweep rather than burning a ~6 minute build per sync.
export function decide({ eventName, force, hash, lastHash, lastDeployedAt, now, minIntervalMin }) {
  if (force) return { changed: true, reason: 'forced' };
  if (eventName === 'push' || eventName === 'workflow_dispatch') {
    return { changed: true, reason: `explicit ${eventName}` };
  }
  if (lastHash && hash === lastHash) return { changed: false, reason: 'unchanged since last deploy' };
  if (eventName === 'repository_dispatch' && lastDeployedAt) {
    const ageMin = (now - new Date(lastDeployedAt).getTime()) / 60000;
    if (ageMin < minIntervalMin) {
      return {
        changed: false,
        reason: `changed, but last deploy was ${Math.floor(ageMin)} min ago (< ${minIntervalMin}); the scheduled sweep will pick it up`,
      };
    }
  }
  return { changed: true, reason: lastHash ? 'content changed' : 'no previous deploy recorded' };
}

const b64url = (b) => Buffer.from(b).toString('base64url');

export async function getAccessToken(sa, fetchImpl = fetch, nowSec = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3300,
    })
  );
  const sig = createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key, 'base64url');
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${sig}`,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

export async function listDocs(collection, { projectId, token, fetchImpl = fetch }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  const out = [];
  let pageToken = '';
  do {
    // Mask to one field: only name + updateTime matter, not the (large) bodies.
    const url = `${base}?pageSize=300&mask.fieldPaths=slug${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`list ${collection} failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents || []) out.push({ name: d.name, updateTime: d.updateTime });
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return out;
}

export async function readState({ projectId, token, fetchImpl = fetch }) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${STATE_PATH}`;
  const res = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`read state failed: ${res.status} ${await res.text()}`);
  const f = (await res.json()).fields || {};
  return { lastHash: f.hash?.stringValue, lastDeployedAt: f.deployedAt?.timestampValue };
}

export async function writeState(hash, { projectId, token, fetchImpl = fetch, now = new Date() }) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${STATE_PATH}` +
    '?updateMask.fieldPaths=hash&updateMask.fieldPaths=deployedAt';
  const res = await fetchImpl(url, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: { hash: { stringValue: hash }, deployedAt: { timestampValue: now.toISOString() } },
    }),
  });
  if (!res.ok) throw new Error(`write state failed: ${res.status} ${await res.text()}`);
}

function setOutputs(obj) {
  for (const [k, v] of Object.entries(obj)) {
    console.log(`${k}=${v}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  }
}

async function main() {
  const mode = process.argv[2];
  const projectId = process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging';
  const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  const token = await getAccessToken(sa);
  const ctx = { projectId, token };

  if (mode === 'record') {
    if (!process.env.DEPLOY_HASH) throw new Error('DEPLOY_HASH not set');
    await writeState(process.env.DEPLOY_HASH, ctx);
    console.log(`recorded deploy ${process.env.DEPLOY_HASH}`);
    return;
  }

  const docs = {};
  for (const col of COLLECTIONS) docs[col] = await listDocs(col, ctx);
  const hash = fingerprint(docs, process.env.CODE_SHA);
  const state = await readState(ctx);
  const verdict = decide({
    eventName: process.env.GITHUB_EVENT_NAME,
    force: process.env.FORCE === 'true',
    hash,
    ...state,
    now: Date.now(),
    minIntervalMin: Number(process.env.MIN_INTERVAL_MIN || 60),
  });
  setOutputs({ changed: verdict.changed, hash, reason: verdict.reason });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    // Fail OPEN: if the check itself breaks, deploy rather than leave the
    // site stale. Costs one full run, never a missed deploy.
    console.error('staging-deploy-check: FAILED —', err.message);
    if (process.argv[2] === 'record') {
      // The deploy already succeeded; a lost marker just means the next
      // run redeploys once. Don't turn a good deploy red over it.
      console.error('marker not written; next run will redeploy once');
      return;
    }
    console.error('failing open: deploying');
    setOutputs({ changed: true, hash: '', reason: 'check failed, failing open' });
  });
}
