'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  isInternal: boolean;
}

export function AuthGuard({ children, isInternal }: AuthGuardProps) {
  const { user, isSupport, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isInternal) {
      if (!user) {
        router.push('/login');
      } else if (!isSupport) {
        router.push('/unauthorized');
      }
    }
  }, [user, isSupport, loading, isInternal, router]);

  if (isInternal) {
    if (loading) {
      return <div>Loading authentication...</div>;
    }
    if (!user || !isSupport) {
      return null;
    }
  }

  return <>{children}</>;
}
