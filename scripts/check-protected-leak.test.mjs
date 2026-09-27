// Regression tests for DP-12's leak-guard logic (scripts/check-protected-leak.mjs).
// Plain node, no framework: `node --test scripts/check-protected-leak.test.mjs`.
// Pure functions only — no Firestore, no filesystem, no build required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublicDoc,
  buildPublicCorpus,
  sentinelsFor,
  findHits,
} from './check-protected-leak.mjs';

test('isPublicDoc: true only on explicit public:true', () => {
  assert.equal(isPublicDoc({ public: true }), true);
  assert.equal(isPublicDoc({ public: false }), false);
  assert.equal(isPublicDoc({}), false);
  assert.equal(isPublicDoc(undefined), false);
  assert.equal(isPublicDoc({ requiresLogin: false }), false); // DP-10: not an opt-in, see visibility.ts
});

test('DP-14 regression: a public doc containing a protected doc\'s TITLE must not fail', () => {
  const protectedDoc = {
    slug: 'specs/billing-dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Billing Dashboard' },
    content: 'Internal pricing model and margin targets for the billing dashboard rollout.',
  };
  const publicGuide = {
    slug: 'user_guides/usage-dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Usage Dashboard Guide', public: true },
    // Legitimately mentions the protected doc's title in passing.
    content: 'See the Billing Dashboard tab for your current usage and spend.',
  };

  const publicCorpus = buildPublicCorpus([publicGuide]);
  const sentinels = sentinelsFor(protectedDoc, publicCorpus);

  // The title sentinel must be excluded (it's explained by public content);
  // the body-line sentinel is unaffected and still present.
  assert.ok(!sentinels.includes('Billing Dashboard'), 'title should be excluded as a sentinel');
  assert.ok(
    sentinels.some((s) => s.includes('Internal pricing model')),
    'the distinctive body line must still be a sentinel'
  );

  const hits = findHits(
    [{ key: 'portal_docs/sanjeev-ai/specs/billing-dashboard', sentinel: sentinels[0] }],
    [{ file: 'out/sanjeev-ai/user_guides/usage-dashboard.html', text: publicGuide.content }]
  );
  assert.equal(hits.length, 0, 'a public doc quoting a protected title must not be reported as a leak');
});

test('regression: a public doc containing a protected doc\'s BODY LINE must still fail', () => {
  const protectedDoc = {
    slug: 'specs/billing-dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Billing Dashboard' },
    content: 'Internal pricing model and margin targets for the billing dashboard rollout.',
  };
  const publicGuide = {
    slug: 'user_guides/usage-dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Usage Dashboard Guide', public: true },
    content: 'nothing sensitive here',
  };

  const publicCorpus = buildPublicCorpus([publicGuide]);
  const sentinels = sentinelsFor(protectedDoc, publicCorpus);
  const bodySentinel = sentinels.find((s) => s.includes('Internal pricing model'));
  assert.ok(bodySentinel, 'body-line sentinel must exist');

  // Simulate the protected doc's body having actually leaked into a build file.
  const hits = findHits(
    [{ key: 'portal_docs/sanjeev-ai/specs/billing-dashboard', sentinel: bodySentinel }],
    [{ file: 'out/sanjeev-ai/user_guides/usage-dashboard.html', text: `... ${bodySentinel} ...` }]
  );
  assert.equal(hits.length, 1, 'a real body-text leak must still be caught');
});

test('a title identical to the doc\'s own slug is not used as a sentinel (routing artifact, not a leak)', () => {
  const doc = {
    slug: 'adr/2026-09-06-example',
    project: 'sanjeev-ai',
    meta: { title: 'adr/2026-09-06-example' }, // sync fell back to slug, no frontmatter title
    content: 'short',
  };
  const sentinels = sentinelsFor(doc, '');
  assert.ok(!sentinels.includes('adr/2026-09-06-example'));
});

test('a title matching Sidebar.tsx\'s own hardcoded UI strings is not used as a sentinel', () => {
  const doc = {
    slug: 'specs/features/notifications',
    project: 'sanjeev-ai',
    meta: { title: 'Notifications' }, // substring of "Notifications & Settings"
    content: 'short',
  };
  const sentinels = sentinelsFor(doc, '');
  assert.ok(!sentinels.includes('Notifications'));
});

test('DP-12 2026-09 regression: a protected title that is a literal SUBSTRING of a public doc\'s own TITLE must not fail', () => {
  // Real incident: portal_docs/sanjeev-ai/specs/features/billing_dashboard
  // ("Billing Dashboard", requiresLogin) sat alongside a newly-synced public
  // guide portal_docs/sanjeev-ai/user_guides/usage-dashboard titled "Usage &
  // Billing Dashboard" (public: true). The protected title is a substring of
  // the PUBLIC doc's own title (not its body, which the existing DP-14 test
  // above already covers) — sidebarLinks legitimately embeds that public
  // title verbatim in every static page's RSC payload, and a checker that
  // can't tell the two apart reports it as a leak. This is exactly the
  // failure that shipped on `main` for 11 days: `main` was simply missing
  // the buildPublicCorpus/DP-14 fix that already existed on `dev` — no
  // application code was ever broken.
  const protectedDoc = {
    slug: 'specs/features/billing_dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Billing Dashboard' },
    content: '',
  };
  const publicGuide = {
    slug: 'user_guides/usage-dashboard',
    project: 'sanjeev-ai',
    meta: { title: 'Usage & Billing Dashboard', public: true },
    content: 'Track your credit consumption, view cost breakdowns, and monitor your limits.',
  };

  const publicCorpus = buildPublicCorpus([publicGuide]);
  const sentinels = sentinelsFor(protectedDoc, publicCorpus);
  assert.ok(
    !sentinels.includes('Billing Dashboard'),
    'a protected title contained in a public doc\'s own title must be excluded, not just one contained in its body'
  );

  // A fixture "build": the public doc's title appears in a public page
  // (e.g. baked into the shared sidebar/RSC payload of an unrelated route
  // such as /login), same shape as the real leak report.
  const hits = findHits(
    [{ key: 'portal_docs/sanjeev-ai/specs/features/billing_dashboard', sentinel: 'Billing Dashboard' }],
    [{ file: 'out/login.html', text: JSON.stringify([{ title: publicGuide.meta.title }]) }]
  );
  assert.equal(
    hits.length,
    1,
    'sanity check: the raw sentinel (unfiltered) DOES match the fixture page, proving the corpus exclusion above is what prevents the false report, not an accident of the fixture'
  );
});

test('a genuinely distinctive protected title with no public collision IS still a sentinel and still fails', () => {
  const doc = {
    slug: 'planning/backlog/grand-plan',
    project: 'swarm-ops',
    meta: { title: 'The Grand Plan — Q4 Roadmap' },
    content: 'first distinctive body line here, long enough to qualify as a sentinel too',
  };
  const sentinels = sentinelsFor(doc, buildPublicCorpus([]));
  assert.ok(sentinels.includes('The Grand Plan — Q4 Roadmap'));

  const hits = findHits(
    [{ key: 'k', sentinel: 'The Grand Plan — Q4 Roadmap' }],
    [{ file: 'out/leaked.html', text: 'oops: The Grand Plan — Q4 Roadmap is in here' }]
  );
  assert.equal(hits.length, 1);
});
