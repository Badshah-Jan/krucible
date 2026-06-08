export interface Post {
  id: string;
  userName: string;
  userAvatar: string;
  timePosted: string;
  category: 'Emergency' | 'Services' | 'Food' | 'Help' | 'Recommend' | 'Lost & Found' | 'General';
  title: string;
  description: string;
  distance: string;
  likes: number;
  commentsCount: number;
  likedByMe?: boolean;
  coordinates?: { lat: number; lng: number };
  karmaPoints?: number;
}

export interface Chat {
  id: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userName: string;
  userAvatar: string;
  time: string;
  text: string;
}

export const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid-outline', color: '#2563EB' },
  { id: 'emergency', name: 'Emergency', icon: 'alert-circle-outline', color: '#EF4444' },
  { id: 'services', name: 'Services', icon: 'construct-outline', color: '#3B82F6' },
  { id: 'food', name: 'Food', icon: 'fast-food-outline', color: '#F59E0B' },
  { id: 'help', name: 'Help', icon: 'hand-left-outline', color: '#10B981' },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    userName: 'Ahmed Raza',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    timePosted: '2 min ago',
    category: 'Emergency',
    title: 'Need Mechanic',
    description: 'My bike broke down near NIPA Chowrangi. Engine is overheating and won\'t start. Need help immediately!',
    distance: '2.1 km away',
    likes: 12,
    commentsCount: 8,
    likedByMe: false,
    coordinates: { lat: 24.9202, lng: 67.0821 },
    karmaPoints: 2450,
  },
  {
    id: 'post-2',
    userName: 'Fatima Khan',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    timePosted: '15 min ago',
    category: 'Food',
    title: 'Best Biryani in Area?',
    description: 'Looking for best biryani recommendations around Gulshan block 13. Street style preferred!',
    distance: '1.3 km away',
    likes: 7,
    commentsCount: 3,
    likedByMe: true,
    coordinates: { lat: 24.9278, lng: 67.0902 },
    karmaPoints: 1200,
  },
  {
    id: 'post-3',
    userName: 'Usman Khan',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    timePosted: '1 hour ago',
    category: 'Services',
    title: 'AC Technician Needed',
    description: 'Our room AC stopped cooling. If anyone knows a trusted mechanic who can visit today, please share details.',
    distance: '0.8 km away',
    likes: 3,
    commentsCount: 5,
    likedByMe: false,
    coordinates: { lat: 24.9261, lng: 67.0965 },
    karmaPoints: 890,
  },
  {
    id: 'post-4',
    userName: 'Zainab Bibi',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    timePosted: '2 hours ago',
    category: 'Help',
    title: 'Lost Cat - Sphynx',
    description: 'My grey Sphynx cat went missing near Block 4. Answers to the name "Luna". Extremely friendly but easily scared.',
    distance: '3.4 km away',
    likes: 24,
    commentsCount: 12,
    likedByMe: false,
    coordinates: { lat: 24.9189, lng: 67.1012 },
    karmaPoints: 3100,
  },
];

export const MOCK_CHATS: Chat[] = [
  {
    id: 'chat-1',
    userName: 'Mechanic Help Group',
    userAvatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'Bilal: I can help with that tools.',
    time: '2m',
    unreadCount: 3,
    online: true,
  },
  {
    id: 'chat-2',
    userName: 'Gulshan Block 13',
    userAvatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'Sara: Thanks everyone!',
    time: '15m',
    unreadCount: 1,
    online: true,
  },
  {
    id: 'chat-3',
    userName: 'Foodies in Area',
    userAvatar: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'Ali: Any good deals?',
    time: '30m',
    unreadCount: 0,
    online: false,
  },
  {
    id: 'chat-4',
    userName: 'Emergency Alerts',
    userAvatar: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'System: Power outage in your area.',
    time: '1h',
    unreadCount: 0,
    online: false,
  },
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c-1',
    postId: 'post-1',
    userName: 'Bilal Ahmed',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    time: '1 min ago',
    text: 'I\'m nearby NIPA Chowrangi, can come help you with jumper cables if needed.',
  },
  {
    id: 'c-2',
    postId: 'post-1',
    userName: 'Usman Khan',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    time: '2 min ago',
    text: 'I know a good mechanic nearby, calling him to check if he can reach.',
  },
  {
    id: 'c-3',
    postId: 'post-1',
    userName: 'Sara Ali',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    time: '3 min ago',
    text: 'Let me know if you need any tools. I live block 13.',
  },
];
