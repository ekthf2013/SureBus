export type CommuteMode = 'commute_in' | 'commute_out';

export type PreferenceOption = 'balance' | 'fastest' | 'min_walk' | 'min_transfer' | 'free_first';

export interface RouteFilters {
  useCompanyBusOnly: boolean;
  usePublicTransit: boolean;
}

export interface SearchParams {
  originName: string;
  originLat: number;
  originLng: number;
  mode: CommuteMode;
  targetTime: string; // e.g. "08:30"
  date: string; // e.g. "2026-08-13"
  preference: PreferenceOption;
  filters: RouteFilters;
}

export type StepType = 'walk' | 'shuttle' | 'commute_bus' | 'subway' | 'public_bus';

export interface RouteStepItem {
  id: string;
  type: StepType;
  title: string;
  subtitle?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes: number;
  distanceMeters?: number;
  fare?: number;
  note?: string;
  detailLocation?: string;
  coords?: { lat: number; lng: number };
  boardingStopName?: string;
  dropoffStopName?: string;
  busNo?: string;
  passStops?: string[];
}

export type BadgeType = 'recommend' | 'fastest' | 'min_walk' | 'free' | 'direct' | 'transfer' | 'early_bird';

export interface RouteCandidate {
  id: string;
  badges: BadgeType[];
  title: string;
  subtitle: string;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  walkMinutes: number;
  waitMinutes: number;
  busMinutes: number;
  fare: number;
  transferCount: number;
  steps: RouteStepItem[];
  routeColor: string;
  routeName: string;
  routeCategory: 'company_only' | 'transit_hybrid' | 'public_transit';
  score: number;
}

export interface UserFavorite {
  id: string;
  title: string;
  originName: string;
  originLat: number;
  originLng: number;
  mode: CommuteMode;
  targetTime: string;
  candidateId?: string;
  routeName?: string;
}

export interface ExcelImportSummary {
  fileName: string;
  importedAt: string;
  totalRoutes: number;
  totalStops: number;
  totalTrips: number;
  errors: string[];
  warnings: string[];
}
