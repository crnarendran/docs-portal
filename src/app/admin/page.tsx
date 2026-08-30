'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

const grantPortalAdmin = httpsCallable(functions, 'grantPortalAdmin');

interface PortalUser {
  uid: string;
  email: string;
  isAdmin: boolean;
  accessibleProjects: string[];
}

interface PortalInvite {
  email: string;
  accessibleProjects: string[];
  isAdmin: boolean;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editProjects, setEditProjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const [invites, setInvites] = useState<PortalInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProjects, setInviteProjects] = useState<string[]>([]);
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const [availableProjects, setAvailableProjects] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [usersSnap, docsSnap] = await Promise.all([
        getDocs(collection(db, 'portal_users')),
        getDocs(collection(db, 'portal_docs'))
      ]);

      const fetchedUsers: PortalUser[] = [];
      usersSnap.forEach(doc => {
        const data = doc.data();
        fetchedUsers.push({
          uid: data.uid || doc.id,
          email: data.email || '',
          isAdmin: !!data.isAdmin,
          accessibleProjects: data.accessibleProjects || [],
        });
      });
      setUsers(fetchedUsers);

      const projects = new Set<string>();
      docsSnap.forEach(doc => {
        const data = doc.data();
        if (data.project) projects.add(data.project);
      });
      setAvailableProjects(Array.from(projects).sort());
    } catch (e: any) {
      console.error("[AdminPage] fetchData error:", e);
      setError(e.message);
    } finally {
      setFetching(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'portal_invites'));
      const fetchedInvites: PortalInvite[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedInvites.push({
          email: data.email || doc.id,
          accessibleProjects: data.accessibleProjects || [],
          isAdmin: !!data.isAdmin,
        });
      });
      setInvites(fetchedInvites);
    } catch (e: any) {
      console.error("[AdminPage] fetchInvites error:", e);
      setError(e.message);
    }
  };

  useEffect(() => {
    if (!loading && isAdmin) {
      console.log("[AdminPage] fetching users and projects...");
      fetchData();
      fetchInvites();
    } else if (!loading) {
      console.log("[AdminPage] not fetching, isAdmin:", isAdmin);
      setFetching(false);
    }
  }, [loading, isAdmin]);

  const handleInviteProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setInviteProjects(options);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address to invite.');
      return;
    }
    setInviting(true);
    setError(null);
    try {
      await setDoc(doc(db, 'portal_invites', email), {
        email,
        accessibleProjects: inviteProjects,
        isAdmin: inviteIsAdmin,
        invitedBy: user?.uid || null,
        invitedAt: serverTimestamp(),
      });
      setInviteEmail('');
      setInviteProjects([]);
      setInviteIsAdmin(false);
      await fetchInvites();
    } catch (e: any) {
      console.error("[AdminPage] invite error:", e);
      setError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (email: string) => {
    setRevokingEmail(email);
    setError(null);
    try {
      await deleteDoc(doc(db, 'portal_invites', email));
      await fetchInvites();
    } catch (e: any) {
      console.error("[AdminPage] revoke invite error:", e);
      setError(e.message);
    } finally {
      setRevokingEmail(null);
    }
  };

  if (loading || fetching) {
    console.log("[AdminPage] rendering loading");
    return <div className="p-8 text-white">Loading...</div>;
  }

  if (!isAdmin) {
    console.log("[AdminPage] rendering access denied");
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h1>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  const handleEdit = (u: PortalUser) => {
    setEditingUserId(u.uid);
    setEditProjects(u.accessibleProjects);
  };

  const handleSave = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'portal_users', uid), {
        accessibleProjects: editProjects
      });
      setEditingUserId(null);
      fetchData();
    } catch (e: any) {
      console.error("[AdminPage] save error:", e);
      setError(e.message);
    }
  };

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setEditProjects(options);
  };

  const handleToggleAdmin = async (u: PortalUser) => {
    setTogglingUserId(u.uid);
    setError(null);
    try {
      await grantPortalAdmin({ targetUid: u.uid, isAdmin: !u.isAdmin });
      await fetchData();
    } catch (e: unknown) {
      console.error("[AdminPage] toggle admin error:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="p-8 text-white" data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold mb-6 text-emerald-500">Admin Dashboard</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="bg-zinc-900 rounded p-4 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-3">Invite by Email</h2>
        <p className="text-gray-400 text-sm mb-3">
          Pre-grant access for someone who hasn&apos;t signed in yet. It&apos;s
          applied automatically the first time they sign in with this email,
          then removed from this list.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              data-testid="invite-email-input"
              className="bg-zinc-800 text-white border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 w-64"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Projects</label>
            <select
              multiple
              data-testid="invite-project-select"
              className="bg-zinc-800 text-white border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 h-24 w-48"
              value={inviteProjects}
              onChange={handleInviteProjectSelect}
            >
              {availableProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 pb-1">
            <input
              type="checkbox"
              data-testid="invite-admin-checkbox"
              checked={inviteIsAdmin}
              onChange={(e) => setInviteIsAdmin(e.target.checked)}
            />
            Grant full admin
          </label>
          <button
            data-testid="invite-submit-btn"
            disabled={inviting || !inviteEmail.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
            onClick={handleInvite}
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>

        {invites.length > 0 && (
          <table className="w-full text-left mt-4">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="pb-2 text-sm text-gray-400">Pending invite</th>
                <th className="pb-2 text-sm text-gray-400">Admin</th>
                <th className="pb-2 text-sm text-gray-400">Projects</th>
                <th className="pb-2 text-sm text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.email} data-testid="invite-row" className="border-b border-gray-800 last:border-0">
                  <td className="py-2 text-sm">{inv.email}</td>
                  <td className="py-2 text-sm">{inv.isAdmin ? 'Yes' : 'No'}</td>
                  <td className="py-2 text-sm text-gray-400">{inv.accessibleProjects.join(', ') || 'None'}</td>
                  <td className="py-2">
                    <button
                      data-testid="revoke-invite-btn"
                      disabled={revokingEmail === inv.email}
                      className="bg-zinc-700 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                      onClick={() => handleRevokeInvite(inv.email)}
                    >
                      {revokingEmail === inv.email ? '...' : 'Revoke'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-zinc-900 rounded p-4 border border-gray-800">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-2">Email</th>
              <th className="pb-2">Admin</th>
              <th className="pb-2">Projects</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid} data-testid="user-row" className="border-b border-gray-800 last:border-0">
                <td className="py-3">{u.email}</td>
                <td className="py-3">
                  <button
                    data-testid="toggle-admin-btn"
                    disabled={togglingUserId === u.uid}
                    className={
                      (u.isAdmin
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-zinc-700 hover:bg-zinc-600') +
                      ' text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50'
                    }
                    onClick={() => handleToggleAdmin(u)}
                  >
                    {togglingUserId === u.uid
                      ? '...'
                      : u.isAdmin
                        ? 'Yes'
                        : 'No'}
                  </button>
                </td>
                <td className="py-3">
                  {editingUserId === u.uid ? (
                    <select
                      multiple
                      data-testid="admin-project-select"
                      className="bg-zinc-800 text-white border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 h-24 w-48"
                      value={editProjects}
                      onChange={handleProjectSelect}
                    >
                      {availableProjects.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      {u.accessibleProjects.join(', ') || 'None'}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  {editingUserId === u.uid ? (
                    <button
                      data-testid="save-user-btn"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm transition-colors"
                      onClick={() => handleSave(u.uid)}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      data-testid="edit-user-btn"
                      className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      onClick={() => handleEdit(u)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
