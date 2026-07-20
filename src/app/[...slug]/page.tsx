import { Suspense } from 'react';
import { getDocBySlug, getAllDocs } from '@/lib/mdx';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { mdxComponents } from '@/components/MDXComponents';
import { ProtectedDocViewer } from '@/components/ProtectedDocViewer';
import { HybridDocViewer } from '@/components/HybridDocViewer';

function DocViewerFallback() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>
  );
}

export async function generateStaticParams() {
  const docs = await getAllDocs();
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
  const doc = await getDocBySlug(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  return (
    <Suspense fallback={<DocViewerFallback />}>
      <AuthGuard isInternal={doc.meta.isInternal === true} requiresLogin={doc.meta.requiresLogin === true}>
        {doc.meta.requiresLogin === true ? (
          <ProtectedDocViewer slug={doc.slug} date={doc.meta.date} />
        ) : (
          <HybridDocViewer slug={doc.slug} initialContent={doc.content} initialProject={doc.project} date={doc.meta.date} />
        )}
      </AuthGuard>
    </Suspense>
  );
}
