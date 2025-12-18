import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    // Build search query for bus companies
    const searchQuery = query ? `${query} bus charter company` : 'charter bus company transportation';
    const locationParam = location ? `&location=${encodeURIComponent(location)}&radius=50000` : '';
    
    // Use Google Places Text Search API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}${locationParam}&type=travel_agency&key=${apiKey}`;
    
    console.log('Searching for bus companies:', searchQuery);
    
    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      console.error('Google API error:', data.error_message);
      throw new Error(data.error_message || 'Google Places API request denied. Enable Places API in Google Cloud Console.');
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API status:', data.status);
      throw new Error(`Google API error: ${data.status}`);
    }

    // Transform results
    const companies = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      priceLevel: place.price_level,
      isOpen: place.opening_hours?.open_now,
      types: place.types,
      location: place.geometry?.location,
      photoReference: place.photos?.[0]?.photo_reference,
    }));

    console.log(`Found ${companies.length} bus companies`);

    return new Response(JSON.stringify({ 
      success: true, 
      companies,
      total: companies.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error searching bus companies:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
