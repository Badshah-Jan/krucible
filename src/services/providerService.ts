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
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore";

export interface ServiceProvider {
  id?: string;
  userId: string;
  name: string;
  category: string;
  about: string;
  phone: string;
  isAvailable: boolean;
  availabilityStatus?: 'available_now' | 'available_later' | 'offline';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  communityId: string;
  rating: number;
  reviewCount: number;
  
  // Freemium Monetization & Admin Fields
  verificationStatus: "none" | "pending" | "approved" | "rejected";
  isVerified: boolean;

  createdAt?: any;
  updatedAt?: any;
}

export interface ServiceReview {
  id?: string;
  serviceId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt?: any;
}

export const CATEGORIES = [
  "Plumber",
  "Electrician",
  "Carpenter",
  "Mechanic",
  "Tutor",
  "Cleaner",
  "Painter",
  "AC Technician",
  "Driver",
  "Photographer",
  "Other",
];

class ProviderService {
  async registerProvider(provider: Omit<ServiceProvider, "id" | "rating" | "reviewCount" | "createdAt" | "updatedAt" | "isVerified" | "verificationStatus" | "availabilityStatus">) {
    await SecurityService.enforceRateLimit("service_register");
    const colRef = collection(db, "services");
    const docRef = await addDoc(colRef, {
      ...provider,
      name: sanitizeText(provider.name, 120),
      about: sanitizeText(provider.about, 2000),
      rating: 0,
      reviewCount: 0,
      verificationStatus: "none",
      isVerified: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async updateProviderStatus(id: string, isAvailable: boolean, availabilityStatus?: 'available_now' | 'available_later' | 'offline') {
    const docRef = doc(db, "services", id);
    const updates: any = { isAvailable, updatedAt: serverTimestamp() };
    if (availabilityStatus) updates.availabilityStatus = availabilityStatus;
    await updateDoc(docRef, updates);
  }

  async getProviderById(id: string): Promise<ServiceProvider | null> {
    const docRef = doc(db, "services", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as ServiceProvider;
  }

  async getProviderByUserId(userId: string): Promise<ServiceProvider | null> {
    const q = query(collection(db, "services"), where("userId", "==", userId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ServiceProvider;
  }

  async getServicesByCommunity(communityId: string, category?: string): Promise<ServiceProvider[]> {
    let q = query(collection(db, "services"), where("communityId", "==", communityId));
    if (category && category !== "All") {
      q = query(collection(db, "services"), where("communityId", "==", communityId), where("category", "==", category));
    }
    const snapshot = await getDocs(q);
    const services = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ServiceProvider));
    
    // Sort locally: 
    // 1. Premium/Featured providers first
    // 2. Then Verified
    // 3. Then by availability
    // 4. Then by rating
    return services.sort((a: any, b: any) => {

      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      if (a.isAvailable === b.isAvailable) {
        return b.rating - a.rating;
      }
      return a.isAvailable ? -1 : 1;
    });
  }

  // Analytics Tracking Methods
  async trackProviderView(id: string) {
    try {
      const docRef = doc(db, "services", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentViews = snapshot.data().views || 0;
        await updateDoc(docRef, { views: currentViews + 1 });
      }
    } catch (error) {
      console.warn("Analytics error tracking provider view:", error);
    }
  }

  async trackContactClick(id: string) {
    try {
      const docRef = doc(db, "services", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentClicks = snapshot.data().contactClicks || 0;
        await updateDoc(docRef, { contactClicks: currentClicks + 1 });
      }
    } catch (error) {
      console.warn("Analytics error tracking contact click:", error);
    }
  }

  async addReview(review: Omit<ServiceReview, "id" | "createdAt">) {
    const colRef = collection(db, "service_reviews");
    const docRef = await addDoc(colRef, {
      ...review,
      createdAt: serverTimestamp(),
    });

    // Update aggregate ratings on the provider doc
    const service = await this.getProviderById(review.serviceId);
    if (service) {
      const newCount = (service.reviewCount || 0) + 1;
      const totalRating = (service.rating || 0) * (service.reviewCount || 0) + review.rating;
      const newRating = totalRating / newCount;
      
      const sRef = doc(db, "services", review.serviceId);
      await updateDoc(sRef, {
        rating: newRating,
        reviewCount: newCount
      });
    }

    return docRef.id;
  }

  async getReviews(serviceId: string): Promise<ServiceReview[]> {
    const q = query(collection(db, "service_reviews"), where("serviceId", "==", serviceId));
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ServiceReview));
    
    // Sort by newest first locally to avoid needing a composite index immediately
    return reviews.sort((a: any, b: any) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  }
}

export default new ProviderService();
