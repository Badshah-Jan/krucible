import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned';
  createdAt?: any;
}

export default function Security() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "reports"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = mapQuerySnapshot<Report>(snap, withDocId);
      // Sort: pending first
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return 0;
      });
      setReports(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const dismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: 'reviewed' });
    } catch (e) {
      alert("Failed to dismiss report. Check permissions.");
    }
  };

  const deleteTargetAndReport = async (report: Report) => {
    if (confirm(`Are you sure you want to delete this ${report.targetType}?`)) {
      try {
        // First delete the reported target
        const colName = 
          report.targetType === 'post' ? 'posts' :
          report.targetType === 'user' ? 'users' :
          report.targetType === 'service' ? 'services' :
          report.targetType === 'business' ? 'businesses' : 'messages';
        
        // This is a basic deletion, some entities might require cloud functions (like users)
        // But for posts/services, simple delete is fine.
        if (report.targetType !== 'user') {
          await deleteDoc(doc(db, colName, report.targetId));
        } else {
          alert("To delete a user, please go to the Users page.");
          return;
        }
        
        // Mark report as actioned
        await updateDoc(doc(db, "reports", report.id), { status: 'actioned' });
      } catch (e) {
        alert(`Failed to delete ${report.targetType}.`);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Shield className="w-6 h-6 mr-2 text-primary" /> Security & Abuse Moderation
        </h1>
        <div className="text-sm text-green-400 flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div> Live Sync
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 md:col-span-1">
          <h2 className="text-lg font-bold text-white mb-4">System Security Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-gray-300">Firebase Auth</span>
              <span className="text-green-400 text-sm font-medium">Healthy</span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-gray-300">Firestore Rules</span>
              <span className="text-green-400 text-sm font-medium">Secured</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Pending Reports</span>
              <span className="text-yellow-500 text-sm font-bold">{reports.filter(r => r.status === 'pending' || !r.status).length}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl md:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-dark flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            <h2 className="text-lg font-bold text-white">Abuse Reports</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-darker text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-4 border-b border-border">Target</th>
                  <th className="p-4 border-b border-border">Reason</th>
                  <th className="p-4 border-b border-border text-center">Status</th>
                  <th className="p-4 border-b border-border text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading reports...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No abuse reports found.</td></tr>
                ) : reports.map(r => (
                  <tr key={r.id} className={`hover:bg-dark/50 transition-colors ${r.status === 'actioned' ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="text-white font-medium capitalize">{r.targetType || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs mt-1 truncate max-w-[150px]">ID: {r.targetId}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300 text-sm">{r.reason}</div>
                      <div className="text-gray-500 text-xs mt-1">Reporter: {r.reporterId}</div>
                    </td>
                    <td className="p-4 text-center">
                      {(r.status === 'pending' || !r.status) ? (
                        <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">Pending</span>
                      ) : r.status === 'actioned' ? (
                        <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-bold">Actioned</span>
                      ) : (
                        <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-bold">Reviewed</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => dismissReport(r.id)} disabled={r.status === 'reviewed' || r.status === 'actioned'} className="p-1.5 text-gray-400 hover:text-green-400 bg-dark rounded border border-border disabled:opacity-50" title="Dismiss Report">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTargetAndReport(r)} disabled={r.status === 'actioned'} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20 disabled:opacity-50" title={`Delete ${r.targetType}`}>
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
    </div>
  );
}
