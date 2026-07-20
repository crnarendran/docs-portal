import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

// Initialize Firebase Admin (Uses Application Default Credentials).
// dev and staging both live in docs-portal-staging (distinguished by
// collection name below); pass FIREBASE_PROJECT_ID=docs-portal-prod to
// target production instead.
initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'docs-portal-staging'
});
const db = getFirestore();

import * as url from 'url';

// Point to the workspace root's docs folder
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const docsDirectory = path.join(__dirname, '../../docs');

const getDocSlugs = (): string[] => {
  if (!fs.existsSync(docsDirectory)) return [];

  const walkSync = (dir: string, filelist: string[] = [], baseDir: string = dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filepath = path.join(dir, file);
      if (fs.statSync(filepath).isDirectory()) {
        filelist = walkSync(filepath, filelist, baseDir);
      } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const relativePath = path.relative(baseDir, filepath);
        // Replace Windows backslashes with forward slashes to ensure consistent slugs
        const slug = relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/');
        filelist.push(slug);
      }
    });
    return filelist;
  };

  return walkSync(docsDirectory);
};

const syncDocs = async () => {
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  const targetEnv = envArg ? envArg.split('=')[1] : 'staging';

  const collectionName = targetEnv === 'dev' ? 'portal_docs_dev' : 'portal_docs';

  console.log(`Syncing docs for environment: ${targetEnv} to collection: ${collectionName}...`);

  const slugs = getDocSlugs();
  let count = 0;

  for (const slug of slugs) {
    const fullPathMd = path.join(docsDirectory, `${slug}.md`);
    const fullPathMdx = path.join(docsDirectory, `${slug}.mdx`);
    const indexPathMd = path.join(docsDirectory, slug, 'index.md');
    const indexPathMdx = path.join(docsDirectory, slug, 'index.mdx');

    let fileContents = '';
    if (fs.existsSync(fullPathMdx)) fileContents = fs.readFileSync(fullPathMdx, 'utf8');
    else if (fs.existsSync(fullPathMd)) fileContents = fs.readFileSync(fullPathMd, 'utf8');
    else if (fs.existsSync(indexPathMdx)) fileContents = fs.readFileSync(indexPathMdx, 'utf8');
    else if (fs.existsSync(indexPathMd)) fileContents = fs.readFileSync(indexPathMd, 'utf8');
    else continue;

    const { data, content } = matter(fileContents);
    
    // Replace slash with underscore as used in ProtectedDocViewer
    const docId = slug.replace(/\//g, '_');
    const docRef = db.collection(collectionName).doc(docId);

    await docRef.set({
        slug: slug,
        meta: {
            title: String(data.title || slug),
            section: String(data.section || 'Other'),
            category: String(data.category || 'Misc'),
            requiresLogin: data.requiresLogin === true || data.requiresLogin === 'true',
            isInternal: data.isInternal === true || data.isInternal === 'true',
            ...data
        },
        content: content,
        env: targetEnv,
        updatedAt: FieldValue.serverTimestamp()
    });

    count++;
  }

  console.log(`Successfully synced ${count} docs to Firestore collection '${collectionName}'.`);
};

syncDocs().catch(console.error);
