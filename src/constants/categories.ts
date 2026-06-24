// Single source of truth for all structured community post categories.
// Neighborly is NOT a social media platform.
// Every post must belong to one of these 5 actionable community categories.

export interface CategoryDef {
  firestoreValue: string; // stored in Firestore post.category
  chipId: string;         // used in CategoryChips & filter logic
  label: string;          // display label
  emoji: string;          // icon emoji
  color: string;
  bg: string;
  border: string;
  placeholder: string;    // descriptive placeholder for post creation
  // quick-action type param from the URL (optional)
  typeParam?: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    firestoreValue: 'Need Help',
    chipId: 'need_help',
    label: 'Need Help',
    emoji: '🤝',
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#BFDBFE',
    placeholder: 'Describe what help you need from your neighbors...',
    typeParam: 'help',
  },
  {
    firestoreValue: 'Offer Help',
    chipId: 'offer_help',
    label: 'Offer Help',
    emoji: '💚',
    color: '#10B981',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    placeholder: 'Describe what help or service you can offer to neighbors...',
    typeParam: 'offer',
  },
  {
    firestoreValue: 'Recommendations',
    chipId: 'recommendations',
    label: 'Recommendation',
    emoji: '⭐',
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
    placeholder: 'Recommend a local business, service, or place to your neighbors...',
    typeParam: 'recommend',
  },
  {
    firestoreValue: 'Lost & Found',
    chipId: 'lost_found',
    label: 'Lost & Found',
    emoji: '🔍',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    placeholder: 'Describe the lost or found item with details and location...',
    typeParam: 'lost',
  },
  {
    firestoreValue: 'Emergency',
    chipId: 'emergency',
    label: 'Emergency',
    emoji: '🚨',
    color: '#EF4444',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    placeholder: 'Describe the emergency situation for your community...',
    typeParam: 'emergency',
  },
];

/** Map a URL ?type param → canonical Firestore category value */
export function typeParamToCategory(type: string | undefined): string {
  const match = CATEGORIES.find((c) => c.typeParam === type);
  return match?.firestoreValue ?? 'Need Help';
}

/** Map a filter chipId → canonical Firestore category value */
export function chipIdToFirestoreValue(chipId: string): string | null {
  const match = CATEGORIES.find((c) => c.chipId === chipId);
  return match?.firestoreValue ?? null;
}

/** Get theme colours for a Firestore category value */
export function getCategoryTheme(firestoreValue: string): { color: string; bg: string; border: string; emoji: string } {
  const match = CATEGORIES.find(
    (c) => c.firestoreValue.toLowerCase() === firestoreValue.toLowerCase()
  );
  return match
    ? { color: match.color, bg: match.bg, border: match.border, emoji: match.emoji }
    : { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', emoji: '📌' };
}

/** Get the placeholder text for a given category */
export function getCategoryPlaceholder(firestoreValue: string): string {
  const match = CATEGORIES.find(
    (c) => c.firestoreValue.toLowerCase() === firestoreValue.toLowerCase()
  );
  return match?.placeholder ?? 'Describe your community post...';
}
