import { create } from 'zustand';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Community {
  name: string;
  area: string;
  district: string;
  city: string;
  country: string;
  communityId?: string;
}

interface AppState {
  isAuthenticated: boolean;
  authInitialized: boolean;
  sosActive: boolean;
  activeSosPostId: string | null;

  // ── Primary Community (permanent home — never changes on GPS move) ────────
  primaryCommunity: Community | null;

  // ── Current GPS coordinates (real-time, independent of community) ─────────
  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied';
  isGpsDisabled: boolean;
  coordinates: Coordinates | null;

  /**
   * @deprecated Use primaryCommunity instead.
   * Stored as a plain field (not a getter) so Zustand subscriptions work.
   * Always kept in sync with primaryCommunity by every write action.
   */
  community: Community | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  login: () => void;
  logout: () => void;
  setAuthInitialized: (val: boolean) => void;
  setSosActive: (active: boolean) => void;
  setActiveSosPostId: (id: string | null) => void;
  setLocationStatus: (status: AppState['locationStatus']) => void;
  setGpsDisabled: (disabled: boolean) => void;

  /** Set primary community (home — only on explicit user confirmation). */
  setPrimaryCommunity: (community: Community) => void;

  /** Update current GPS coordinates without touching primary community. */
  setCurrentCoordinates: (coordinates: Coordinates) => void;

  /**
   * @deprecated Use setPrimaryCommunity + setCurrentCoordinates separately.
   * Kept for backward-compat.
   */
  setLocation: (coordinates: Coordinates, community: Community) => void;

  clearLocation: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  authInitialized: false,
  sosActive: false,
  activeSosPostId: null,

  primaryCommunity: null,
  community: null,           // real field, mirrors primaryCommunity
  locationStatus: 'idle',
  isGpsDisabled: false,
  coordinates: null,

  login: () => set({ isAuthenticated: true }),
  logout: () =>
    set({
      isAuthenticated: false,
      locationStatus: 'idle',
      coordinates: null,
      primaryCommunity: null,
      community: null,
      authInitialized: true,
      sosActive: false,
      activeSosPostId: null,
    }),
  setAuthInitialized: (val) => set({ authInitialized: val }),
  setSosActive: (active) => set({ sosActive: active }),
  setActiveSosPostId: (id) => set({ activeSosPostId: id }),
  setLocationStatus: (status) => set({ locationStatus: status }),
  setGpsDisabled: (disabled) => set({ isGpsDisabled: disabled }),

  setPrimaryCommunity: (community) =>
    // Write both fields so all subscribers (new + legacy) receive updates
    set({ primaryCommunity: community, community }),

  setCurrentCoordinates: (coordinates) =>
    set({ coordinates, locationStatus: 'granted', isGpsDisabled: false }),

  setLocation: (coordinates, community) =>
    set({
      coordinates,
      primaryCommunity: community,
      community,
      locationStatus: 'granted',
      isGpsDisabled: false,
    }),

  clearLocation: () =>
    set({
      coordinates: null,
      primaryCommunity: null,
      community: null,
      locationStatus: 'idle',
    }),
}));
