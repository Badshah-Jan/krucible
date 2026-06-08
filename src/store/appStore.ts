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

  // ── Location ──────────────────────────────────────────────────────────────
  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied';
  isGpsDisabled: boolean;
  coordinates: Coordinates | null;
  community: Community | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  login: () => void;
  logout: () => void;
  setAuthInitialized: (val: boolean) => void;
  setSosActive: (active: boolean) => void;
  setActiveSosPostId: (id: string | null) => void;
  setLocationStatus: (status: AppState['locationStatus']) => void;
  setGpsDisabled: (disabled: boolean) => void;
  setLocation: (coordinates: Coordinates, community: Community) => void;
  clearLocation: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  authInitialized: false,
  sosActive: false,
  activeSosPostId: null,

  locationStatus: 'idle',
  isGpsDisabled: false,
  coordinates: null,
  community: null,

  login: () => set({ isAuthenticated: true }),
  logout: () => set({
    isAuthenticated: false,
    locationStatus: 'idle',
    coordinates: null,
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
  setLocation: (coordinates, community) =>
    set({ coordinates, community, locationStatus: 'granted', isGpsDisabled: false }),
  clearLocation: () =>
    set({ coordinates: null, community: null, locationStatus: 'idle' }),
}));
