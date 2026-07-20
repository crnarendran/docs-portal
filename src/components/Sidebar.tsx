'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export interface SidebarLink {
  slug: string;
  project?: string;
  title: string;
  isInternal: boolean;
  section?: string;
  category?: string;
  requiresLogin?: boolean;
}

// Preferred sort order for sections and groups. Anything not in here is sorted alphabetically.
const PREFERRED_SECTION_ORDER = ['User Guides', 'Specs', 'Development', 'Support', 'Other'];
const PREFERRED_GROUP_ORDER = [
  'Onboarding', 'Projects', 'Unified Studio', 'Automation', 'Export & Publishing', 'Analytics', 'Notifications & Settings',
  'Features', 'Specifications',
  'General Support', 'Troubleshooting', 'Contact & Feedback',
  'ADR', 'Planning', 'Testing', 'Framework'
];

export function Sidebar({ links = [] }: { links?: SidebarLink[] }) {
  const { user, isAdmin, accessibleProjects, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const selectRef = useRef<HTMLSelectElement>(null);

  // Current selection, reused both by the switchers below and by every
  // sidebar nav link so navigating the doc tree doesn't reset it.
  const currentProject = searchParams.get('project') || 'sanjeev-ai';
  const currentEnv = searchParams.get('env') || 'staging';
  const hasProjectAccess =
    isAdmin ||
    accessibleProjects.includes('*') ||
    accessibleProjects.includes(currentProject);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProject = e.target.value;
    router.push(`${pathname}?project=${newProject}&env=${currentEnv}`);
  };

  const handleEnvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEnv = e.target.value;
    router.push(`${pathname}?project=${currentProject}&env=${newEnv}`);
  };
  
  // Keep track of collapsed states. By default, 'User Guides' is expanded, others are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'User Guides': false,
  });
  
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: prev[section] === undefined ? false : !prev[section] }));
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }));
  };

  // Build the 3-level tree
  const tree: Record<string, Record<string, SidebarLink[]>> = Object.create(null);

  const isAuthorizedForProject = isAdmin || accessibleProjects.includes(currentProject) || accessibleProjects.includes('*') || currentProject === 'sanjeev-ai';

  links.forEach(link => {
    if (!isAuthorizedForProject) return;
    if (link.slug === 'index' || link.slug === '') return;

    // Filter by project (defaulting older unmigrated links to sanjeev-ai)
    const linkProject = link.project || 'sanjeev-ai';
    if (linkProject !== currentProject) return;

    // Determine visibility based on user status
    if (link.requiresLogin && !user) return;
    if (link.isInternal && !hasProjectAccess) return;

    let section = String(link.section || 'Other');
    let group = String(link.category || 'Misc');

    if (!tree[section]) tree[section] = Object.create(null);
    if (!tree[section][group]) tree[section][group] = [];
    tree[section][group].push(link);
  });

  const sections = Object.keys(tree).sort((a, b) => {
    const indexA = PREFERRED_SECTION_ORDER.indexOf(a);
    const indexB = PREFERRED_SECTION_ORDER.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <aside
      data-testid="docs-sidebar"
      className="w-72 h-screen bg-zinc-950 text-white flex flex-col p-4 sticky top-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 border-r border-white/10"
    >
      <div className="flex flex-col gap-3 mb-8 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-emerald-500 shrink-0"></div>
          <h2 data-testid="sidebar-title" className="text-lg font-bold text-gray-100 leading-tight">
            Sanjeev AI <br/><span className="text-emerald-400 font-normal text-sm">Documentation Portal</span>
          </h2>
        </div>
        <div className="flex gap-2">
            <select
            ref={selectRef}
            data-testid="project-selector"
            className="flex-1 bg-zinc-900 text-white border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            value={currentProject}
            onChange={handleProjectChange}
            >
            {accessibleProjects.includes('*') ? (
              <>
                <option value="sanjeev-ai">Sanjeev AI</option>
                <option value="swarmkit">SwarmKit</option>
                <option value="project-A">Project A</option>
                <option value="project-B">Project B</option>
                <option value="project-C">Project C</option>
                <option value="project-D">Project D</option>
              </>
            ) : accessibleProjects.length > 0 ? (
              accessibleProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))
            ) : (
              <option value="">No projects</option>
            )}
            </select>
            
            <select
            data-testid="env-selector"
            className="w-24 bg-zinc-900 text-white border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            value={currentEnv}
            onChange={handleEnvChange}
            >
            <option value="staging">Staging</option>
            <option value="dev">Dev</option>
            </select>
        </div>
      </div>

      <nav className="flex flex-col gap-6 flex-grow">
        {sections.map((section) => {
          // Sections default to collapsed except 'User Guides'
          const isSectionCollapsed = collapsedSections[section] === undefined ? section !== 'User Guides' : collapsedSections[section];
          const groups = Object.keys(tree[section]).sort((a, b) => {
            const indexA = PREFERRED_GROUP_ORDER.indexOf(a);
            const indexB = PREFERRED_GROUP_ORDER.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
          });
          
          return (
            <div key={section} className="flex flex-col gap-2">
              <button
                onClick={() => toggleSection(section)}
                className="w-full flex items-center justify-between text-sm font-bold text-emerald-500 uppercase tracking-widest transition-colors hover:text-emerald-400"
              >
                <span>{section}</span>
                <svg
                  className={"w-4 h-4 transition-transform duration-200 " + (isSectionCollapsed ? "-rotate-90" : "rotate-0")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isSectionCollapsed && (
                <div className="flex flex-col gap-3 pl-2 mt-1">
                  {groups.map(group => {
                    // Default to true (collapsed)
                    const isGroupCollapsed = collapsedGroups[group] === undefined ? true : collapsedGroups[group];
                    const groupLinks = tree[section][group];
                    
                    if (groupLinks.length === 0) return null;

                    return (
                      <div key={group} className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors py-1"
                        >
                          <span>{group}</span>
                          <svg
                            className={"w-3 h-3 transition-transform duration-200 " + (isGroupCollapsed ? "-rotate-90" : "rotate-0")}
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
                                href={`/${link.slug}?project=${currentProject}&env=${currentEnv}`}
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
          {isAdmin && (
            <Link
              href="/admin"
              className="block px-3 py-2 mb-2 rounded border border-emerald-700/50 hover:bg-emerald-400/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-emerald-300 text-center uppercase tracking-wider font-semibold text-xs"
            >
              Admin Panel
            </Link>
          )}
          {isAdmin ? (
            <div className="px-3 mb-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Admin Access
            </div>
          ) : hasProjectAccess ? (
            <div className="px-3 mb-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Project Access Granted
            </div>
          ) : (
            <div className="px-3 mb-3 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Basic Access
            </div>
          )}
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="w-full text-left px-3 py-2 rounded hover:bg-red-400/10 hover:text-red-400 transition-colors text-gray-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
