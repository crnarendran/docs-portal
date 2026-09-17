#!/usr/bin/env node
// DP-12 — CI leak guard.
//
// docs-portal is a static export built with the Admin SDK, which bypasses
// Firestore security rules. A doc that should require sign-in only stays
// protected if nothing about it — title or body — ends up in the files
// Firebase Hosting serves to anyone. Nothing in the UI would look broken if
// that regressed (the login screen still renders fine); only a build-time
// scan of the actual output catches it. See
// swarm-ops/docs/planning/backlog/docs-portal-defects.md DP-10..14.
//
// Usage: node scripts/check-protected-leak.mjs [out-dir]
// Exit 0: clean. Exit 1: at least one protected doc's title or a body line
// was found in the static export — prints every file/doc pair it hit.
//
// The pure logic below (no Firestore, no filesystem) is exported for
// scripts/check-protected-leak.test.mjs, which runs with Node's built-in
// test runner (`node --test`) — no new dependency, matching the rest of
// this script's "plain node in CI" design.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readdirSync, statSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mirrors src/lib/visibility.ts. Duplicated (not imported) so this script
// stays a plain, dependency-light Node script runnable in CI without the
// Next.js/TS toolchain — keep the two in sync by hand if the rule changes.
export function isPublicDoc(meta) {
  return meta?.public === true;
}

// Section/group names hardcoded in Sidebar.tsx (PREFERRED_SECTION_ORDER /
// PREFERRED_GROUP_ORDER). They ship in the JS bundle on every build
// regardless of whether any doc exists — they're the app's own
// display-ordering config, not a specific doc's content — but a protected
// doc whose title happens to equal or sit inside one of these (e.g. a doc
// titled "Notifications") would otherwise false-positive here forever.
// Keep in sync with Sidebar.tsx if that list changes.
const UI_STRING_SEP = String.fromCharCode(0);
export const KNOWN_UI_STRINGS =
  UI_STRING_SEP +
  [
    'User Guides', 'Specs', 'Development', 'Support', 'Other',
    'Onboarding', 'Projects', 'Unified Studio', 'Automation', 'Export & Publishing',
    'Analytics', 'Notifications & Settings', 'Features', 'Specifications',
    'General Support', 'Troubleshooting', 'Contact & Feedback',
    'Architecture Decisions', 'Operations', 'Planning', 'Backlog Detail', 'Testing', 'Framework',
  ].join(UI_STRING_SEP) +
  UI_STRING_SEP;

// DP-14: once any doc is public (`public: true`), title collisions between a
// public doc and a protected one are routine, not a bug — a public user
// guide is free to mention "Billing Dashboard" even though that's also the
// title of a private spec. A title sentinel is only useful if it is NOT
// otherwise explained by legitimate public content, so it's built once from
// every public doc's own title + body and checked against that corpus.
// Deliberately title-only: a protected doc's BODY appearing inside public
// content would be a real leak (the public doc would be quoting private
// text), so body-line sentinels are never excluded this way, only titles.
export function buildPublicCorpus(publicDocs) {
  return (
    UI_STRING_SEP +
    publicDocs
      .map((d) => `${d.meta?.title || ''}${UI_STRING_SEP}${d.content || ''}`)
      .join(UI_STRING_SEP) +
    UI_STRING_SEP
  );
}

// A sentinel per protected doc: its title (if distinctive enough to not
// false-positive on generic or already-public strings) and the first
// sufficiently long, non-boilerplate line of its body. Matching on the
// literal doc content is deliberate — the point is to catch it appearing
// ANYWHERE in the build output, not just in the field we expect to carry it.
//
// Every static route necessarily embeds its OWN (project, slug) in Next's
// routing/RSC scaffolding — that's not a leak, it's the URL the visitor
// already used to get there. Some docs' synced title IS their slug (the
// sync script falls back to the slug when frontmatter has no `title:`),
// which would otherwise make that harmless routing artifact look like a
// title leak. Skip a title sentinel that just reproduces the doc's own
// slug, that's wholly contained in the app's own known UI strings, or that
// a public doc already legitimately contains (DP-14).
export function sentinelsFor(data, publicCorpus) {
  const sentinels = [];
  const title = String(data.meta?.title || '').trim();
  if (
    title.length >= 8 &&
    title !== data.slug &&
    !KNOWN_UI_STRINGS.includes(title) &&
    !(publicCorpus && publicCorpus.includes(title))
  ) {
    sentinels.push(title);
  }

  const body = String(data.content || '');
  const line = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length >= 24 && !/^#+$/.test(l) && !/^[-=*_`~]+$/.test(l));
  if (line) sentinels.push(line.slice(0, 200));

  return sentinels;
}

// Pure matcher: given sentinel entries ({key, sentinel}) and file entries
// ({file, text}), returns every (file, key, sentinel) where the sentinel is
// a literal substring of that file's text.
export function findHits(sentinelEntries, fileEntries) {
  const hits = [];
  for (const { file, text } of fileEntries) {
    for (const { key, sentinel } of sentinelEntries) {
      if (text.includes(sentinel)) {
        hits.push({ file, key, sentinel });
      }
    }
  }
  return hits;
}

const OUT_DIR = process.argv[2] || 'out';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging';
const SCAN_EXTENSIONS = /\.(html|txt|js|json)$/;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (SCAN_EXTENSIONS.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
  }
  const db = getFirestore();

  if (!statSync(OUT_DIR, { throwIfNoEntry: false })) {
    console.error(`FATAL: ${OUT_DIR}/ does not exist — run the build first.`);
    process.exit(2);
  }

  const allDocs = [];
  for (const col of ['portal_docs', 'portal_docs_dev']) {
    const snap = await db.collection(col).get();
    snap.forEach((docSnap) => allDocs.push({ col, data: docSnap.data() }));
  }

  const publicDocs = allDocs.filter(({ data }) => isPublicDoc(data.meta)).map(({ data }) => data);
  const publicCorpus = buildPublicCorpus(publicDocs);

  const sentinelEntries = [];
  for (const { col, data } of allDocs) {
    if (isPublicDoc(data.meta)) continue;
    const key = `${col}/${data.project || 'sanjeev-ai'}/${data.slug}`;
    for (const sentinel of sentinelsFor(data, publicCorpus)) {
      sentinelEntries.push({ key, sentinel });
    }
  }

  console.log(
    `DP-12: checking ${sentinelEntries.length} sentinel(s) from protected docs ` +
      `(${publicDocs.length} public doc(s) excluded from corpus-collision) against ${OUT_DIR}/ ...`
  );

  const fileEntries = [];
  for (const file of walk(OUT_DIR)) {
    try {
      fileEntries.push({ file, text: readFileSync(file, 'utf8') });
    } catch {
      // binary/unreadable — not a leak vector we scan
    }
  }

  const hits = findHits(sentinelEntries, fileEntries);

  if (hits.length > 0) {
    console.error(
      `\nDP-12 LEAK DETECTED: ${hits.length} hit(s) of protected-doc content in ${OUT_DIR}/:\n`
    );
    for (const h of hits.slice(0, 50)) {
      console.error(`  ${h.file}\n    <- ${h.key}: "${h.sentinel.slice(0, 100)}"`);
    }
    if (hits.length > 50) {
      console.error(`  ... and ${hits.length - 50} more`);
    }
    process.exit(1);
  }

  console.log(`DP-12: OK — no protected-doc sentinel found anywhere in ${OUT_DIR}/.`);
}

// Only run the Firestore/filesystem-hitting CLI when invoked directly —
// importing this module (from the test file) must not touch either.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('DP-12: FATAL —', err);
    process.exit(2);
  });
}
