import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, Trash2, Users } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  createdAt?: any;
}

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "communities"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = mapQuerySnapshot<Community>(snap, withDocId);
      setCommunities(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const deleteCommunity = async (id: string) => {
    if (confirm("DANGER: Are you sure you want to delete this community?")) {
      await deleteDoc(doc(db, "communities", id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Store className="w-6 h-6 mr-2 text-primary" /> Communities
        </h1>
        <div className="text-sm text-green-400 flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div> Live Sync
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 border-b border-border">Community Name</th>
                <th className="p-4 border-b border-border">Description</th>
                <th className="p-4 border-b border-border">Members</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : communities.map(c => (
                <tr key={c.id} className="hover:bg-dark/50 transition-colors">
                  <td className="p-4 text-white font-medium">{c.name}</td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{c.description}</td>
                  <td className="p-4 text-gray-300 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                    {c.memberCount || 0}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteCommunity(c.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20">
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
