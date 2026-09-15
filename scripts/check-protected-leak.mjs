#!/usr/bin/env node
// DP-12 — CI leak guard.
//
// docs-portal is a static export built with the Admin SDK, which bypasses
// Firestore security rules. A doc that should require sign-in only stays
// protected if nothing about it — title or body — ends up in the files
// Firebase Hosting serves to anyone. Nothing in the UI would look broken if
// that regressed (the login screen still renders fine); only a build-time
// scan of the actual output catches it. See
// swarm-ops/docs/planning/backlog/docs-portal-defects.md DP-10..13.
//
// Usage: node scripts/check-protected-leak.mjs [out-dir]
// Exit 0: clean. Exit 1: at least one protected doc's title or a body line
// was found in the static export — prints every file/doc pair it hit.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readdirSync, statSync, readFileSync } from 'fs';
import path from 'path';

const OUT_DIR = process.argv[2] || 'out';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging';

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore();

// Mirrors src/lib/visibility.ts. Duplicated (not imported) so this script
// stays a plain, dependency-light Node script runnable in CI without the
// Next.js/TS toolchain — keep the two in sync by hand if the rule changes.
function isPublicDoc(meta) {
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
const KNOWN_UI_STRINGS =
  UI_STRING_SEP +
  [
    'User Guides', 'Specs', 'Development', 'Support', 'Other',
    'Onboarding', 'Projects', 'Unified Studio', 'Automation', 'Export & Publishing',
    'Analytics', 'Notifications & Settings', 'Features', 'Specifications',
    'General Support', 'Troubleshooting', 'Contact & Feedback',
    'Architecture Decisions', 'Operations', 'Planning', 'Backlog Detail', 'Testing', 'Framework',
  ].join(UI_STRING_SEP) +
  UI_STRING_SEP;

// A sentinel per protected doc: its title (if distinctive enough to not
// false-positive on generic strings) and the first sufficiently long,
// non-boilerplate line of its body. Matching on the literal doc content is
// deliberate — the point is to catch it appearing ANYWHERE in the build
// output, not just in the field we expect to carry it.
//
// Every static route necessarily embeds its OWN (project, slug) in Next's
// routing/RSC scaffolding — that's not a leak, it's the URL the visitor
// already used to get there. Some docs' synced title IS their slug (the
// sync script falls back to the slug when frontmatter has no `title:`),
// which would otherwise make that harmless routing artifact look like a
// title leak. Skip a title sentinel that just reproduces the doc's own
// slug, or that's wholly contained in the app's own known UI strings.
function sentinelsFor(data) {
  const sentinels = [];
  const title = String(data.meta?.title || '').trim();
  if (title.length >= 8 && title !== data.slug && !KNOWN_UI_STRINGS.includes(title)) {
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

async function loadProtectedSentinels() {
  const collections = ['portal_docs', 'portal_docs_dev'];
  const entries = [];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (isPublicDoc(data.meta)) return;
      const key = `${col}/${data.project || 'sanjeev-ai'}/${data.slug}`;
      for (const sentinel of sentinelsFor(data)) {
        entries.push({ key, sentinel });
      }
    });
  }
  return entries;
}

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
  if (!statSync(OUT_DIR, { throwIfNoEntry: false })) {
    console.error(`FATAL: ${OUT_DIR}/ does not exist — run the build first.`);
    process.exit(2);
  }

  const sentinels = await loadProtectedSentinels();
  console.log(
    `DP-12: checking ${sentinels.length} sentinel(s) from protected docs against ${OUT_DIR}/ ...`
  );

  const files = walk(OUT_DIR);
  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // binary/unreadable — not a leak vector we scan
    }
    for (const { key, sentinel } of sentinels) {
      if (text.includes(sentinel)) {
        hits.push({ file, key, sentinel });
      }
    }
  }

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

main().catch((err) => {
  console.error('DP-12: FATAL —', err);
  process.exit(2);
});
