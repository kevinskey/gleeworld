// Shared deep-link builders for the Concierge page and the assistant's
// book_ride / order_food client actions. Uber, Lyft, and the delivery services
// expose no public consumer booking APIs — the hand-off is a pre-filled link;
// the user confirms and pays inside their own account on the target service.
//
// Uber format note: the m.uber.com/looking?drop[0]={JSON} form is the current
// documented deep link and was browser-verified to pre-fill the dropoff on
// web and app. The legacy /ul/?action=setPickup form only seeds "destination
// suggestions" on desktop web, so it's the coordinate-less fallback only.

export type RideProvider = 'uber' | 'lyft';
export type FoodService = 'doordash' | 'ubereats' | 'grubhub';

export interface RideDestination {
  address: string;
  name?: string;
  lat?: number;
  lng?: number;
}

export function buildRideLink(
  provider: RideProvider,
  dest: RideDestination,
  pickup?: { lat: number; lng: number } | null,
): string {
  const hasCoords =
    typeof dest.lat === 'number' && Number.isFinite(dest.lat) &&
    typeof dest.lng === 'number' && Number.isFinite(dest.lng);

  if (provider === 'uber') {
    if (hasCoords) {
      const drop = {
        latitude: dest.lat,
        longitude: dest.lng,
        addressLine1: dest.name || dest.address,
        addressLine2: dest.address,
      };
      return `https://m.uber.com/looking?pickup=my_location&drop%5B0%5D=${encodeURIComponent(JSON.stringify(drop))}`;
    }
    const p = new URLSearchParams({ action: 'setPickup', pickup: 'my_location' });
    p.set('dropoff[formatted_address]', dest.address);
    return `https://m.uber.com/ul/?${p.toString()}`;
  }

  // Lyft's universal link needs destination coordinates; without them the best
  // hand-off is the web ride flow (pickup defaults to current location in-app).
  if (hasCoords) {
    const p = new URLSearchParams({ id: 'lyft' });
    p.set('destination[latitude]', String(dest.lat));
    p.set('destination[longitude]', String(dest.lng));
    if (pickup) {
      p.set('pickup[latitude]', String(pickup.lat));
      p.set('pickup[longitude]', String(pickup.lng));
    }
    return `https://lyft.com/ride?${p.toString()}`;
  }
  return 'https://ride.lyft.com/';
}

export const FOOD_SERVICES: Record<FoodService, { label: string; home: string; search: (q: string) => string }> = {
  doordash: {
    label: 'DoorDash',
    home: 'https://www.doordash.com/',
    search: (q) => `https://www.doordash.com/search/store/${encodeURIComponent(q)}/`,
  },
  ubereats: {
    label: 'Uber Eats',
    home: 'https://www.ubereats.com/',
    search: (q) => `https://www.ubereats.com/search?q=${encodeURIComponent(q)}`,
  },
  grubhub: {
    label: 'Grubhub',
    home: 'https://www.grubhub.com/',
    search: (q) => `https://www.grubhub.com/search?queryText=${encodeURIComponent(q)}`,
  },
};

/** Returns null for unknown services (model args are untrusted — same
 * hasOwnProperty guard as PAGE_ROUTES so prototype keys can't slip through). */
export function buildFoodLink(service: string, craving?: string): { label: string; url: string } | null {
  const svc = Object.prototype.hasOwnProperty.call(FOOD_SERVICES, service)
    ? FOOD_SERVICES[service as FoodService]
    : null;
  if (!svc) return null;
  const q = craving?.trim();
  return { label: svc.label, url: q ? svc.search(q) : svc.home };
}
