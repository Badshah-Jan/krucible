import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
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
            <h3 className="text-red-400 font-bold mb-1">Purge Inactive Communities</h3>
            <p className="text-sm text-red-400/80 mb-3">This will permanently delete any community with 0 members. This cannot be undone.</p>
            <button className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 transition">
              Run Purge
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex justify-end">
          <button className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium flex items-center transition">
            <Save className="w-4 h-4 mr-2" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
