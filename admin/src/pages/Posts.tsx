import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Trash2, EyeOff, Eye, Search } from 'lucide-react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from '../utils/firestore';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  isHidden?: boolean;
  createdAt?: Timestamp;
}

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (confirm("Delete this post? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "posts", id));
      } catch (e) {
        alert("Failed to delete post. Check permissions.");
      }
    }
  };

  const toggleHidePost = async (id: string, currentlyHidden: boolean) => {
    try {
      await updateDoc(doc(db, "posts", id), { isHidden: !currentlyHidden });
    } catch (e) {
      alert("Failed to update post visibility. Check permissions.");
    }
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const lowerQuery = searchQuery.toLowerCase();
    return posts.filter(p => 
      p.title?.toLowerCase().includes(lowerQuery) || 
      p.content?.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery)
    );
  }, [posts, searchQuery]);

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

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search posts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="text-sm text-gray-400 flex space-x-4">
          <span>Total: {posts.length}</span>
          <span>Hidden: {posts.filter(p => p.isHidden).length}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 border-b border-border">Post Details</th>
                <th className="p-4 border-b border-border">Category</th>
                <th className="p-4 border-b border-border text-center">Visibility</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No posts found.</td></tr>
              ) : filteredPosts.map(p => (
                <tr key={p.id} className={`hover:bg-dark/50 transition-colors ${p.isHidden ? 'opacity-60' : ''}`}>
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
                  <td className="p-4 text-center">
                    {p.isHidden ? (
                      <span className="text-yellow-500 text-xs font-bold uppercase flex justify-center items-center">
                        <EyeOff className="w-3 h-3 mr-1" /> Hidden
                      </span>
                    ) : (
                      <span className="text-green-500 text-xs font-bold uppercase flex justify-center items-center">
                        <Eye className="w-3 h-3 mr-1" /> Visible
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => toggleHidePost(p.id, !!p.isHidden)} 
                      className={`p-1.5 rounded border ${p.isHidden ? 'text-green-400 hover:text-green-300 bg-green-500/10 border-green-500/20' : 'text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border-yellow-500/20'}`}
                      title={p.isHidden ? "Unhide Post" : "Hide Post"}
                    >
                      {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deletePost(p.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded border border-red-500/20" title="Delete Post">
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
