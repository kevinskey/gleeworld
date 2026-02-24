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

    const { query, city, state } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build search text — include city/state for better results
    let searchText = query;
    if (city) searchText += ` ${city}`;
    if (state) searchText += ` ${state}`;
    searchText += ' hotel';

    // Use Google Places Text Search (New) API
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.addressComponents,places.location,places.rating,places.types',
        },
        body: JSON.stringify({
          textQuery: searchText,
          includedType: 'lodging',
          languageCode: 'en',
          maxResultCount: 8,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Google Places API error [${response.status}]:`, errorBody);
      throw new Error(`Google Places API failed [${response.status}]: ${errorBody}`);
    }

    const data = await response.json();
    const places = (data.places || []).map((place: any) => {
      // Parse address components
      const components = place.addressComponents || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types?.includes(type))?.longText || '';
      const getShortComponent = (type: string) =>
        components.find((c: any) => c.types?.includes(type))?.shortText || '';

      return {
        place_id: place.id,
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        address: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
        city: getComponent('locality') || getComponent('sublocality'),
        state: getShortComponent('administrative_area_level_1'),
        zip_code: getComponent('postal_code'),
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        rating: place.rating || null,
        lat: place.location?.latitude || null,
        lng: place.location?.longitude || null,
      };
    });

    return new Response(JSON.stringify({ results: places }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-hotels:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
