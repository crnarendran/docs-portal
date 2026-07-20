import { Suspense } from 'react';
import { getDocParams, getDocByProjectAndSlug } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
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
  const params = await getDocParams();
  return params.map(({ project, slug }) => ({ project, slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ project: string; slug: string[] }>;
}) {
  const resolvedParams = await params;
  const doc = await getDocByProjectAndSlug(resolvedParams.project, resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  return (
    <Suspense fallback={<DocViewerFallback />}>
      <AuthGuard
        project={doc.project}
        isInternal={doc.meta.isInternal === true}
        requiresLogin={doc.meta.requiresLogin === true}
      >
        {doc.meta.requiresLogin === true ? (
          <ProtectedDocViewer project={doc.project} slug={doc.slug} date={doc.meta.date} />
        ) : (
          <HybridDocViewer project={doc.project} slug={doc.slug} initialContent={doc.content} date={doc.meta.date} />
        )}
      </AuthGuard>
    </Suspense>
  );
}
