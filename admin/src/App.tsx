import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users as UsersIcon, MessageSquare, AlertTriangle, Briefcase, Store, Shield, Settings as SettingsIcon, LogOut, Search, Bell, Star } from 'lucide-react';
import Users from './pages/Users';
import SOSCenter from './pages/SOS';
import Providers from './pages/Providers';
import Businesses from './pages/Businesses';
import Communities from './pages/Communities';
import Posts from './pages/Posts';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Premium from './pages/Premium';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { mapQuerySnapshot, withDocId } from './utils/firestore';

interface PendingProviderAction {
  id: string;
  name?: string;
  verified?: boolean;
}

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Users', path: '/users', icon: UsersIcon },
    { name: 'Communities', path: '/communities', icon: Store },
    { name: 'Posts & Moderation', path: '/posts', icon: MessageSquare },
    { name: 'SOS Command Center', path: '/sos', icon: AlertTriangle, color: 'text-red-500' },
    { name: 'Service Providers', path: '/providers', icon: Briefcase },
    { name: 'Local Businesses', path: '/businesses', icon: Store },
    { name: 'Premium Requests', path: '/premium', icon: Star, color: 'text-yellow-500' },
    { name: 'Security & Abuse', path: '/security', icon: Shield },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-dark border-r border-border h-screen flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className="font-bold text-xl text-white tracking-tight">Neighborly<span className="text-primary text-xs ml-1 align-top border border-primary px-1 rounded">ADMIN</span></span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Main Menu</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-400 hover:bg-card hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${item.color || (isActive ? 'text-primary' : '')}`} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border">
        <button className="flex items-center w-full px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="h-16 bg-dark border-b border-border flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center flex-1">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users, communities, or posts..." 
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </Link>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 border-2 border-dark cursor-pointer"></div>
      </div>
    </header>
  );
}

function Dashboard() {
  const [userCount, setUserCount] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [verifiedProviderCount, setVerifiedProviderCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [businessCount, setBusinessCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingProviderAction[]>([]);
  const [chartData, setChartData] = useState<{name: string, users: number}[]>([]);

  React.useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap: QuerySnapshot<DocumentData>) => {
      setUserCount(snap.size);
      
      // Compute last 7 days user registrations
      const days: Record<string, number> = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
      }

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const date = new Date(data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt);
          // Check if within last 7 days
          if ((today.getTime() - date.getTime()) / (1000 * 3600 * 24) <= 7) {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            if (days[dayName] !== undefined) {
              days[dayName]++;
            }
          }
        }
      });
      
      const newChartData = Object.keys(days).map(name => ({ name, users: days[name] }));
      setChartData(newChartData);
    });

    const unsubSos = onSnapshot(query(collection(db, "sos_alerts"), where("status", "==", "active")), (snap: QuerySnapshot<DocumentData>) => setSosCount(snap.size));
    const unsubComm = onSnapshot(collection(db, "communities"), (snap: QuerySnapshot<DocumentData>) => setCommunityCount(snap.size));
    const unsubProv = onSnapshot(query(collection(db, "services"), where("verified", "==", true)), (snap: QuerySnapshot<DocumentData>) => setVerifiedProviderCount(snap.size));
    const unsubPosts = onSnapshot(collection(db, "posts"), (snap: QuerySnapshot<DocumentData>) => setPostCount(snap.size));
    const unsubBusinesses = onSnapshot(collection(db, "businesses"), (snap: QuerySnapshot<DocumentData>) => setBusinessCount(snap.size));
    
    // Action Center listener
    const unsubPending = onSnapshot(query(collection(db, "services"), where("verified", "==", false)), (snap: QuerySnapshot<DocumentData>) => {
      const pending = mapQuerySnapshot<PendingProviderAction>(snap, withDocId);
      setPendingActions(pending.slice(0, 5)); // show top 5
    });

    return () => {
      unsubUsers();
      unsubSos();
      unsubComm();
      unsubProv();
      unsubPosts();
      unsubBusinesses();
      unsubPending();
    }
  }, []);

  const stats = [
    { title: "Total Users", value: userCount.toString(), trend: "Real-time", isUp: true },
    { title: "Active SOS Alerts", value: sosCount.toString(), trend: "Live", isUp: false },
    { title: "Total Posts", value: postCount.toString(), trend: "Live", isUp: true },
    { title: "Total Businesses", value: businessCount.toString(), trend: "Live", isUp: true },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-green-400 flex items-center"><div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div> System Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">{stat.title}</h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className={`text-sm font-medium ${stat.isUp ? 'text-green-400' : 'text-red-400'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">New Users (Last 7 Days)</h3>
          <div className="flex-1 rounded-lg flex items-center justify-center -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#374151', opacity: 0.4}} contentStyle={{backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff'}} />
                <Bar dataKey="users" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-96">
          <h3 className="text-lg font-bold text-white mb-4">Action Center</h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {pendingActions.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-10">No pending actions!</div>
            ) : pendingActions.map((action) => (
              <div key={action.id} className="p-3 bg-dark rounded-lg border border-border flex items-center justify-between">
                <div className="flex-1 truncate pr-2">
                  <p className="text-sm font-medium text-white truncate">Pending Verification</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{action.name} requested verified status.</p>
                </div>
                <Link to="/providers" className="text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded transition-colors whitespace-nowrap">Review</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      alert("Login failed. Ensure Google Auth is enabled in Firebase Console.");
    }
  };

  if (authChecking) {
    return <div className="min-h-screen bg-darker flex items-center justify-center text-white">Loading Security Policies...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-darker flex flex-col items-center justify-center">
        <div className="bg-card p-8 rounded-xl border border-border shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-gray-400 mb-8">Authenticate securely to access the Super Admin Dashboard and real-time database.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Shield className="w-5 h-5 mr-2" />
            Authenticate via Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-darker flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/sos" element={<SOSCenter />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/businesses" element={<Businesses />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/posts" element={<Posts />} />
              <Route path="/security" element={<Security />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-full">
                  <h2 className="text-xl font-bold text-gray-400">Module under construction</h2>
                  <p className="text-gray-500 mt-2">Check the implementation report for details.</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
