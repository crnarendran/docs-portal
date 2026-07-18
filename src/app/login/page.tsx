'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, user, isSupport, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && isSupport) {
        router.push('/');
      } else if (user && !isSupport) {
        // Logged in but not support
        // Maybe redirect somewhere else or just stay and show error
      }
    }
  }, [user, isSupport, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div 
        data-testid="login-container" 
        className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Support Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Google account to access internal documentation
          </p>
        </div>
        
        {loading ? (
          <div className="bg-blue-50 text-blue-600 p-3 rounded-md text-sm text-center flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            Checking access permissions...
          </div>
        ) : user && !isSupport ? (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
            You do not have the required access level (support) to view internal documentation.
          </div>
        ) : null}

        <button 
          onClick={login}
          data-testid="login-button"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    </div>
  );
}
