import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface SOSAlert {
  id: string;
  creatorId: string;
  creatorName: string;
  communityId: string;
  status: 'active' | 'responding' | 'resolved' | 'expired';
  createdAt: any;
  location: { lat: number; lng: number };
}

export default function SOSCenter() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for ALL SOS alerts across communities
    // In production, this should be paginated or limited to active status
    const q = query(collection(db, "sos_alerts"));
    const unsub = onSnapshot(q, (snap) => {
      const alertList = snap.docs.map(d => ({ id: d.id, ...d.data() } as SOSAlert));
      // Sort by active first, then newest
      alertList.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      });
      setAlerts(alertList);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const forceResolve = async (id: string) => {
    if (confirm("Force resolve this SOS alert as an admin?")) {
      await updateDoc(doc(db, "sos_alerts", id), { status: 'resolved' });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'responding': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-500 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
          SOS Command Center
        </h1>
        <div className="flex space-x-3">
          <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded font-medium text-sm">
            {alerts.filter(a => a.status === 'active').length} Active
          </span>
          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded font-medium text-sm">
            {alerts.filter(a => a.status === 'responding').length} Responding
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="text-gray-400 p-8 col-span-full text-center">Monitoring frequencies...</div>}
        {!loading && alerts.length === 0 && (
          <div className="text-gray-400 p-8 col-span-full text-center bg-card rounded-xl border border-border">
            No active SOS alerts found.
          </div>
        )}
        
        {alerts.map(alert => (
          <div key={alert.id} className={`bg-card rounded-xl border ${alert.status === 'active' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-border'} p-5 flex flex-col relative overflow-hidden`}>
            {alert.status === 'active' && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">{alert.creatorName || 'Unknown User'}</h3>
                <p className="text-gray-400 text-sm">Community: {alert.communityId || 'Global'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${getStatusColor(alert.status)}`}>
                {alert.status}
              </span>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center text-sm text-gray-300">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                {alert.createdAt ? new Date(alert.createdAt.toMillis()).toLocaleString() : 'Unknown time'}
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                {alert.location?.lat.toFixed(4)}, {alert.location?.lng.toFixed(4)}
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-auto flex space-x-2">
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${alert.location?.lat},${alert.location?.lng}`, '_blank')}
                className="flex-1 bg-dark hover:bg-gray-800 text-white py-2 rounded border border-border text-sm font-medium transition flex items-center justify-center"
              >
                <MapPin className="w-4 h-4 mr-1.5" /> Map
              </button>
              {(alert.status === 'active' || alert.status === 'responding') && (
                <button 
                  onClick={() => forceResolve(alert.id)}
                  className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 py-2 rounded border border-green-500/20 text-sm font-medium transition flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
