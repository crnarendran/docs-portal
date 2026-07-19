'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from './MDXComponents';
// We need to cast mdxComponents to match ReactMarkdown's expected types if necessary,
// but standard HTML element overrides usually match.
const components: any = mdxComponents;

export function ProtectedDocViewer({ slug, date }: { slug: string, date?: string }) {
    const searchParams = useSearchParams();
    const env = searchParams.get('env') || 'staging';
    const project = searchParams.get('project') || 'sanjeev-ai';
    const { user, loading: authLoading, isAdmin, accessibleProjects } = useAuth();
    
    const [content, setContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDoc = async () => {
            if (authLoading) return; // Wait until auth is resolved

            try {
                if (!user) {
                    if (isMounted) {
                        setError("Authentication required to view this document.");
                        setLoading(false);
                    }
                    return;
                }

                // Check access
                if (!isAdmin && !accessibleProjects.includes(project) && !accessibleProjects.includes('*')) {
                    if (isMounted) {
                        setError("Unauthorized to view this project.");
                        setLoading(false);
                    }
                    return;
                }

                // Removed local db import

                // Convert slash to underscore as we did in the upload script
                const docId = slug.replace(/\//g, '_');
                const collectionName = env === 'dev' ? 'portal_docs_dev' : 'portal_docs';
                const docRef = doc(db, collectionName, docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    if (isMounted) {
                        setContent(docSnap.data().content);
                    }
                } else {
                    if (isMounted) {
                        setError(`Document not found in ${env} environment. Has it been synced?`);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setError("Failed to load document: " + err.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDoc();

        return () => {
            isMounted = false;
        };
    }, [slug, authLoading, user, isAdmin, accessibleProjects, project, env]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div data-testid="unauthorized-message" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mt-8">
                <p className="font-medium">Error Loading Protected Document</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <article className="prose dark:prose-invert max-w-none prose-emerald">
            {date && (
                <p className="text-sm text-gray-500 mb-8">{date}</p>
            )}
            <div className="mt-8">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={components}
                >
                    {content || ''}
                </ReactMarkdown>
            </div>
        </article>
    );
}
