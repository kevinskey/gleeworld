export interface PlaceEntry {
  name: string;
  address: string;
  rating?: number | null;
  ratingCount?: number;
  isOpen?: boolean | null;
  phone?: string | null;
  mapsUrl?: string | null;
}

export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> }
  | { kind: 'places'; query: string; near?: string; places: PlaceEntry[] };
