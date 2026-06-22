import React, { useState } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Send } from 'lucide-react';

export default function Notifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [communityId, setCommunityId] = useState('');
  const [loading, setLoading] = useState(false);

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return alert("Title and Body are required.");
    if (target === 'community' && !communityId) return alert("Community ID is required for community alerts.");
    
    setLoading(true);
    try {
      let usersQuery;
      if (target === 'all') {
        usersQuery = query(collection(db, "users"));
      } else {
        usersQuery = query(collection(db, "users"), where("communityId", "==", communityId));
      }

      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        alert("No users found for this target.");
        setLoading(false);
        return;
      }

      const promises = usersSnap.docs.map(doc => {
        return addDoc(collection(db, "notifications"), {
          userId: doc.id,
          title: title,
          body: body,
          type: "system",
          read: false,
          data: {
            senderId: "system_admin" // System notifications can be customized
          },
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      alert(`Successfully sent to ${promises.length} users.`);
      setTitle('');
      setBody('');
    } catch (error: any) {
      console.error(error);
      alert("Failed to send notification: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Bell className="w-6 h-6 mr-2 text-primary" /> Notification Management
        </h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Broadcast New Alert</h2>
        
        <form onSubmit={sendNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
            <select 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-dark border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            >
              <option value="all">Global Broadcast (All Users)</option>
              <option value="community">Specific Community</option>
            </select>
          </div>

          {target === 'community' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Community ID</label>
              <input 
                type="text" 
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                placeholder="Enter exact Community ID..."
                className="w-full bg-dark border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Alert Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="E.g., System Maintenance Upcoming"
              className="w-full bg-dark border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Alert Body</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Enter the main message details here..."
              className="w-full bg-dark border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? 'Broadcasting...' : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Alert Now
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
