'use client';

import { useState, useEffect, Suspense } from 'react';
import { Sidebar, type SidebarLink } from './Sidebar';

// Functions can't cross the server/client boundary as props (layout.tsx is a
// Server Component), so this component owns both the collapse state AND the
// Sidebar render — it takes plain, serializable data instead of a render-prop.
export function AppLayoutClient({
  links,
  devPreviewProjects,
  publicProjects,
  children,
}: {
  links: SidebarLink[];
  devPreviewProjects: string[];
  publicProjects: string[];
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    } else {
      // DP-18: no saved preference yet (first visit) — default collapsed
      // under md so the fixed-width sidebar doesn't squeeze main content
      // into an unreadable column on a phone.
      setIsCollapsed(window.matchMedia('(max-width: 767px)').matches);
    }
  }, []);

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  // Collapsed: Sidebar renders its own slim top bar (DP-17), stacked above
  // main at any width. Expanded: side-by-side on md+ as before; under md the
  // sidebar wrapper is `fixed` (see below) so it overlays main instead of
  // squeezing it (DP-18) — direction doesn't matter for a fixed element, but
  // md:flex-row keeps the desktop push layout exactly as it was.
  const direction = isCollapsed ? 'flex-col' : 'flex-col md:flex-row';

  return (
    <div className={`flex ${direction} w-full h-full min-h-0`}>
      {mounted && !isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <div
        className={
          isCollapsed
            ? 'w-full shrink-0'
            : 'w-72 shrink-0 fixed inset-y-0 left-0 z-40 md:static md:inset-auto md:z-auto'
        }
      >
        <Suspense fallback={<aside className="w-72 h-screen bg-zinc-950" />}>
          <Sidebar
            links={links}
            devPreviewProjects={devPreviewProjects}
            publicProjects={publicProjects}
            isCollapsed={isCollapsed}
            onToggle={toggleSidebar}
          />
        </Suspense>
      </div>
      <main className="flex-1 min-h-0 overflow-auto bg-white dark:bg-black relative min-w-0">
        <div className="max-w-4xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
