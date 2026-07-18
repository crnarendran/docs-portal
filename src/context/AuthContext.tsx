'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSupport: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSupport: false,
  login: async () => {},
  logout: async () => {},
});

const checkSupportClaim = async (
  user: User,
  retries = 5,
  delay = 1000
): Promise<boolean> => {
  let currentDelay = delay;
  for (let i = 0; i < retries; i++) {
    const tokenResult = await user.getIdTokenResult(true);
    if (tokenResult.claims.support) {
      return true;
    }
    await new Promise((r) => setTimeout(r, currentDelay));
    currentDelay *= 1.5; // backoff
  }
  return false;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupport, setIsSupport] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        try {
          // Poll for the custom claim that is set asynchronously by the Cloud Function
          const hasSupport = await checkSupportClaim(user);
          setIsSupport(hasSupport);
        } catch (e) {
          console.error("Error getting token claims", e);
          setIsSupport(false);
        }
      } else {
        setIsSupport(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSupport, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
