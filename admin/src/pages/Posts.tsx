import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  createdAt?: Timestamp;
}

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: requires composite index for orderBy if not just listening to collection
    const q = query(collection(db, "posts"));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = mapQuerySnapshot<Post>(snap, withDocId);
      list.sort((a: Post, b: Post) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setPosts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const deletePost = async (id: string) => {
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <MessageSquare className="w-6 h-6 mr-2 text-primary" /> Post Moderation
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
                <th className="p-4 border-b border-border">Post Details</th>
                <th className="p-4 border-b border-border">Category</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : posts.map(p => (
                <tr key={p.id} className="hover:bg-dark/50 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-medium">{p.title}</div>
                    <div className="text-gray-400 text-sm mt-1 max-w-lg truncate">{p.content}</div>
                    <div className="text-gray-500 text-xs mt-1">Author ID: {p.userId}</div>
                  </td>
                  <td className="p-4 text-gray-300">
                    <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded text-xs">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deletePost(p.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20">
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
