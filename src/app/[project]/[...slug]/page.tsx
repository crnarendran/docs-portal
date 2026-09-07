import { Suspense } from 'react';
import { getAllDocSlugs, getDocByProjectAndSlug, getDevDocByProjectAndSlug } from '@/lib/mdx';
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

// Shown above a route that exists only in portal_docs_dev — its content has not
// been promoted to staging. A silent fallback to dev content would present
// unpromoted work as canonical, which is a worse failure than a 404 because it
// is invisible; the banner is what makes rendering it honest.
function DraftBanner() {
  return (
    <div
      role="status"
      data-testid="draft-banner"
      className="mb-6 rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
    >
      <span className="font-semibold">⚠ Draft</span> — this document exists only on{' '}
      <code className="font-mono">dev</code> and has not been promoted to staging.
    </div>
  );
}

export async function generateStaticParams() {
  return await getAllDocSlugs();
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ project: string; slug: string[] }>;
}) {
  const { project, slug } = await params;

  // Default content comes from the promoted collection. A route enumerated from
  // the union but absent here is a dev-only draft — fall back to dev content
  // behind the banner rather than 404ing (which would recreate the bug this
  // change fixes).
  const stagingDoc = await getDocByProjectAndSlug(project, slug);
  const doc = stagingDoc ?? (await getDevDocByProjectAndSlug(project, slug));

  if (!doc) {
    notFound();
  }

  const isDraft = !stagingDoc;

  return (
    <Suspense fallback={<DocViewerFallback />}>
      <AuthGuard
        project={doc.project}
        isInternal={doc.meta.isInternal === true}
        requiresLogin={doc.meta.requiresLogin === true}
      >
        {isDraft && <DraftBanner />}
        {doc.meta.requiresLogin === true ? (
          <ProtectedDocViewer project={doc.project} slug={doc.slug} date={doc.meta.date} isDraft={isDraft} />
        ) : (
          <HybridDocViewer project={doc.project} slug={doc.slug} initialContent={doc.content} date={doc.meta.date} />
        )}
      </AuthGuard>
    </Suspense>
  );
}
