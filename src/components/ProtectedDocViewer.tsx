'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from './MDXComponents';
// We need to cast mdxComponents to match ReactMarkdown's expected types if necessary,
// but standard HTML element overrides usually match.
const components: any = mdxComponents;

export function ProtectedDocViewer({ slug, date }: { slug: string, date?: string }) {
    const [content, setContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDoc = async () => {
            try {
                const auth = getAuth();
                const db = getFirestore();
                
                if (!auth.currentUser) {
                    if (isMounted) {
                        setError("Authentication required to view this document.");
                        setLoading(false);
                    }
                    return;
                }

                // Convert slash to underscore as we did in the upload script
                const docId = slug.replace(/\//g, '_');
                const docRef = doc(db, 'portal_docs', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    if (isMounted) {
                        setContent(docSnap.data().content);
                    }
                } else {
                    if (isMounted) {
                        setError("Document not found in secure storage. Has it been synced?");
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
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mt-8">
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
