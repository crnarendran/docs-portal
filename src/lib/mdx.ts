import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Point to the workspace root's docs folder
const docsDirectory = path.join(process.cwd(), '../docs');

export interface DocMeta {
  title: string;
  date?: string;
  [key: string]: any;
}

export interface Doc {
  slug: string;
  meta: DocMeta;
  content: string;
}

// Ensure the docs directory exists (or return empty arrays if it doesn't)
const getDocsDir = () => {
  if (!fs.existsSync(docsDirectory)) {
    return null;
  }
  return docsDirectory;
};

// Get all MD/MDX files recursively or flat (assuming flat for now, but we can extend this)
export const getDocSlugs = (): string[][] => {
  const dir = getDocsDir();
  if (!dir) return [];

  const walkSync = (dir: string, filelist: string[] = [], baseDir: string = dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filepath = path.join(dir, file);
      if (fs.statSync(filepath).isDirectory()) {
        filelist = walkSync(filepath, filelist, baseDir);
      } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const relativePath = path.relative(baseDir, filepath);
        // Remove extension
        const slug = relativePath.replace(/\.mdx?$/, '');
        filelist.push(slug);
      }
    });
    return filelist;
  };

  const allFiles = walkSync(dir);
  return allFiles.map(slug => slug.split(path.sep)); // return array of path segments
};

export const getDocBySlug = (slugArray: string[]): Doc | null => {
  const dir = getDocsDir();
  if (!dir) return null;

  const realSlug = slugArray.join('/');
  const fullPathMd = path.join(dir, `${realSlug}.md`);
  const fullPathMdx = path.join(dir, `${realSlug}.mdx`);

  let fileContents = '';
  if (fs.existsSync(fullPathMdx)) {
    fileContents = fs.readFileSync(fullPathMdx, 'utf8');
  } else if (fs.existsSync(fullPathMd)) {
    fileContents = fs.readFileSync(fullPathMd, 'utf8');
  } else {
    // Also support if it is an index.md inside a folder
    const indexPathMd = path.join(dir, realSlug, 'index.md');
    const indexPathMdx = path.join(dir, realSlug, 'index.mdx');
    if (fs.existsSync(indexPathMdx)) {
      fileContents = fs.readFileSync(indexPathMdx, 'utf8');
    } else if (fs.existsSync(indexPathMd)) {
      fileContents = fs.readFileSync(indexPathMd, 'utf8');
    } else {
      return null;
    }
  }

  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    meta: data as DocMeta,
    content,
  };
};

export const getAllDocs = (): Doc[] => {
  const slugs = getDocSlugs();
  const docs = slugs
    .map((slug) => getDocBySlug(slug))
    .filter((doc): doc is Doc => doc !== null);
  
  return docs;
};
