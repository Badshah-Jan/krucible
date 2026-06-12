import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ban, Trash2, CheckCircle, Users as UsersIcon } from 'lucide-react';
import type { QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: any;
  isBanned?: boolean;
  role?: string;
  communityId?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const userList = mapQuerySnapshot<User>(snap, withDocId);
      setUsers(userList);
      setLoading(false);
    }, (error: FirestoreError) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    if (confirm(`Are you sure you want to ${currentStatus ? 'unban' : 'ban'} this user?`)) {
      try {
        await updateDoc(doc(db, "users", userId), { isBanned: !currentStatus });
      } catch (e) {
        alert("Failed to update user status. Check permissions.");
      }
    }
  };

  const deleteUserRecord = async (userId: string) => {
    if (confirm("Are you sure you want to completely delete this user record? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "users", userId));
      } catch (e) {
        alert("Failed to delete user. Check permissions.");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center"><UsersIcon className="w-6 h-6 mr-2 text-primary" /> User Management</h1>
        <div className="text-sm text-green-400 flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div> Live Sync
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 border-b border-border font-medium">Name</th>
                <th className="p-4 border-b border-border font-medium">Email</th>
                <th className="p-4 border-b border-border font-medium">Community ID</th>
                <th className="p-4 border-b border-border font-medium">Role</th>
                <th className="p-4 border-b border-border font-medium">Status</th>
                <th className="p-4 border-b border-border font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-dark/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-xs">
                      {u.name?.charAt(0) || '?'}
                    </div>
                    {u.name || 'Unknown User'}
                  </td>
                  <td className="p-4 text-gray-300">{u.email}</td>
                  <td className="p-4 text-gray-400 text-sm">{u.communityId || 'None'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                      {u.role || 'User'}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.isBanned ? (
                      <span className="flex items-center text-red-400 text-sm font-medium"><Ban className="w-4 h-4 mr-1" /> Banned</span>
                    ) : (
                      <span className="flex items-center text-green-400 text-sm font-medium"><CheckCircle className="w-4 h-4 mr-1" /> Active</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => toggleBan(u.id, !!u.isBanned)} className="p-1.5 text-gray-400 hover:text-white bg-dark rounded border border-border" title={u.isBanned ? "Unban" : "Ban"}>
                      <Ban className={`w-4 h-4 ${u.isBanned ? 'text-green-400' : ''}`} />
                    </button>
                    <button onClick={() => deleteUserRecord(u.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
