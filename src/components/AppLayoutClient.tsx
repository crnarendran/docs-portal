'use client';

import { useState, useEffect } from 'react';

export function AppLayoutClient({ sidebar, children }: { sidebar: React.ReactNode, children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) setIsCollapsed(stored === 'true');
  }, []);

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <>
      <div 
        className={`transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'w-0 overflow-hidden' : 'w-72'
        }`}
      >
        {sidebar}
      </div>
      <main className="flex-1 overflow-auto bg-white dark:bg-black p-8 pt-16 relative min-w-0">
        {mounted && (
          <button 
            onClick={toggleSidebar}
            className={`fixed top-4 z-50 p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all ${
              isCollapsed ? 'left-4' : 'left-72 ml-4'
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
