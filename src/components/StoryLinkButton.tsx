'use client';

import { useEffect, useRef, useState } from 'react';
import { canonicalStoryUrl } from '@/lib/storyLink';

// DP-21: copies the canonical deep link for one story row. The "Link copied"
// confirmation clears itself after 2 s. On a phone the button is a 44 px tap
// target; from md up it shrinks to the icon so it doesn't bloat the table.
export function StoryLinkButton({ storyId, env }: { storyId: string; env: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    const url = canonicalStoryUrl(window.location.origin, window.location.pathname, env, storyId);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (insecure context / permission denied):
      // fall back to a transient textarea so the link can still be copied.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center align-middle">
      <button
        type="button"
        onClick={copy}
        data-testid="story-link-btn"
        aria-label={`Copy link to ${storyId}`}
        title="Copy link to this story"
        className="ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400 hover:text-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:min-h-0 md:min-w-0 md:p-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <span role="status" aria-live="polite" className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
        {copied ? 'Link copied' : ''}
      </span>
    </span>
  );
}
