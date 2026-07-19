import { getDocBySlug, getAllDocs } from '@/lib/mdx';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { mdxComponents } from '@/components/MDXComponents';
import { ProtectedDocViewer } from '@/components/ProtectedDocViewer';
import { HybridDocViewer } from '@/components/HybridDocViewer';

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug.split('/'),
  }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  return (
    <AuthGuard isInternal={doc.meta.isInternal === true} requiresLogin={doc.meta.requiresLogin === true}>
      {doc.meta.requiresLogin === true ? (
        <ProtectedDocViewer slug={doc.slug} date={doc.meta.date} />
      ) : (
        <HybridDocViewer slug={doc.slug} initialContent={doc.content} date={doc.meta.date} />
      )}
    </AuthGuard>
  );
}
