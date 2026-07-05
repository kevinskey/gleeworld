import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Google Places lookup function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing Google Places lookup request');
    
    if (!googleMapsApiKey) {
      console.error('Google Maps API key not found in environment');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { query, kind } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 'address' mode is used by the event-editor address field (generic
    // free-text address search). The default mode is unchanged and still
    // powers useGooglePlaces.ts's city/locality lookup.
    const isAddressMode = kind === 'address';
    console.log(`Looking up ${isAddressMode ? 'addresses' : 'cities'} for query:`, query);

    // Use Google Places API (New) Text Search
    const url = new URL('https://places.googleapis.com/v1/places:searchText');

    const searchBody: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: 5,
      languageCode: 'en'
    };
    if (!isAddressMode) {
      searchBody.includedType = 'locality'; // Focus on cities/localities
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.addressComponents'
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', response.status, errorText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google Places API response:', JSON.stringify(data, null, 2));

    let predictions;

    if (isAddressMode) {
      // Generic address search — no locality-only filtering, minimal shape.
      predictions = data.places?.map((place: any) => ({
        description: place.formattedAddress || place.displayName?.text || '',
        name: place.displayName?.text || ''
      })) || [];
    } else {
      // Transform the response to match our needs (unchanged city/locality path)
      predictions = data.places?.map((place: any) => {
        // Extract city, state, country from address components
        let city = '';
        let state = '';
        let country = '';

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes('locality')) {
              city = component.longText;
            } else if (component.types.includes('administrative_area_level_1')) {
              state = component.shortText;
            } else if (component.types.includes('country')) {
              country = component.longText;
            }
          }
        }

        return {
          place_id: place.displayName?.text || '',
          description: place.formattedAddress || place.displayName?.text || '',
          structured_formatting: {
            main_text: city || place.displayName?.text || '',
            secondary_text: [state, country].filter(Boolean).join(', ')
          },
          geometry: place.location ? {
            location: {
              lat: place.location.latitude,
              lng: place.location.longitude
            }
          } : null,
          city_name: city || place.displayName?.text || '',
          state: state,
          country: country
        };
      }) || [];
    }

    console.log('Transformed predictions:', predictions);

    return new Response(
      JSON.stringify({ predictions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-places-lookup function:', error);
    return new Response(
      JSON.stringify({ error: error.message, predictions: [] }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});