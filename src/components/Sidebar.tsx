'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export interface SidebarLink {
  slug: string;
  title: string;
  isInternal: boolean;
}

export function Sidebar({ links = [] }: { links?: SidebarLink[] }) {
  const { user, isSupport, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Group links by their first path segment
  const groupedLinks = links.reduce((acc, link) => {
    // Only index.md has no slash
    const parts = link.slug.split('/');
    const category = parts.length > 1 ? parts[0] : 'Home';
    if (!acc[category]) acc[category] = [];
    acc[category].push(link);
    return acc;
  }, {} as Record<string, SidebarLink[]>);

  // Capitalize category names
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

  // Sort categories (put Home first)
  const categories = Object.keys(groupedLinks).sort((a, b) => {
    if (a === 'Home') return -1;
    if (b === 'Home') return 1;
    return a.localeCompare(b);
  });

  return (
    <aside
      data-testid="docs-sidebar"
      className="w-64 h-screen bg-zinc-950 text-white flex flex-col p-4 sticky top-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 border-r border-white/10"
    >
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <div className="w-6 h-6 rounded-full bg-emerald-500 shrink-0"></div>
        <h2 data-testid="sidebar-title" className="text-lg font-bold text-gray-100 leading-tight">
          Sanjeev AI <span className="text-emerald-400 font-normal">Docs Portal</span>
        </h2>
      </div>

      <nav className="flex flex-col gap-4 flex-grow">
        {categories.map((category) => {
          const categoryLinks = groupedLinks[category].filter(link => !link.isInternal || isSupport);
          
          if (categoryLinks.length === 0) return null; // Hide empty categories
          
          // Default to expanded only if it's the "Home" category, unless explicitly toggled
          const isCollapsed = collapsed[category] !== undefined ? collapsed[category] : category !== 'Home';

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-wider mb-2 transition-colors"
              >
                <span>{capitalize(category)}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {!isCollapsed && (
                <div className="flex flex-col gap-1">
                  {categoryLinks.map(link => (
                    <Link
                      key={link.slug}
                      href={`/${link.slug === 'index' ? '' : link.slug}`}
                      className="px-2 py-1.5 text-sm rounded hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors text-gray-300 truncate"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!user ? (
          <Link
            href="/login"
            className="px-3 py-2 mt-4 rounded border border-gray-700 hover:bg-emerald-400/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-gray-300 text-center"
          >
            Login
          </Link>
        ) : null}
      </nav>
      
      {user && (
        <div className="mt-auto pt-4 border-t border-white/10 text-sm shrink-0">
          <div className="px-3 mb-2 text-gray-400 truncate">
            {user.email}
          </div>
          {isSupport ? (
            <div className="px-3 mb-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Support Access Granted
            </div>
          ) : (
            <div className="px-3 mb-3 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Basic Access
            </div>
          )}
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded hover:bg-red-400/10 hover:text-red-400 transition-colors text-gray-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
