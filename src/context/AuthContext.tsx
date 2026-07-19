'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSupport: boolean;
  isAdmin: boolean;
  accessibleProjects: string[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSupport: false,
  isAdmin: false,
  accessibleProjects: [],
  login: async () => {},
  logout: async () => {},
});

const checkSupportClaim = async (
  user: User,
  retries = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' ? 1 : 5,
  delay = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' ? 100 : 1000
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessibleProjects, setAccessibleProjects] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        try {
          // Poll for the custom claim that is set asynchronously by the Cloud Function
          const hasSupport = await checkSupportClaim(user);
          setIsSupport(hasSupport);

          console.log(`[AUTH] checking doc for user: ${user.uid}`);
          const docRef = doc(db, 'portal_users', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`[AUTH] docSnap exists. data:`, data);
            setIsAdmin(!!data.isAdmin);
            setAccessibleProjects(data.accessibleProjects || []);
          } else {
            console.log(`[AUTH] docSnap DOES NOT EXIST for ${user.uid}`);
            setIsAdmin(false);
            setAccessibleProjects([]);
          }
        } catch (e: any) {
          console.error("[AUTH] Error getting user metadata", e.message || e);
          setIsSupport(false);
          setIsAdmin(false);
          setAccessibleProjects([]);
        }
      } else {
        console.log(`[AUTH] User is null`);
        setIsSupport(false);
        setIsAdmin(false);
        setAccessibleProjects([]);
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
    <AuthContext.Provider value={{ user, loading, isSupport, isAdmin, accessibleProjects, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
