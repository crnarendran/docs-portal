'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { isPublicDoc } from '@/lib/visibility';

export interface SidebarLink {
  slug: string;
  project?: string;
  title: string;
  section?: string;
  category?: string;
}

// Preferred sort order for sections and groups. Anything not in here is sorted alphabetically.
const PREFERRED_SECTION_ORDER = ['User Guides', 'Specs', 'Development', 'Support', 'Other'];
const PREFERRED_GROUP_ORDER = [
  'Onboarding', 'Projects', 'Unified Studio', 'Automation', 'Export & Publishing', 'Analytics', 'Notifications & Settings',
  'Features', 'Specifications',
  'General Support', 'Troubleshooting', 'Contact & Feedback',
  'Architecture Decisions', 'Operations', 'Planning', 'Backlog Detail', 'Testing', 'Framework'
];

// Projects that have any dev-preview content (portal_docs_dev), derived at
// build time in layout.tsx and passed down. Selecting Dev for a project not in
// this list would 404 every page, so the dropdown only offers it for these.
//
// `links` (DP-11) is public docs ONLY — baked at build time, safe for anyone
// to read. `publicProjects` is every project that has a PUBLIC doc — project
// names of protected-only projects are metadata DP-11 already decided not to
// ship (DP-16). Protected projects are added to the selector the same way
// protected links are: fetched client-side, after sign-in, below.
export function Sidebar({
  links = [],
  devPreviewProjects = [],
  publicProjects = [],
  isCollapsed = false,
  onToggle,
}: {
  links?: SidebarLink[];
  devPreviewProjects?: string[];
  publicProjects?: string[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}) {
  const { user, isAdmin, accessibleProjects, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();

  const selectRef = useRef<HTMLSelectElement>(null);

  // DP-11: protected docs' titles are fetched here, after sign-in, under
  // Firestore's existing rules (isSignedIn() && hasProjectAccess) — never
  // baked into the static build. sanjeev-ai is always queried because the
  // rules grant it to any signed-in user regardless of accessibleProjects
  // (firestore.rules hasProjectAccess). Admin / '*' queries the whole
  // collection once; everyone else queries per accessible project, which
  // the rules can verify per query — a project the user does NOT have
  // (stale grant, race on first sign-in) makes that one query fail, which is
  // caught and skipped rather than breaking the rest of the sidebar.
  // Scoped to portal_docs (staging) only, matching links — dev-only docs
  // were already outside the sidebar before this change.
  const [protectedLinks, setProtectedLinks] = useState<SidebarLink[]>([]);

  useEffect(() => {
    if (!user) {
      setProtectedLinks([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const unrestricted = isAdmin || accessibleProjects.includes('*');
      const projects: (string | null)[] = unrestricted
        ? [null]
        : Array.from(new Set(['sanjeev-ai', ...accessibleProjects]));

      const results: SidebarLink[] = [];
      for (const project of projects) {
        try {
          const q = project
            ? query(collection(db, 'portal_docs'), where('project', '==', project))
            : collection(db, 'portal_docs');
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (isPublicDoc(data.meta)) return; // already in the static `links`
            results.push({
              slug: data.slug,
              project: data.project || 'sanjeev-ai',
              title: data.meta?.title || data.slug,
              section: data.meta?.section,
              category: data.meta?.category,
            });
          });
        } catch (e) {
          console.error('[Sidebar] protected doc listing failed for project', project, e);
        }
      }

      if (!cancelled) setProtectedLinks(results);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, accessibleProjects]);

  const allLinks = links.concat(protectedLinks);
  // DP-16: the project selector's option list. publicProjects is always
  // offered (baked at build time, safe for anyone). Protected projects come
  // from protectedLinks — already scoped to what THIS user can read, since
  // that fetch only succeeds for projects Firestore's rules grant them — so
  // no additional accessibleProjects filter belongs here; applying one would
  // hide public projects from a user with no grants yet, which was DP-16's bug.
  const selectableProjects = [
    ...new Set([...publicProjects, ...protectedLinks.map(l => l.project || 'sanjeev-ai')]),
  ].sort();

  // Current selection, reused both by the switchers below and by every
  // sidebar nav link so navigating the doc tree doesn't reset it.
  // On a doc page the route itself is authoritative (/{project}/{slug}) —
  // doc links no longer carry ?project= at all, so falling back to the
  // query param first would show the wrong project in the dropdown the
  // moment you land on a real page. Only pages with no [project] route
  // segment (/, /admin, /login) fall back to the query param / default.
  const pathProject = typeof params.project === 'string' ? params.project : undefined;
  const currentProject = pathProject || searchParams.get('project') || 'sanjeev-ai';
  const currentEnv = searchParams.get('env') || 'staging';
  const hasProjectAccess =
    isAdmin ||
    accessibleProjects.includes('*') ||
    accessibleProjects.includes(currentProject);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProject = e.target.value;
    // Navigate home rather than staying on the current path: the current
    // page belongs to the OLD project and there's no guarantee an
    // equivalent slug exists under the new one. Also drop back to staging
    // if the new project has no dev-preview collection to avoid landing
    // on a 404'd Dev view.
    const newEnv = devPreviewProjects.includes(newProject) ? currentEnv : 'staging';
    router.push(`/?project=${newProject}&env=${newEnv}`);
  };

  const handleEnvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEnv = e.target.value;
    router.push(`${pathname}?project=${currentProject}&env=${newEnv}`);
  };

  // The doc slug the current route actually points at (if any) — used both
  // to highlight the active link and to auto-expand its section/group on
  // load, so a refresh doesn't bury the current page back under "User
  // Guides" while everything else collapses.
  const pathSlug = Array.isArray(params.slug) ? params.slug.join('/') : undefined;
  const activeLink = pathSlug
    ? allLinks.find(l => (l.project || 'sanjeev-ai') === pathProject && l.slug === pathSlug)
    : undefined;
  const activeSection = activeLink ? String(activeLink.section || 'Other') : undefined;
  const activeGroup = activeLink ? String(activeLink.category || 'Misc') : undefined;

  // Keep track of collapsed states. By default, 'User Guides' is expanded,
  // others are collapsed — except whichever section/group the current page
  // actually lives in, which is force-expanded on load.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { 'User Guides': false };
    if (activeSection) initial[activeSection] = false;
    return initial;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeGroup) initial[activeGroup] = false;
    return initial;
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: prev[section] === undefined ? false : !prev[section] }));
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }));
  };

  // DP-17: a collapsed sidebar must not hide sign-in. Instead of vanishing
  // (the old w-0 overflow-hidden treatment), it renders as a slim, always-
  // visible top bar: the toggle, current project/env as plain text (no
  // dropdowns — those imply the full sidebar), and a labelled sign-in
  // control or the signed-in user, so there's always a way back in without
  // having to already know an unlabelled hamburger icon does it.
  if (isCollapsed) {
    return (
      <div
        data-testid="docs-sidebar-collapsed"
        className="w-full h-14 flex items-center gap-3 px-3 bg-zinc-950 border-b border-white/10 sticky top-0 z-40"
      >
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="p-1.5 rounded hover:bg-white/10 text-gray-300 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-xs text-gray-400 truncate">
          {currentProject} · {currentEnv === 'dev' ? 'Dev' : 'Staging'}
        </span>
        <div className="ml-auto shrink-0">
          {user ? (
            <span className="text-xs text-gray-400 truncate max-w-[160px] inline-block align-middle">
              {user.email}
            </span>
          ) : (
            <Link
              href="/login"
              data-testid="collapsed-login-link"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Build the 3-level tree
  const tree: Record<string, Record<string, SidebarLink[]>> = Object.create(null);

  const isAuthorizedForProject = isAdmin || accessibleProjects.includes(currentProject) || accessibleProjects.includes('*') || currentProject === 'sanjeev-ai';

  allLinks.forEach(link => {
    if (!isAuthorizedForProject) return;
    if (link.slug === 'index' || link.slug === '') return;

    // Filter by project (defaulting older unmigrated links to sanjeev-ai)
    const linkProject = link.project || 'sanjeev-ai';
    if (linkProject !== currentProject) return;

    // No requiresLogin/isInternal check needed here (DP-10/DP-11): `links`
    // is public-only by construction, and `protectedLinks` only ever
    // contains what Firestore's rules already allowed this user to read.

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
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="ml-auto p-1.5 rounded hover:bg-white/10 text-gray-400 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
            <select
            ref={selectRef}
            data-testid="project-selector"
            className="flex-1 bg-zinc-900 text-white border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            value={currentProject}
            onChange={handleProjectChange}
            >
            {selectableProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
            </select>
            
            <select
            data-testid="env-selector"
            className="w-24 bg-zinc-900 text-white border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            value={currentEnv}
            onChange={handleEnvChange}
            >
            <option value="staging">Staging</option>
            {devPreviewProjects.includes(currentProject) && (
              <option value="dev">Dev</option>
            )}
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
                            {groupLinks.map(link => {
                              const isActive = (link.project || 'sanjeev-ai') === currentProject && link.slug === pathSlug;
                              return (
                                <Link
                                  key={link.slug}
                                  href={`/${link.project || 'sanjeev-ai'}/${link.slug}?env=${currentEnv}`}
                                  aria-current={isActive ? 'page' : undefined}
                                  className={
                                    "px-2 py-1.5 text-sm rounded transition-colors truncate " +
                                    (isActive
                                      ? "bg-emerald-400/15 text-emerald-400 font-medium"
                                      : "text-gray-400 hover:bg-emerald-400/10 hover:text-emerald-400")
                                  }
                                >
                                  {link.title}
                                </Link>
                              );
                            })}
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
          <div className="mt-auto flex flex-col gap-2">
            <p className="text-xs text-gray-500 text-center px-2">
              Sign in to see project documentation.
            </p>
            <Link
              href="/login"
              className="px-3 py-2 rounded border border-gray-700 hover:bg-emerald-400/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-gray-300 text-center"
            >
              Login
            </Link>
          </div>
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
