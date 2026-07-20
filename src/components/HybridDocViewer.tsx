'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from './MDXComponents';
import { useAuth } from '@/context/AuthContext';

const components: any = mdxComponents;

export function HybridDocViewer({
    project,
    slug,
    initialContent,
    date
}: {
    project: string,
    slug: string,
    initialContent: string,
    date?: string
}) {
    const searchParams = useSearchParams();
    const env = searchParams.get('env') || 'staging';
    const { user, loading: authLoading, isAdmin, accessibleProjects } = useAuth();

    const [content, setContent] = useState<string>(initialContent);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Static fast path: the route (project + slug) always resolves to the
        // doc that was used to pre-render initialContent, so staging content
        // never needs a live re-fetch — only the dev-preview collection does.
        if (env !== 'dev') {
            setContent(initialContent);
            return;
        }

        let isMounted = true;
        const fetchDevDoc = async () => {
            if (authLoading) return; // Wait until auth is resolved

            // Check access
            if (project !== 'sanjeev-ai' && !isAdmin && !accessibleProjects.includes(project) && !accessibleProjects.includes('*')) {
                if (isMounted) {
                    setError("Unauthorized to view this project.");
                    setLoading(false);
                }
                return;
            }

            const docId = `${project}_${slug.replace(/\//g, '_')}`;
            const cacheKey = `doc_cache_${docId}`;

            // 1. Stale-while-revalidate: Load from sessionStorage first
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                if (isMounted) setContent(cached);
                // We still fetch in background to check for updates
            } else {
                if (isMounted) setLoading(true);
            }

            try {
                const db = getFirestore();
                const collectionName = env === 'dev' ? 'portal_docs_dev' : 'portal_docs';
                const docRef = doc(db, collectionName, docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && isMounted) {
                    const newContent = docSnap.data().content;
                    setContent(newContent);
                    sessionStorage.setItem(cacheKey, newContent);
                } else if (!cached && isMounted) {
                    setError(`Document not found in ${env} environment.`);
                }
            } catch (err: any) {
                if (!cached && isMounted) {
                    setError(`Failed to load document: ` + err.message);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDevDoc();

        return () => { isMounted = false; };
    }, [project, slug, env, initialContent, authLoading, user, isAdmin, accessibleProjects]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-4 rounded-md mt-8">
                <p className="font-medium">Dev Preview Unavailable</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={() => { setError(null); setContent(initialContent); }}
                  className="mt-3 px-3 py-1.5 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  Fallback to Staging Content
                </button>
            </div>
        );
    }

    return (
        <article className="prose dark:prose-invert max-w-none prose-emerald">
            {date && (
                <p className="text-sm text-gray-500 mb-8 flex items-center gap-2">
                  {date}
                  {env === 'dev' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">DEV PREVIEW</span>}
                </p>
            )}
            <div className="mt-8">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={components}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </article>
    );
}
