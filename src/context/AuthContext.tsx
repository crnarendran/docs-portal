'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  accessibleProjects: string[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  accessibleProjects: [],
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessibleProjects, setAccessibleProjects] = useState<string[]>([]);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      setLoading(true);
      setUser(user);

      if (!user) {
        console.log(`[AUTH] User is null`);
        setIsAdmin(false);
        setAccessibleProjects([]);
        setLoading(false);
        return;
      }

      // A live listener (rather than a one-shot getDoc) so that if this is
      // the user's first-ever sign-in, the UI self-corrects once the
      // async createPortalUserDocument trigger writes the document,
      // instead of permanently reading "not admin" until a page refresh.
      console.log(`[AUTH] subscribing to portal_users doc for: ${user.uid}`);
      const docRef = doc(db, 'portal_users', user.uid);
      unsubscribeDoc = onSnapshot(
        docRef,
        (docSnap) => {
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
          setLoading(false);
        },
        (e) => {
          console.error("[AUTH] Error getting user metadata", e.message || e);
          setIsAdmin(false);
          setAccessibleProjects([]);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, accessibleProjects, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
