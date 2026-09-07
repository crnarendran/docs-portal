import { cache } from 'react';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging'
  });
}

const db = getFirestore();

// Collection names. `portal_docs` holds promoted (staging/prod) content and is
// the source of truth for default rendering. `portal_docs_dev` holds the dev
// preview, written by the per-repo dev sync workflows.
const STAGING_COLLECTION = 'portal_docs';
const DEV_COLLECTION = 'portal_docs_dev';

export interface DocMeta {
  title: string;
  date?: string;
  section?: string;
  category?: string;
  requiresLogin?: boolean;
  project?: string;
  [key: string]: any;
}

export interface Doc {
  slug: string;
  project: string;
  meta: DocMeta;
  content: string;
}

const mapDoc = (docSnap: QueryDocumentSnapshot): Doc => {
  const data = docSnap.data();
  return {
    slug: data.slug,
    project: data.project || 'sanjeev-ai', // default to sanjeev-ai for older docs
    meta: {
      title: data.meta?.title || data.slug,
      section: data.meta?.section || 'Other',
      category: data.meta?.category || 'Misc',
      requiresLogin: data.meta?.requiresLogin === true,
      project: data.project || 'sanjeev-ai',
      ...data.meta,
      date: typeof data.meta?.date?.toDate === 'function'
        ? data.meta.date.toDate().toISOString()
        : data.meta?.date
    },
    content: data.content || ''
  };
};

// Reads are wrapped in React.cache so a single build (generateStaticParams
// plus one render per page) hits each Firestore collection once, not once per
// route. Firestore .get() is not fetch, so it isn't memoized automatically.
const readCollection = cache(async (collection: string): Promise<Doc[]> => {
  const snapshot = await db.collection(collection).get();
  const docs: Doc[] = [];
  snapshot.forEach(docSnap => docs.push(mapDoc(docSnap)));
  return docs;
});

// In Next.js App Router, this runs at build time (and during dev).
// `portal_docs` is the source of truth for default (staging/prod) content.
export const getAllDocs = async (): Promise<Doc[]> => readCollection(STAGING_COLLECTION);

// Dev-preview content. Only consulted for routes with no promoted copy and by
// the client-side ?env=dev re-fetch (which reads Firestore directly).
export const getDevDocs = async (): Promise<Doc[]> => readCollection(DEV_COLLECTION);

// Route params for the [project]/[...slug] page, enumerated from the UNION of
// promoted and dev-preview content. Keyed on (project, slug) together, not slug
// alone — two different projects can legitimately have the same slug (e.g. both
// an "index"), and a slug-only key would collapse them into one ambiguous route.
//
// Used by generateStaticParams ONLY. Content lookups still go through
// getDocByProjectAndSlug / getDevDocByProjectAndSlug. Enumerating routes from
// the union means a spec that exists only on `dev` gets a page immediately,
// instead of 404ing until it is promoted (which is exactly the delay the
// dev-preview feature exists to remove). getAllDocs must NOT gain the union or
// the staging portal would start serving unpromoted content by default.
export const getAllDocSlugs = async (): Promise<{ project: string; slug: string[] }[]> => {
  const [staging, dev] = await Promise.all([getAllDocs(), getDevDocs()]);
  const seen = new Set<string>();
  const params: { project: string; slug: string[] }[] = [];
  for (const d of [...staging, ...dev]) {
    const key = `${d.project}::${d.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({ project: d.project, slug: d.slug.split('/') });
  }
  return params;
};

// Projects that have any dev-preview content, derived from portal_docs_dev.
// The env dropdown offers "Dev" only for these — selecting it for a project
// with no dev collection would 404 every page. Derived rather than hardcoded
// so the list can't drift out of sync with what the sync workflows actually
// write (it did: swarm-ops synced dev content for weeks with no dropdown).
export const getDevPreviewProjects = async (): Promise<string[]> => {
  const dev = await getDevDocs();
  return [...new Set(dev.map(d => d.project))].sort();
};

export const getDocByProjectAndSlug = async (
  project: string,
  slugArray: string[]
): Promise<Doc | null> => {
  const docs = await getAllDocs();
  const realSlug = slugArray.join('/');
  return docs.find(d => d.project === project && d.slug === realSlug) || null;
};

// Dev-preview lookup, used as the fallback for a route that generateStaticParams
// produced from the union but that has no promoted copy yet.
export const getDevDocByProjectAndSlug = async (
  project: string,
  slugArray: string[]
): Promise<Doc | null> => {
  const docs = await getDevDocs();
  const realSlug = slugArray.join('/');
  return docs.find(d => d.project === project && d.slug === realSlug) || null;
};
