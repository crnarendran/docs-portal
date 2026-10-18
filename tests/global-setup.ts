import { seedDocs, FIXTURE, STORIES } from './support/seed';

// `next dev` compiles each route on its first request; in a fresh checkout
// (no .next) that takes 20-40 s and would eat a test's own 30 s budget.
// Request each route family once, after seeding, so specs run against a warm
// server. Failures here are ignored: a real problem shows up in the specs.
const WARM_PATHS = [
  '/',
  '/login',
  '/admin',
  '/unauthorized',
  `/${FIXTURE.project}/${FIXTURE.stagingOnly.slug}`,
  `/${FIXTURE.project}/${STORIES.slug}`,
];

export default async function globalSetup() {
  await seedDocs();
  for (const p of WARM_PATHS) {
    await fetch(`http://localhost:3001${p}`).catch(() => {});
  }
}
