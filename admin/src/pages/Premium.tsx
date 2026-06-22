import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface PremiumRequest {
  id: string;
  userId: string;
  entityType: 'business' | 'service';
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}

export default function Premium() {
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "subscription_requests"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = mapQuerySnapshot<PremiumRequest>(snap, withDocId);
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return 0;
      });
      setRequests(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDecision = async (requestId: string, approved: boolean) => {
    if (!confirm(`Are you sure you want to ${approved ? 'approve' : 'reject'} this premium request?`)) return;
    
    try {
      const fn = httpsCallable(functions, 'approvePremiumSubscription');
      await fn({ requestId, approved });
      alert(`Request ${approved ? 'approved' : 'rejected'} successfully.`);
    } catch (e: any) {
      console.error(e);
      alert("Failed to process request: " + (e.message || 'Check permissions'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Star className="w-6 h-6 mr-2 text-primary" /> Premium Requests
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
                <th className="p-4 border-b border-border">Type</th>
                <th className="p-4 border-b border-border">Entity ID</th>
                <th className="p-4 border-b border-border">Requested By</th>
                <th className="p-4 border-b border-border text-center">Status</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No premium requests found.</td></tr>
              ) : requests.map(req => (
                <tr key={req.id} className={`hover:bg-dark/50 transition-colors ${req.status !== 'pending' ? 'opacity-50' : ''}`}>
                  <td className="p-4">
                    <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded text-xs uppercase font-bold">
                      {req.entityType}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 font-mono text-xs">{req.entityId}</td>
                  <td className="p-4 text-gray-300 font-mono text-xs">{req.userId}</td>
                  <td className="p-4 text-center">
                    {req.status === 'pending' ? (
                      <span className="text-yellow-500 text-xs font-bold uppercase">Pending</span>
                    ) : req.status === 'approved' ? (
                      <span className="text-green-500 text-xs font-bold uppercase">Approved</span>
                    ) : (
                      <span className="text-red-500 text-xs font-bold uppercase">Rejected</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleDecision(req.id, true)} 
                      disabled={req.status !== 'pending'}
                      className="p-1.5 text-green-400 hover:text-green-300 bg-green-500/10 rounded border border-green-500/20 disabled:opacity-50" 
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDecision(req.id, false)} 
                      disabled={req.status !== 'pending'}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20 disabled:opacity-50" 
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
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
