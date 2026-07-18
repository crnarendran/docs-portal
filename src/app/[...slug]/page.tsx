import { getDocBySlug, getAllDocs } from '@/lib/mdx';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { mdxComponents } from '@/components/MDXComponents';

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
    <AuthGuard isInternal={doc.meta.isInternal === true}>
      <article className="prose dark:prose-invert max-w-none prose-emerald">

        {doc.meta.date && (
          <p className="text-sm text-gray-500 mb-8">{doc.meta.date}</p>
        )}
        <div className="mt-8">
          <MDXRemote source={doc.content} components={mdxComponents} />
        </div>
      </article>
    </AuthGuard>
  );
}
