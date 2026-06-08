import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Security() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Shield className="w-6 h-6 mr-2 text-primary" /> Security & Abuse
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center text-yellow-500 mb-4">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold">Pending Reports</h2>
          </div>
          <p className="text-gray-400 mb-4">You have 0 pending user reports to review.</p>
          <div className="text-sm text-gray-500 italic">Reports will appear here when users flag posts or other users in the mobile app.</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
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
              <span className="text-gray-300">Failed Logins (24h)</span>
              <span className="text-white text-sm font-medium">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
