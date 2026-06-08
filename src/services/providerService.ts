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
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  communityId: string;
  rating: number;
  reviewCount: number;
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
  async registerProvider(provider: Omit<ServiceProvider, "id" | "rating" | "reviewCount" | "createdAt" | "updatedAt">) {
    const colRef = collection(db, "services");
    const docRef = await addDoc(colRef, {
      ...provider,
      rating: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async updateProviderStatus(id: string, isAvailable: boolean) {
    const docRef = doc(db, "services", id);
    await updateDoc(docRef, { isAvailable, updatedAt: serverTimestamp() });
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
    
    // Sort by availability and rating locally (Firestore complex queries need indexes)
    return services.sort((a: any, b: any) => {
      if (a.isAvailable === b.isAvailable) {
        return b.rating - a.rating;
      }
      return a.isAvailable ? -1 : 1;
    });
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
