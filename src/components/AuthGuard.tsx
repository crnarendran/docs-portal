'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
  const search = useSearchParams().toString();

  const hasProjectAccess =
    isAdmin ||
    accessibleProjects.includes('*') ||
    accessibleProjects.includes(project) ||
    project === 'sanjeev-ai';

  useEffect(() => {
    // DP-20: the whole link — path, query and hash — so ?env=dev&story=<ID>
    // survives the sign-in round trip. The hash is only readable client-side.
    const loginNext = () => pathname + (search ? `?${search}` : '') + window.location.hash;

    if (!loading) {
      if (isInternal) {
        if (!user) {
          router.push(`/login?next=${encodeURIComponent(loginNext())}`);
        } else if (!hasProjectAccess) {
          router.push('/unauthorized');
        }
      } else if (requiresLogin && !user) {
        router.push(`/login?next=${encodeURIComponent(loginNext())}`);
      }
    }
  }, [user, hasProjectAccess, loading, isInternal, requiresLogin, router, pathname, search]);

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
