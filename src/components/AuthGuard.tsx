'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  isInternal?: boolean;
  requiresLogin?: boolean;
}

export function AuthGuard({ children, isInternal, requiresLogin }: AuthGuardProps) {
  const { user, isSupport, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isInternal) {
        if (!user) {
          router.push('/login');
        } else if (!isSupport) {
          router.push('/unauthorized');
        }
      } else if (requiresLogin && !user) {
        router.push('/login');
      }
    }
  }, [user, isSupport, loading, isInternal, requiresLogin, router]);

  if (loading && (isInternal || requiresLogin)) {
    return <div>Loading authentication...</div>;
  }

  if (isInternal && (!user || !isSupport)) {
    return null;
  }

  if (requiresLogin && !user) {
    return null;
  }

  return <>{children}</>;
}
