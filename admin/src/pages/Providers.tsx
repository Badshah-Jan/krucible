import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, Star, Trash2 } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface Provider {
  id: string;
  name: string;
  category: string;
  verified: boolean;
  featured: boolean;
  rating?: number;
  views?: number;
  contactClicks?: number;
}

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = mapQuerySnapshot<Provider>(snap, withDocId);
      setProviders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleVerification = async (id: string, current: boolean) => {
    if (confirm(`Are you sure you want to ${current ? 'remove verification from' : 'verify'} this provider?`)) {
      await updateDoc(doc(db, "services", id), { verified: !current });
    }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "services", id), { featured: !current });
  };

  const deleteProvider = async (id: string) => {
    if (confirm("Delete this provider completely?")) {
      await deleteDoc(doc(db, "services", id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Briefcase className="w-6 h-6 mr-2 text-primary" /> Service Providers
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
                <th className="p-4 border-b border-border">Provider Name</th>
                <th className="p-4 border-b border-border">Category</th>
                <th className="p-4 border-b border-border">Analytics</th>
                <th className="p-4 border-b border-border text-center">Verified</th>
                <th className="p-4 border-b border-border text-center">Featured</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading providers...</td></tr>
              ) : providers.map(p => (
                <tr key={p.id} className="hover:bg-dark/50 transition-colors">
                  <td className="p-4 text-white font-medium">{p.name}</td>
                  <td className="p-4 text-gray-300">{p.category}</td>
                  <td className="p-4 text-sm text-gray-400">
                    <div>Views: <span className="text-white">{p.views || 0}</span></div>
                    <div>Clicks: <span className="text-white">{p.contactClicks || 0}</span></div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleVerification(p.id, !!p.verified)} className={`px-3 py-1 rounded-full text-xs font-bold border ${p.verified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-600'}`}>
                      {p.verified ? 'Verified' : 'Unverified'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleFeatured(p.id, !!p.featured)} className={`p-1.5 rounded-full border ${p.featured ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white'}`}>
                      <Star className={`w-4 h-4 ${p.featured ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteProvider(p.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20">
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
