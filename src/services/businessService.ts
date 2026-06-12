import { db } from "./firebase";
import { SecurityService } from "./securityService";
import { sanitizeText } from "@/utils/security";
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
  
  // Freemium Monetization fields
  verificationStatus: "none" | "pending" | "approved" | "rejected";
  isVerified: boolean;
  isPremium: boolean;
  subscriptionPlan: 'free' | 'premium';
  featuredUntil: any | null;
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
  async registerBusiness(business: Omit<BusinessProfile, "id" | "isVerified" | "isPremium" | "subscriptionPlan" | "featuredUntil" | "promotionLevel" | "views" | "contactClicks" | "verificationStatus" | "createdAt" | "updatedAt">) {
    await SecurityService.enforceRateLimit("business_register");
    const colRef = collection(db, "businesses");
    const docRef = await addDoc(colRef, {
      ...business,
      businessName: sanitizeText(business.businessName, 120),
      description: sanitizeText(business.description, 2000),
      address: sanitizeText(business.address, 300),
      verificationStatus: "none",
      isVerified: false,
      isPremium: false,
      subscriptionPlan: 'free',
      featuredUntil: null,
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
    
    // Sort locally by Premium Status (Featured), Verification, then Promotion Level
    return businesses.sort((a: any, b: any) => {
      if (a.isPremium !== b.isPremium) {
        return a.isPremium ? -1 : 1;
      }
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
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
