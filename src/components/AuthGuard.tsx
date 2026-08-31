'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  project: string;
  isInternal?: boolean;
  requiresLogin?: boolean;
}

export function AuthGuard({ children, project, isInternal, requiresLogin }: AuthGuardProps) {
  const { user, isAdmin, accessibleProjects, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const hasProjectAccess =
    isAdmin ||
    accessibleProjects.includes('*') ||
    accessibleProjects.includes(project) ||
    project === 'sanjeev-ai';

  useEffect(() => {
    if (!loading) {
      if (isInternal) {
        if (!user) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        } else if (!hasProjectAccess) {
          router.push('/unauthorized');
        }
      } else if (requiresLogin && !user) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, hasProjectAccess, loading, isInternal, requiresLogin, router, pathname]);

  if (loading && (isInternal || requiresLogin)) {
    return <div>Loading authentication...</div>;
  }

  if (isInternal && (!user || !hasProjectAccess)) {
    return null;
  }

  if (requiresLogin && !user) {
    return null;
  }

  return <>{children}</>;
}
