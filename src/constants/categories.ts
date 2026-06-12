// Single source of truth for all category values.
// firestoreValue is what gets written to / read from Firestore.
// chipId is the id used in CategoryChips filter.

export interface CategoryDef {
  firestoreValue: string; // stored in Firestore post.category
  chipId: string;         // used in CategoryChips & filter logic
  label: string;          // display label
  color: string;
  bg: string;
  border: string;
  // quick-action type param from the URL (optional)
  typeParam?: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    firestoreValue: 'Emergency',
    chipId: 'emergency',
    label: 'Emergency',
    color: '#EF4444',
    bg: '#FEE2E2',
    border: '#FCA5A5',
  },
  {
    firestoreValue: 'Services',
    chipId: 'services',
    label: 'Services',
    color: '#10B981',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    typeParam: 'offer',
  },
  {
    firestoreValue: 'Food',
    chipId: 'food',
    label: 'Food',
    color: '#F59E0B',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  {
    firestoreValue: 'Help',
    chipId: 'help',
    label: 'Help',
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#BFDBFE',
    typeParam: 'help',
  },
  {
    firestoreValue: 'Recommendations',
    chipId: 'recommendations',
    label: 'Recommendations',
    color: '#7C3AED',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    typeParam: 'recommend',
  },
  {
    firestoreValue: 'Lost & Found',
    chipId: 'lost_found',
    label: 'Lost & Found',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    typeParam: 'lost',
  },
  {
    firestoreValue: 'Community Alert',
    chipId: 'community_alert',
    label: 'Community Alert',
    color: '#E11D48',
    bg: '#FFE4E6',
    border: '#FDA4AF',
  },
];

/** Map a URL ?type param → canonical Firestore category value */
export function typeParamToCategory(type: string | undefined): string {
  const match = CATEGORIES.find((c) => c.typeParam === type);
  return match?.firestoreValue ?? 'Emergency';
}

/** Map a filter chipId → canonical Firestore category value */
export function chipIdToFirestoreValue(chipId: string): string | null {
  const match = CATEGORIES.find((c) => c.chipId === chipId);
  return match?.firestoreValue ?? null;
}

/** Get theme colours for a Firestore category value */
export function getCategoryTheme(firestoreValue: string): { color: string; bg: string; border: string } {
  const match = CATEGORIES.find(
    (c) => c.firestoreValue.toLowerCase() === firestoreValue.toLowerCase()
  );
  return match
    ? { color: match.color, bg: match.bg, border: match.border }
    : { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
}
