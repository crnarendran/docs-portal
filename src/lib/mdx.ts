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

export const getDocSlugs = async (): Promise<string[][]> => {
  const docs = await getAllDocs();
  const uniqueSlugs = new Set<string>();
  docs.forEach(d => uniqueSlugs.add(d.slug));
  
  return Array.from(uniqueSlugs).map(slug => slug.split('/'));
};

export const getDocBySlug = async (slugArray: string[]): Promise<Doc | null> => {
  const docs = await getAllDocs();
  const realSlug = slugArray.join('/');
  const doc = docs.find(d => d.slug === realSlug);
  return doc || null;
};
