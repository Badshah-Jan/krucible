import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCHr8d22J6H8s0hyuvMu6Y5T6yZxxDHb5Y",
  authDomain: "neighborly-b7dd2.firebaseapp.com",
  projectId: "neighborly-b7dd2",
  storageBucket: "neighborly-b7dd2.firebasestorage.app",
  messagingSenderId: "345012250731",
  appId: "1:345012250731:web:ff65fe904abbe6b370692e"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
