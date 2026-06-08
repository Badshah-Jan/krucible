import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";

export interface BusinessProfile {
  id?: string;
  userId: string; // The owner
  communityId: string;
  businessName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  
  // Monetization fields
  verified: boolean;
  featured: boolean;
  featuredUntil?: any;
  promotionLevel: number; // For future tier sorting
  views: number;
  contactClicks: number;
  
  location: {
    lat: number;
    lng: number;
  };

  createdAt?: any;
  updatedAt?: any;
}

export const BUSINESS_CATEGORIES = [
  "Restaurant",
  "Pharmacy",
  "Clinic",
  "Bakery",
  "Gym",
  "Grocery Store",
  "Salon",
  "Electronics Shop",
  "Other"
];

class BusinessService {
  async registerBusiness(business: Omit<BusinessProfile, "id" | "verified" | "featured" | "promotionLevel" | "views" | "contactClicks" | "createdAt" | "updatedAt">) {
    const colRef = collection(db, "businesses");
    const docRef = await addDoc(colRef, {
      ...business,
      verified: false,
      featured: false,
      promotionLevel: 0,
      views: 0,
      contactClicks: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async getBusinessById(id: string): Promise<BusinessProfile | null> {
    const docRef = doc(db, "businesses", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as BusinessProfile;
  }

  async getBusinessesByCommunity(communityId: string, category?: string): Promise<BusinessProfile[]> {
    let q = query(collection(db, "businesses"), where("communityId", "==", communityId));
    if (category && category !== "All") {
      q = query(collection(db, "businesses"), where("communityId", "==", communityId), where("category", "==", category));
    }
    const snapshot = await getDocs(q);
    const businesses = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as BusinessProfile));
    
    // Sort locally by featured and promotionLevel
    return businesses.sort((a: any, b: any) => {
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      return (b.promotionLevel || 0) - (a.promotionLevel || 0);
    });
  }

  // Analytics Tracking Methods
  async trackBusinessView(id: string) {
    try {
      const docRef = doc(db, "businesses", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentViews = snapshot.data().views || 0;
        await updateDoc(docRef, { views: currentViews + 1 });
      }
    } catch (error) {
      console.warn("Analytics error tracking business view:", error);
    }
  }

  async trackContactClick(id: string) {
    try {
      const docRef = doc(db, "businesses", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentClicks = snapshot.data().contactClicks || 0;
        await updateDoc(docRef, { contactClicks: currentClicks + 1 });
      }
    } catch (error) {
      console.warn("Analytics error tracking contact click:", error);
    }
  }
}

export default new BusinessService();
