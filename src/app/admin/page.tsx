'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PortalUser {
  uid: string;
  email: string;
  isAdmin: boolean;
  accessibleProjects: string[];
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editProjects, setEditProjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availableProjects = ['project-A', 'project-B', 'project-C', 'project-D', 'sanjeev-ai'];

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'portal_users'));
      const fetchedUsers: PortalUser[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedUsers.push({
          uid: data.uid || doc.id,
          email: data.email || '',
          isAdmin: !!data.isAdmin,
          accessibleProjects: data.accessibleProjects || [],
        });
      });
      setUsers(fetchedUsers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchUsers();
    } else if (!loading) {
      setFetching(false);
    }
  }, [loading, isAdmin]);

  if (loading || fetching) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  if (!isAdmin) {
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
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setEditProjects(options);
  };

  return (
    <div className="p-8 text-white" data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold mb-6 text-emerald-500">Admin Dashboard</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
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
                <td className="py-3">{u.isAdmin ? 'Yes' : 'No'}</td>
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
