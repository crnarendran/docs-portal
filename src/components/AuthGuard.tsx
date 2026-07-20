'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  isInternal?: boolean;
  requiresLogin?: boolean;
}

export function AuthGuard({ children, isInternal, requiresLogin }: AuthGuardProps) {
  const { user, isAdmin, accessibleProjects, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentProject = searchParams.get('project') || 'sanjeev-ai';
  const hasProjectAccess =
    isAdmin ||
    accessibleProjects.includes('*') ||
    accessibleProjects.includes(currentProject);

  useEffect(() => {
    if (!loading) {
      if (isInternal) {
        if (!user) {
          router.push('/login');
        } else if (!hasProjectAccess) {
          router.push('/unauthorized');
        }
      } else if (requiresLogin && !user) {
        router.push('/login');
      }
    }
  }, [user, hasProjectAccess, loading, isInternal, requiresLogin, router]);

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
