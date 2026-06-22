import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, AlertTriangle } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Settings() {
  const [purging, setPurging] = useState(false);

  const purgeInactiveCommunities = async () => {
    if (!confirm("Are you absolutely sure you want to permanently delete all communities with 0 members? This action cannot be undone.")) return;
    
    setPurging(true);
    try {
      // Find communities with memberCount == 0 or no memberCount field
      const commsRef = collection(db, "communities");
      const snap = await getDocs(commsRef);
      let deletedCount = 0;
      
      const promises = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (!data.memberCount || data.memberCount === 0) {
          promises.push(deleteDoc(doc(db, "communities", docSnap.id)));
          deletedCount++;
        }
      }
      
      await Promise.all(promises);
      alert(`Successfully purged ${deletedCount} inactive communities.`);
    } catch (error: any) {
      console.error(error);
      alert("Failed to purge communities: " + error.message);
    }
    setPurging(false);
  };

  const savePreferences = () => {
    alert("Preferences saved locally. Note: Backend settings API is not yet implemented.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <SettingsIcon className="w-6 h-6 mr-2 text-primary" /> Admin Settings
        </h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Platform Notifications</h2>
          <p className="text-sm text-gray-400 mb-4">Manage how the admin panel alerts you of events.</p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 text-gray-300">
              <input type="checkbox" defaultChecked className="form-checkbox text-primary rounded bg-dark border-border" />
              <span>Play sound on new SOS Alert</span>
            </label>
            <label className="flex items-center space-x-3 text-gray-300">
              <input type="checkbox" defaultChecked className="form-checkbox text-primary rounded bg-dark border-border" />
              <span>Email me when a Provider requests Verification</span>
            </label>
            <label className="flex items-center space-x-3 text-gray-300">
              <input type="checkbox" className="form-checkbox text-primary rounded bg-dark border-border" />
              <span>Email me daily analytics summaries</span>
            </label>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-bold text-white mb-2">Danger Zone</h2>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h3 className="text-red-400 font-bold mb-1 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> Purge Inactive Communities
            </h3>
            <p className="text-sm text-red-400/80 mb-3">This will permanently delete any community with 0 members. This cannot be undone.</p>
            <button 
              onClick={purgeInactiveCommunities}
              disabled={purging}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
            >
              {purging ? 'Purging...' : 'Run Purge'}
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex justify-end">
          <button onClick={savePreferences} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium flex items-center transition">
            <Save className="w-4 h-4 mr-2" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
