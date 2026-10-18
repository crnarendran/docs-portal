import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { EMULATOR_PROJECT, useEmulatorsForAdminSdk } from './emulator';

// DP-9 fixture: one doc that exists only in the promoted collection
// (portal_docs), one only in the dev preview (portal_docs_dev), and one in
// both with different bodies. All are `public: true` so the route-level
// assertions need no sign-in; visibility rules have their own coverage.
// Doc ids follow the sync scripts' `${project}_${slug with / as _}` shape,
// which the ?env=dev client fetch relies on.
export const FIXTURE = {
  project: 'sanjeev-ai',
  stagingOnly: { slug: 'fixtures/staging-only', title: 'Fixture Staging Only', body: 'STAGING-ONLY-BODY' },
  devOnly: { slug: 'fixtures/dev-only', title: 'Fixture Dev Only', body: 'DEV-ONLY-BODY' },
  both: {
    slug: 'fixtures/in-both',
    title: 'Fixture In Both',
    stagingBody: 'BOTH-STAGING-BODY',
    devBody: 'BOTH-DEV-BODY',
  },
};

const docId = (slug: string) => `${FIXTURE.project}_${slug.replace(/\//g, '_')}`;

function fixtureDoc(slug: string, title: string, content: string) {
  return {
    slug,
    project: FIXTURE.project,
    meta: { title, section: 'Fixtures', category: 'DP-9', public: true },
    content,
  };
}

// Login-gated docs (no `public: true`) in the other two projects. The RBAC and
// project-switcher specs grant and revoke access to these projects, and the
// project dropdowns are built from the projects that have docs.
export const GATED_PROJECTS = ['swarmkit', 'keystar'];

export async function seedDocs() {
  useEmulatorsForAdminSdk();
  if (!getApps().length) initializeApp({ projectId: EMULATOR_PROJECT });
  const db = getFirestore();
  const f = FIXTURE;
  const gated = GATED_PROJECTS.map((project) =>
    db.collection('portal_docs').doc(`${project}_test-gated-doc`).set({
      slug: 'test-gated-doc',
      project,
      meta: { title: `Gated doc (${project})`, section: 'Fixtures', category: 'DP-9', requiresLogin: true },
      content: `GATED-${project.toUpperCase()}-BODY`,
    })
  );
  await Promise.all([
    ...gated,
    db.collection('portal_docs').doc(docId(f.stagingOnly.slug)).set(fixtureDoc(f.stagingOnly.slug, f.stagingOnly.title, f.stagingOnly.body)),
    db.collection('portal_docs_dev').doc(docId(f.devOnly.slug)).set(fixtureDoc(f.devOnly.slug, f.devOnly.title, f.devOnly.body)),
    db.collection('portal_docs').doc(docId(f.both.slug)).set(fixtureDoc(f.both.slug, f.both.title, f.both.stagingBody)),
    db.collection('portal_docs_dev').doc(docId(f.both.slug)).set(fixtureDoc(f.both.slug, f.both.title, f.both.devBody)),
  ]);
}
