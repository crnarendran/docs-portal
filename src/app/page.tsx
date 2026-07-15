import { getAllDocs } from '@/lib/mdx';
import Link from 'next/link';

export default function Home() {
  const docs = getAllDocs();
  
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Unified Documentation Portal</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300">
        Select a document from the sidebar to get started, or browse below:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {docs.map((doc) => (
          <Link 
            key={doc.slug} 
            href={`/${doc.slug}`}
            className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm"
          >
            <h2 className="text-xl font-semibold mb-2">{doc.meta.title || doc.slug}</h2>
            {doc.meta.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {doc.meta.description}
              </p>
            )}
          </Link>
        ))}
        
        {docs.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-xl">
            No documentation files found in the docs directory.
          </div>
        )}
      </div>
    </div>
  );
}
