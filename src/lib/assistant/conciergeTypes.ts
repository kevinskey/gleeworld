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
  | { kind: 'places'; query: string; near?: string; places: PlaceEntry[] }
  /** A video to PLAY on screen, not a link to follow. The panel embeds it. */
  | { kind: 'video'; query: string; videoId: string; title: string; channel?: string }
  /** A news/web article read IN PLACE (extract-article reader) — never a
   *  hand-off to a new tab that abandons the Command Center. readAloud
   *  starts speech as soon as the text lands ("read it to me"). */
  | { kind: 'article'; url: string; title?: string; readAloud?: boolean };
