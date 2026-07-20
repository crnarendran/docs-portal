import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging'
  });
}

const db = getFirestore();

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

// In Next.js App Router, this will run at build time (and during dev)
export const getAllDocs = async (): Promise<Doc[]> => {
  // We use portal_docs as the source of truth for paths
  const snapshot = await db.collection('portal_docs').get();

  const docs: Doc[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    docs.push({
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
    });
  });

  return docs;
};

// Route params for the [project]/[...slug] page. Keyed on (project, slug)
// together, not slug alone — two different projects can legitimately have
// the same slug (e.g. both an "index"), and a slug-only key would collapse
// them into a single ambiguous route.
export const getDocParams = async (): Promise<{ project: string; slug: string[] }[]> => {
  const docs = await getAllDocs();
  return docs.map(d => ({
    project: d.project,
    slug: d.slug.split('/'),
  }));
};

export const getDocByProjectAndSlug = async (
  project: string,
  slugArray: string[]
): Promise<Doc | null> => {
  const docs = await getAllDocs();
  const realSlug = slugArray.join('/');
  const doc = docs.find(d => d.project === project && d.slug === realSlug);
  return doc || null;
};
