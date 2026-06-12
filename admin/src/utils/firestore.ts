import type {
  DocumentData,
  FirestoreError,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from "firebase/firestore";

/** Map a Firestore query snapshot to typed models (id + document fields). */
export function mapQuerySnapshot<T extends { id: string }>(
  snap: QuerySnapshot<DocumentData>,
  project: (docSnap: QueryDocumentSnapshot<DocumentData>) => T,
): T[] {
  return snap.docs.map(project);
}

/** Shorthand: spread document data with its id. */
export function withDocId<T extends { id: string }>(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
}

export type { FirestoreError, QuerySnapshot, QueryDocumentSnapshot, DocumentData };
