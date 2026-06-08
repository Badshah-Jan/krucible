import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, CheckCircle, Star, Trash2 } from 'lucide-react';

interface Business {
  id: string;
  businessName: string;
  category: string;
  verified: boolean;
  featured: boolean;
  address?: string;
  views?: number;
  contactClicks?: number;
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "businesses"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
      setBusinesses(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleVerification = async (id: string, current: boolean) => {
    if (confirm(`Are you sure you want to ${current ? 'remove verification from' : 'verify'} this business?`)) {
      await updateDoc(doc(db, "businesses", id), { verified: !current });
    }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "businesses", id), { featured: !current });
  };

  const deleteBusiness = async (id: string) => {
    if (confirm("Delete this business completely?")) {
      await deleteDoc(doc(db, "businesses", id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Store className="w-6 h-6 mr-2 text-primary" /> Local Businesses
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
                <th className="p-4 border-b border-border">Business Name</th>
                <th className="p-4 border-b border-border">Category</th>
                <th className="p-4 border-b border-border">Analytics</th>
                <th className="p-4 border-b border-border text-center">Verified</th>
                <th className="p-4 border-b border-border text-center">Featured</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading businesses...</td></tr>
              ) : businesses.map(b => (
                <tr key={b.id} className="hover:bg-dark/50 transition-colors">
                  <td className="p-4 text-white font-medium">
                    {b.businessName}
                    <div className="text-xs text-gray-500 font-normal mt-0.5">{b.address || 'No address provided'}</div>
                  </td>
                  <td className="p-4 text-gray-300">{b.category}</td>
                  <td className="p-4 text-sm text-gray-400">
                    <div>Views: <span className="text-white">{b.views || 0}</span></div>
                    <div>Clicks: <span className="text-white">{b.contactClicks || 0}</span></div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleVerification(b.id, !!b.verified)} className={`px-3 py-1 rounded-full text-xs font-bold border ${b.verified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-600'}`}>
                      {b.verified ? 'Verified' : 'Unverified'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleFeatured(b.id, !!b.featured)} className={`p-1.5 rounded-full border ${b.featured ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white'}`}>
                      <Star className={`w-4 h-4 ${b.featured ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteBusiness(b.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20">
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
