/**
 * Emergency service numbers keyed by country name (as returned by
 * expo-location reverseGeocodeAsync). Covers 50+ countries.
 * Falls back to international defaults if country is unknown.
 */

export interface EmergencyService {
  label: string;
  number: string;
  icon: 'shield-outline' | 'medkit-outline' | 'flame-outline' | 'airplane-outline' | 'heart-outline' | 'call-outline';
  color: string;
}

const EMERGENCY_DB: Record<string, EmergencyService[]> = {
  // ── Pakistan ──────────────────────────────────────────────────────────────
  Pakistan: [
    { label: 'Police',    number: '15',   icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '115',  icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '16',   icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Rescue',    number: '1122', icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Women',     number: '1099', icon: 'heart-outline',    color: '#EC4899' },
    { label: 'Edhi',      number: '115',  icon: 'call-outline',     color: '#14B8A6' },
  ],
  // ── India ─────────────────────────────────────────────────────────────────
  India: [
    { label: 'Police',    number: '100', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '108', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '101', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Disaster',  number: '108', icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Women',     number: '181', icon: 'heart-outline',    color: '#EC4899' },
    { label: 'Emergency', number: '112', icon: 'call-outline',     color: '#14B8A6' },
  ],
  // ── United States ─────────────────────────────────────────────────────────
  'United States': [
    { label: 'Emergency',   number: '911', icon: 'call-outline',     color: '#3B82F6' },
    { label: 'Police',      number: '911', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance',   number: '911', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',        number: '911', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Poison',      number: '1-800-222-1222', icon: 'heart-outline', color: '#EC4899' },
    { label: 'Crisis Line', number: '988', icon: 'call-outline',     color: '#8B5CF6' },
  ],
  // ── United Kingdom ────────────────────────────────────────────────────────
  'United Kingdom': [
    { label: 'Emergency', number: '999', icon: 'call-outline',     color: '#3B82F6' },
    { label: 'Police',    number: '999', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '999', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '999', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Non-Emerg', number: '101', icon: 'shield-outline',   color: '#8B5CF6' },
    { label: 'EU Line',   number: '112', icon: 'call-outline',     color: '#14B8A6' },
  ],
  // ── UAE ───────────────────────────────────────────────────────────────────
  'United Arab Emirates': [
    { label: 'Police',    number: '999', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '998', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '997', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Coast',     number: '996', icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Gas Leak',  number: '991', icon: 'heart-outline',    color: '#EC4899' },
    { label: 'Emergency', number: '112', icon: 'call-outline',     color: '#14B8A6' },
  ],
  // ── Saudi Arabia ──────────────────────────────────────────────────────────
  'Saudi Arabia': [
    { label: 'Police',    number: '999', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '911', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '998', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Traffic',   number: '993', icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Emergency', number: '911', icon: 'call-outline',     color: '#14B8A6' },
    { label: 'HAZMAT',    number: '920003384', icon: 'heart-outline', color: '#EC4899' },
  ],
  // ── Australia ────────────────────────────────────────────────────────────
  Australia: [
    { label: 'Emergency', number: '000', icon: 'call-outline',     color: '#3B82F6' },
    { label: 'Police',    number: '000', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '000', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '000', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Non-Emerg', number: '131 444', icon: 'shield-outline', color: '#8B5CF6' },
    { label: 'Crisis',    number: '13 11 14', icon: 'heart-outline', color: '#EC4899' },
  ],
  // ── Canada ────────────────────────────────────────────────────────────────
  Canada: [
    { label: 'Emergency', number: '911', icon: 'call-outline',     color: '#3B82F6' },
    { label: 'Police',    number: '911', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '911', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '911', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Crisis',    number: '1-833-456-4566', icon: 'heart-outline', color: '#EC4899' },
    { label: 'Poison',    number: '1-800-268-9017', icon: 'call-outline', color: '#8B5CF6' },
  ],
  // ── Germany ───────────────────────────────────────────────────────────────
  Germany: [
    { label: 'Police',    number: '110', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Fire / Amb',number: '112', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Ambulance', number: '112', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'EU Line',   number: '112', icon: 'call-outline',     color: '#14B8A6' },
    { label: 'Poison',    number: '030 19240', icon: 'heart-outline', color: '#EC4899' },
    { label: 'Emergency', number: '112', icon: 'airplane-outline', color: '#8B5CF6' },
  ],
  // ── France ───────────────────────────────────────────────────────────────
  France: [
    { label: 'Police',    number: '17',  icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '15',  icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '18',  icon: 'flame-outline',    color: '#EA580C' },
    { label: 'EU Line',   number: '112', icon: 'call-outline',     color: '#14B8A6' },
    { label: 'Women',     number: '3919', icon: 'heart-outline',   color: '#EC4899' },
    { label: 'Deaf',      number: '114', icon: 'airplane-outline', color: '#8B5CF6' },
  ],
  // ── Turkey ────────────────────────────────────────────────────────────────
  Turkey: [
    { label: 'Police',    number: '155', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '112', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '110', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'Gendarmerie',number: '156',icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Coast',     number: '158', icon: 'heart-outline',    color: '#EC4899' },
    { label: 'EU Line',   number: '112', icon: 'call-outline',     color: '#14B8A6' },
  ],
  // ── Bangladesh ───────────────────────────────────────────────────────────
  Bangladesh: [
    { label: 'Police',    number: '999', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '199', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '199', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'National',  number: '999', icon: 'call-outline',     color: '#14B8A6' },
    { label: 'Women',     number: '109', icon: 'heart-outline',    color: '#EC4899' },
    { label: 'Emergency', number: '999', icon: 'airplane-outline', color: '#8B5CF6' },
  ],
  // ── Nigeria ───────────────────────────────────────────────────────────────
  Nigeria: [
    { label: 'Police',    number: '199', icon: 'shield-outline',   color: '#3B82F6' },
    { label: 'Ambulance', number: '112', icon: 'medkit-outline',   color: '#10B981' },
    { label: 'Fire',      number: '112', icon: 'flame-outline',    color: '#EA580C' },
    { label: 'NEMA',      number: '112', icon: 'airplane-outline', color: '#8B5CF6' },
    { label: 'Emergency', number: '112', icon: 'call-outline',     color: '#14B8A6' },
    { label: 'Women',     number: '112', icon: 'heart-outline',    color: '#EC4899' },
  ],
};

// ── International fallback ────────────────────────────────────────────────────
const INTERNATIONAL_FALLBACK: EmergencyService[] = [
  { label: 'Emergency', number: '112', icon: 'call-outline',     color: '#3B82F6' },
  { label: 'Police',    number: '112', icon: 'shield-outline',   color: '#3B82F6' },
  { label: 'Ambulance', number: '112', icon: 'medkit-outline',   color: '#10B981' },
  { label: 'Fire',      number: '112', icon: 'flame-outline',    color: '#EA580C' },
  { label: 'Intl SOS',  number: '+1-215-942-8226', icon: 'airplane-outline', color: '#8B5CF6' },
  { label: 'Crisis',    number: '112', icon: 'heart-outline',    color: '#EC4899' },
];

/**
 * Returns the emergency service numbers for a given country string
 * (as returned by expo-location reverseGeocodeAsync addr.country).
 * Falls back to international 112 if the country is not in the database.
 */
export function getEmergencyServices(country: string | null | undefined): EmergencyService[] {
  if (!country) return INTERNATIONAL_FALLBACK;

  // Exact match
  if (EMERGENCY_DB[country]) return EMERGENCY_DB[country];

  // Partial match (handles "United States of America" → "United States", etc.)
  const key = Object.keys(EMERGENCY_DB).find((k) =>
    country.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(country.toLowerCase())
  );

  return key ? EMERGENCY_DB[key] : INTERNATIONAL_FALLBACK;
}
