import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const { lat, lng, categories, query, near, maxResults } = await req.json();

    // Text-search mode: caller passed a keyword (e.g. "starbucks",
    // "vietnamese restaurant"). Uses Places API New's Text Search, which
    // handles both keyword matching AND embedded location tokens
    // ("pizza near 30303") natively. Bias to lat/lng when provided so a
    // caller who has geo permission gets truly-nearest results; otherwise
    // fall back to including the user-supplied `near` string in the query
    // itself. Returns a flat, small object shaped for a chat assistant to
    // read out, not the full Places response.
    if (typeof query === 'string' && query.trim()) {
      const q = query.trim();
      const textQuery = near && typeof near === 'string' && near.trim()
        ? `${q} near ${near.trim()}`
        : q;
      const body: Record<string, unknown> = {
        textQuery,
        languageCode: 'en',
        maxResultCount: Math.max(1, Math.min(10, Number(maxResults) || 5)),
      };
      if (typeof lat === 'number' && typeof lng === 'number') {
        body.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 5000,
          },
        };
      }
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.currentOpeningHours,places.googleMapsUri',
          },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Places text search ${response.status}`, detail: await response.text() }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await response.json();
      const places = (data.places || []).map((place: any) => ({
        id: place.id,
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        rating: place.rating || null,
        ratingCount: place.userRatingCount || 0,
        priceLevel: place.priceLevel || null,
        website: place.websiteUri || null,
        phone: place.nationalPhoneNumber || null,
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        isOpen: place.currentOpeningHours?.openNow ?? null,
        // Universal one-tap link that opens Google Maps in-app on iOS/Android
        // and web on desktop — safest cross-platform "take me there" surface.
        mapsUrl: place.googleMapsUri || null,
      }));
      return new Response(JSON.stringify({ places }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy category-nearby mode (used by hotel search). Unchanged shape.
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'lat and lng are required for category search' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Categories to search for nearby the hotel
    const searchCategories = categories || [
      { type: 'restaurant', label: 'Restaurants' },
      { type: 'tourist_attraction', label: 'Attractions' },
      { type: 'shopping_mall', label: 'Shopping' },
      { type: 'gas_station', label: 'Gas Stations' },
      { type: 'pharmacy', label: 'Pharmacy' },
      { type: 'hospital', label: 'Hospital' },
    ];

    const results: Record<string, any[]> = {};

    // Fetch nearby places for each category using Places API (New) Nearby Search
    for (const category of searchCategories) {
      try {
        const response = await fetch(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.currentOpeningHours',
            },
            body: JSON.stringify({
              includedTypes: [category.type],
              maxResultCount: 5,
              locationRestriction: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 3000.0, // 3km radius
                },
              },
              languageCode: 'en',
            }),
          }
        );

        if (!response.ok) {
          console.error(`Nearby search error for ${category.type}:`, await response.text());
          results[category.label] = [];
          continue;
        }

        const data = await response.json();
        results[category.label] = (data.places || []).map((place: any) => ({
          id: place.id,
          name: place.displayName?.text || '',
          address: place.formattedAddress || '',
          rating: place.rating || null,
          ratingCount: place.userRatingCount || 0,
          priceLevel: place.priceLevel || null,
          website: place.websiteUri || null,
          phone: place.nationalPhoneNumber || null,
          lat: place.location?.latitude || null,
          lng: place.location?.longitude || null,
          isOpen: place.currentOpeningHours?.openNow ?? null,
        }));
      } catch (err) {
        console.error(`Error fetching ${category.type}:`, err);
        results[category.label] = [];
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in nearby-places:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
