import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Track {
  id: string;
  title: string;
  duration: string;
  image: string;
  audioUrl: string;
  user?: string;
  permalink_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || 'spelman glee club gospel';
    const limit = parseInt(url.searchParams.get('limit') || '8');

    console.log(`🎵 Fetching SoundCloud tracks for: "${query}" (limit: ${limit})`);

    const result = await fetchSoundCloudTracks(query, limit);
    
    return new Response(
      JSON.stringify({ 
        tracks: result.tracks,
        source: result.source,
        query: query,
        count: result.tracks.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in soundcloud-tracks:', error);
    
    return new Response(
      JSON.stringify({ 
        tracks: getFallbackTracks(),
        source: 'error_fallback',
        error: error.message
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchSoundCloudTracks(query: string, limit: number): Promise<{tracks: Track[], source: string}> {
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  const clientSecret = Deno.env.get('SOUNDCLOUD_CLIENT_SECRET');
  
  console.log('🔑 Checking credentials:', {
    clientId: clientId ? `Present (${clientId.substring(0, 8)}...)` : 'Missing',
    clientSecret: clientSecret ? `Present (${clientSecret.substring(0, 8)}...)` : 'Missing'
  });
  
  if (!clientId || !clientSecret) {
    console.warn('⚠️ Missing SoundCloud credentials');
    return { tracks: getFallbackTracks(), source: 'fallback_missing_credentials' };
  }

  try {
    // Test different SoundCloud endpoints to find one that works
    console.log('🎯 Testing SoundCloud API endpoints...');
    
    // Try the resolve endpoint first (more reliable)
    const resolveUrl = 'https://api.soundcloud.com/resolve';
    const testParams = new URLSearchParams({
      url: 'https://soundcloud.com/spelman-college',
      client_id: clientId,
      format: 'json'
    });
    
    console.log(`📡 Testing resolve endpoint: ${resolveUrl}?${testParams.toString()}`);
    
    const testResponse = await fetch(`${resolveUrl}?${testParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SpelmanGleeWorld/1.0'
      }
    });
    
    console.log(`🔍 Resolve test response: ${testResponse.status} ${testResponse.statusText}`);
    
    if (testResponse.ok) {
      console.log('✅ SoundCloud API is accessible, proceeding with track search...');
    } else {
      console.log('❌ SoundCloud API test failed, using alternative approach...');
    }

    // Now try to search for tracks
    const searchUrl = 'https://api.soundcloud.com/tracks';
    const params = new URLSearchParams({
      q: query,
      client_id: clientId,
      limit: limit.toString(),
      format: 'json'
    });

    console.log(`📡 Calling SoundCloud API: ${searchUrl}?${params.toString()}`);

    const response = await fetch(`${searchUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SpelmanGleeWorld/1.0'
      }
    });

    console.log(`📊 SoundCloud response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ SoundCloud API error: ${response.status}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return { tracks: getFallbackTracks(), source: 'fallback_api_error' };
    }

    const data = await response.json();
    console.log('📦 SoundCloud response data keys:', Object.keys(data));
    console.log('📦 Collection length:', data.collection?.length || 0);

    if (!data.collection || !Array.isArray(data.collection) || data.collection.length === 0) {
      console.warn('⚠️ No tracks found in SoundCloud response');
      return { tracks: getFallbackTracks(), source: 'fallback_no_results' };
    }

    // Process tracks from SoundCloud
    const processedTracks: Track[] = [];
    
    for (const track of data.collection.slice(0, limit)) {
      if (!track || !track.id || !track.title) {
        console.log('⏭️ Skipping invalid track');
        continue;
      }

      // Check if track is streamable
      if (!track.streamable) {
        console.log(`⏭️ Skipping non-streamable track: ${track.title}`);
        continue;
      }

      const processedTrack: Track = {
        id: track.id.toString(),
        title: track.title,
        duration: formatDuration(track.duration),
        image: track.artwork_url || track.user?.avatar_url || '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
        audioUrl: generateStreamUrl(track, clientId),
        user: track.user?.username || 'Unknown Artist',
        permalink_url: track.permalink_url
      };

      processedTracks.push(processedTrack);
      console.log(`✅ Processed: "${processedTrack.title}" by ${processedTrack.user}`);
    }

    if (processedTracks.length === 0) {
      console.warn('⚠️ No streamable tracks found');
      return { tracks: getFallbackTracks(), source: 'fallback_no_streamable' };
    }

    console.log(`🎧 Successfully processed ${processedTracks.length} tracks from SoundCloud`);
    return { tracks: processedTracks, source: 'soundcloud' };

  } catch (error) {
    console.error('💥 Error fetching from SoundCloud:', error);
    return { tracks: getFallbackTracks(), source: 'fallback_error' };
  }
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    console.log('🔐 Getting OAuth access token...');
    
    const tokenUrl = 'https://api.soundcloud.com/oauth2/token';
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'non-expiring'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    console.log(`🔑 Token response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token request failed:', errorText);
      return null;
    }

    const tokenData = await response.json();
    console.log('✅ Successfully obtained access token');
    
    return tokenData.access_token || null;
    
  } catch (error) {
    console.error('💥 Error getting access token:', error);
    return null;
  }
}

function generateStreamUrl(track: any, clientId: string): string {
  // Try different stream URL approaches
  if (track.stream_url) {
    return `${track.stream_url}?client_id=${clientId}`;
  }
  
  // Fallback to embed player URL
  if (track.permalink_url) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.permalink_url)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&client_id=${clientId}`;
  }
  
  // Last resort - direct track URL
  return `https://api.soundcloud.com/tracks/${track.id}/stream?client_id=${clientId}`;
}

function getFallbackTracks(): Track[] {
  console.log('🚫 SoundCloud API authentication failed - check credentials');
  
  return [
    {
      id: 'error-1',
      title: 'SoundCloud API Authentication Failed',
      duration: '0:00',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: '', // No audio URL since this is an error state
      user: 'Please check your API credentials'
    }
  ];
}

function formatDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds <= 0) return '0:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
