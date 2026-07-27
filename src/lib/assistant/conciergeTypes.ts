export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> };
