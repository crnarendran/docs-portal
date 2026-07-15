'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export interface SidebarLink {
  slug: string;
  title: string;
  isInternal: boolean;
}

const GROUPS: Record<string, string> = {
  // User Guides
  'user_guides/getting-started': 'Onboarding',
  'user_guides/account-and-login': 'Onboarding',
  'user_guides/credits_and_tiers': 'Onboarding',
  'user_guides/navigating-the-dashboard': 'Onboarding',
  'user_guides/creating-a-project': 'Projects',
  'user_guides/importing-scripts': 'Projects',
  'user_guides/cloning-projects': 'Projects',
  'user_guides/unified-studio-overview': 'Unified Studio',
  'user_guides/cast-and-characters': 'Unified Studio',
  'user_guides/timeline-editing': 'Unified Studio',
  'user_guides/visual-generation': 'Unified Studio',
  'user_guides/audio-generation': 'Unified Studio',
  'user_guides/workflow-automation': 'Automation',
  'user_guides/customizing-workflows': 'Automation',
  'user_guides/video-export': 'Export & Publishing',
  'user_guides/youtube-integration': 'Export & Publishing',
  'user_guides/youtube-publishing': 'Export & Publishing',
  'user_guides/usage-dashboard': 'Analytics',
  'user_guides/audit-ledger': 'Analytics',
  'user_guides/notifications': 'Notifications & Settings',
  // Support
  'support/faq': 'General Support',
  'support/error-reference': 'General Support',
  'support/browser-compatibility': 'General Support',
  'support/troubleshooting_credits': 'Troubleshooting',
  'support/troubleshooting_auth': 'Troubleshooting',
  'support/troubleshooting_audio': 'Troubleshooting',
  'support/troubleshooting_visuals': 'Troubleshooting',
  'support/troubleshooting_publishing': 'Troubleshooting',
  'support/troubleshooting_export': 'Troubleshooting',
  'support/troubleshooting_studio': 'Troubleshooting',
  'support/contact-support': 'Contact & Feedback',
};

// Sort order for sections and groups
const SECTION_ORDER = ['User Guide', 'Support', 'Other'];
const GROUP_ORDER = [
  'Onboarding', 'Projects', 'Unified Studio', 'Automation', 'Export & Publishing', 'Analytics', 'Notifications & Settings',
  'General Support', 'Troubleshooting', 'Contact & Feedback'
];

export function Sidebar({ links = [] }: { links?: SidebarLink[] }) {
  const { user, isSupport, logout } = useAuth();
  
  // Keep track of collapsed states. By default, sections are expanded, groups are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'User Guide': false, // Open by default
    'Support': true,     // Collapsed by default
    'Other': true
  });
  
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleGroup = (group: string) => {
    // If undefined, it defaults to true (collapsed), so clicking it expands it (sets to false)
    setCollapsedGroups(prev => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }));
  };

  // Build the 3-level tree
  const tree: Record<string, Record<string, SidebarLink[]>> = {};

  links.forEach(link => {
    if (link.slug === 'index' || link.slug === '') return; // Skip root index if any

    const parts = link.slug.split('/');
    let section = 'Other';
    if (parts[0] === 'user_guides') section = 'User Guide';
    else if (parts[0] === 'support') section = 'Support';

    const group = GROUPS[link.slug] || 'Misc';

    if (!tree[section]) tree[section] = {};
    if (!tree[section][group]) tree[section][group] = [];
    tree[section][group].push(link);
  });

  return (
    <aside
      data-testid="docs-sidebar"
      className="w-72 h-screen bg-zinc-950 text-white flex flex-col p-4 sticky top-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 border-r border-white/10"
    >
      <div className="flex items-center gap-2 mb-8 shrink-0">
        <div className="w-6 h-6 rounded-full bg-emerald-500 shrink-0"></div>
        <h2 data-testid="sidebar-title" className="text-lg font-bold text-gray-100 leading-tight">
          Sanjeev AI <br/><span className="text-emerald-400 font-normal text-sm">Documentation Portal</span>
        </h2>
      </div>

      <nav className="flex flex-col gap-6 flex-grow">
        {SECTION_ORDER.filter(s => tree[s]).map((section) => {
          const isSectionCollapsed = collapsedSections[section];
          
          return (
            <div key={section} className="flex flex-col gap-2">
              <button
                onClick={() => toggleSection(section)}
                className="w-full flex items-center justify-between text-sm font-bold text-emerald-500 uppercase tracking-widest transition-colors hover:text-emerald-400"
              >
                <span>{section}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isSectionCollapsed && (
                <div className="flex flex-col gap-3 pl-2 mt-1">
                  {GROUP_ORDER.filter(g => tree[section][g]).map(group => {
                    // Default to true (collapsed)
                    const isGroupCollapsed = collapsedGroups[group] === undefined ? true : collapsedGroups[group];
                    const groupLinks = tree[section][group].filter(link => !link.isInternal || isSupport);
                    
                    if (groupLinks.length === 0) return null;

                    return (
                      <div key={group} className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors py-1"
                        >
                          <span>{group}</span>
                          <svg
                            className={`w-3 h-3 transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : 'rotate-0'}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {!isGroupCollapsed && (
                          <div className="flex flex-col gap-0.5 border-l border-white/10 ml-1.5 pl-2">
                            {groupLinks.map(link => (
                              <Link
                                key={link.slug}
                                href={`/${link.slug}`}
                                className="px-2 py-1.5 text-sm rounded hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors text-gray-400 truncate"
                              >
                                {link.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Render Misc groups that weren't in the explicit order */}
                  {Object.keys(tree[section]).filter(g => !GROUP_ORDER.includes(g)).map(group => {
                    const isGroupCollapsed = collapsedGroups[group] === undefined ? true : collapsedGroups[group];
                    const groupLinks = tree[section][group].filter(link => !link.isInternal || isSupport);
                    
                    if (groupLinks.length === 0) return null;

                    return (
                      <div key={group} className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors py-1"
                        >
                          <span>{group}</span>
                          <svg
                            className={`w-3 h-3 transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : 'rotate-0'}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {!isGroupCollapsed && (
                          <div className="flex flex-col gap-0.5 border-l border-white/10 ml-1.5 pl-2">
                            {groupLinks.map(link => (
                              <Link
                                key={link.slug}
                                href={`/${link.slug}`}
                                className="px-2 py-1.5 text-sm rounded hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors text-gray-400 truncate"
                              >
                                {link.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!user ? (
          <Link
            href="/login"
            className="px-3 py-2 mt-auto rounded border border-gray-700 hover:bg-emerald-400/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-gray-300 text-center"
          >
            Login
          </Link>
        ) : null}
      </nav>
      
      {user && (
        <div className="mt-4 pt-4 border-t border-white/10 text-sm shrink-0">
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
