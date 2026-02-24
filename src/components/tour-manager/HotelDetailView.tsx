import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Hotel,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Star,
  Users,
  DollarSign,
  Utensils,
  ShoppingBag,
  Landmark,
  Fuel,
  Cross,
  Building2,
  Navigation,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Calendar,
  Globe,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number;
  priceLevel: string | null;
  website: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  isOpen: boolean | null;
}

interface HotelDetailViewProps {
  hotel: any;
  onBack: () => void;
}

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  fitness: Dumbbell,
  pool: Users,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  parking: 'Free Parking',
  breakfast: 'Breakfast',
  fitness: 'Fitness Center',
  pool: 'Pool',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Restaurants': Utensils,
  'Attractions': Landmark,
  'Shopping': ShoppingBag,
  'Gas Stations': Fuel,
  'Pharmacy': Cross,
  'Hospital': Building2,
};

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

export const HotelDetailView: React.FC<HotelDetailViewProps> = ({ hotel, onBack }) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<Record<string, NearbyPlace[]>>({});
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // We need lat/lng. The gw_tour_hotels table might not store them yet,
  // so we'll use the hotel's city for a geocode fallback via the search-hotels function.
  // For now, let's check if the hotel has coordinates stored or search for them.
  useEffect(() => {
    fetchNearbyPlaces();
  }, [hotel]);

  const fetchNearbyPlaces = async () => {
    // First try to get coordinates — search for the hotel to get lat/lng
    setLoadingNearby(true);
    setNearbyError(null);

    try {
      // Search for the hotel to get coordinates
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-hotels', {
        body: { query: hotel.hotel_name, city: hotel.city, state: hotel.state },
      });

      if (searchError) throw searchError;

      const results = searchData?.results || [];
      // Find the matching hotel by name similarity
      const match = results.find((r: any) =>
        r.name.toLowerCase().includes(hotel.hotel_name.toLowerCase()) ||
        hotel.hotel_name.toLowerCase().includes(r.name.toLowerCase())
      ) || results[0];

      if (!match?.lat || !match?.lng) {
        setNearbyError('Could not determine hotel location for nearby search.');
        setLoadingNearby(false);
        return;
      }

      // Now fetch nearby places
      const { data: nearbyData, error: nearbyFetchError } = await supabase.functions.invoke('nearby-places', {
        body: { lat: match.lat, lng: match.lng },
      });

      if (nearbyFetchError) throw nearbyFetchError;
      setNearbyPlaces(nearbyData?.results || {});
    } catch (err: any) {
      console.error('Error fetching nearby places:', err);
      setNearbyError(err.message || 'Failed to load nearby places');
    } finally {
      setLoadingNearby(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getGoogleMapsUrl = () => {
    const query = encodeURIComponent(`${hotel.hotel_name} ${hotel.address} ${hotel.city} ${hotel.state}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getDirectionsUrl = (place: NearbyPlace) => {
    const origin = encodeURIComponent(`${hotel.hotel_name} ${hotel.city} ${hotel.state}`);
    const dest = encodeURIComponent(`${place.name} ${place.address}`);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 truncate">
            <Hotel className="h-5 w-5 text-primary flex-shrink-0" />
            {hotel.hotel_name}
          </h2>
          {hotel.tour_city && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Tour Stop: {hotel.tour_city.city_name}, {hotel.tour_city.state_code}
            </p>
          )}
        </div>
      </div>

      {/* Main Hotel Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Hotel Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accommodation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div>
                {hotel.address && <p className="text-sm font-medium">{hotel.address}</p>}
                <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.state} {hotel.zip_code}</p>
                <a
                  href={getGoogleMapsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Check-in/out */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Check-in:</span>{' '}
                  <span className="font-medium">{formatDate(hotel.check_in_date)}</span>
                  {hotel.check_in_time && <span className="text-muted-foreground"> at {hotel.check_in_time}</span>}
                </p>
                <p>
                  <span className="text-muted-foreground">Check-out:</span>{' '}
                  <span className="font-medium">{formatDate(hotel.check_out_date)}</span>
                  {hotel.check_out_time && <span className="text-muted-foreground"> at {hotel.check_out_time}</span>}
                </p>
              </div>
            </div>

            {/* Phone */}
            {hotel.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a href={`tel:${hotel.phone}`} className="text-sm text-primary hover:underline">{hotel.phone}</a>
              </div>
            )}

            {/* Website */}
            {hotel.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                  {hotel.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            )}

            {/* Confirmation */}
            {hotel.confirmation_number && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Confirmation Number</p>
                <p className="font-mono font-semibold text-sm">{hotel.confirmation_number}</p>
              </div>
            )}

            {/* Contact */}
            {(hotel.contact_name || hotel.contact_email) && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Hotel Contact</p>
                {hotel.contact_name && <p className="text-sm font-medium">{hotel.contact_name}</p>}
                {hotel.contact_email && (
                  <a href={`mailto:${hotel.contact_email}`} className="text-xs text-primary hover:underline">
                    {hotel.contact_email}
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Rooms, Cost, Amenities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rooms & Amenities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room Info */}
            <div className="grid grid-cols-2 gap-3">
              {hotel.room_count && (
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{hotel.room_count}</p>
                  <p className="text-xs text-muted-foreground">Rooms</p>
                </div>
              )}
              {hotel.room_rate && (
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">${hotel.room_rate}</p>
                  <p className="text-xs text-muted-foreground">Per Night</p>
                </div>
              )}
              {hotel.total_cost && (
                <div className="bg-accent/10 rounded-lg p-3 text-center col-span-2">
                  <p className="text-xs text-muted-foreground">Estimated Total</p>
                  <p className="text-xl font-bold text-primary">${hotel.total_cost.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Amenities</p>
                <div className="grid grid-cols-2 gap-2">
                  {hotel.amenities.map((amenity: string) => {
                    const Icon = AMENITY_ICONS[amenity] || Hotel;
                    const label = AMENITY_LABELS[amenity] || amenity;
                    return (
                      <div key={amenity} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Parking */}
            {hotel.parking_info && (
              <div>
                <p className="text-sm font-medium mb-1">Parking</p>
                <p className="text-sm text-muted-foreground">{hotel.parking_info}</p>
              </div>
            )}

            {/* Notes */}
            {hotel.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hotel.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Google Maps Embed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border border-border">
            <iframe
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || ''}&q=${encodeURIComponent(`${hotel.hotel_name} ${hotel.city} ${hotel.state}`)}`}
              allowFullScreen
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            If the map doesn't load, <a href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">open in Google Maps</a>.
          </p>
        </CardContent>
      </Card>

      {/* Nearby Places / City Highlights */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          What's Nearby
        </h3>

        {loadingNearby && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {nearbyError && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">{nearbyError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchNearbyPlaces}>
              Retry
            </Button>
          </Card>
        )}

        {!loadingNearby && !nearbyError && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(nearbyPlaces).map(([category, places]) => {
              const CategoryIcon = CATEGORY_ICONS[category] || Landmark;
              if (!places || places.length === 0) return null;

              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-primary" />
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {places.map((place) => (
                      <div
                        key={place.id}
                        className="p-2 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{place.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {place.rating && (
                              <Badge variant="secondary" className="text-xs gap-0.5 px-1.5">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                {place.rating}
                              </Badge>
                            )}
                            {place.isOpen !== null && (
                              <Badge variant={place.isOpen ? 'default' : 'outline'} className="text-xs px-1.5">
                                {place.isOpen ? 'Open' : 'Closed'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {place.priceLevel && PRICE_LABELS[place.priceLevel] && (
                            <span className="text-xs text-muted-foreground">{PRICE_LABELS[place.priceLevel]}</span>
                          )}
                          <a
                            href={getDirectionsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            Directions <ExternalLink className="h-3 w-3" />
                          </a>
                          {place.website && (
                            <a
                              href={place.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              Website <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loadingNearby && !nearbyError && Object.values(nearbyPlaces).every(p => p.length === 0) && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">No nearby places found.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
