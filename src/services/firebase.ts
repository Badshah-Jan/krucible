import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
const getReactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCHr8d22J6H8s0hyuvMu6Y5T6yZxxDHb5Y",
  authDomain: "neighborly-b7dd2.firebaseapp.com",
  projectId: "neighborly-b7dd2",
  storageBucket: "neighborly-b7dd2.firebasestorage.app",
  messagingSenderId: "345012250731",
  appId: "1:345012250731:web:ff65fe904abbe6b370692e"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence
// @ts-ignore - Ignoring TS error for getReactNativePersistence in newer SDKs
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
