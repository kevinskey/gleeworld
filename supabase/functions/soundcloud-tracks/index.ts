import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
    
    if (!clientId) {
      console.error('SOUNDCLOUD_CLIENT_ID not found');
      return new Response(
        JSON.stringify({ error: 'SoundCloud client ID not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q') || 'choir music gospel';
    const limit = url.searchParams.get('limit') || '8';

    console.log(`Fetching SoundCloud tracks for query: ${query}, limit: ${limit}`);
    console.log(`Using client ID: ${clientId ? 'SET' : 'NOT SET'}`);

    // Try SoundCloud API v2 first
    const soundcloudUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}&linked_partitioning=1`;
    console.log(`Requesting URL: ${soundcloudUrl}`);

    const response = await fetch(soundcloudUrl);
    console.log(`SoundCloud response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SoundCloud API error: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      
      // Return diverse sample tracks with different audio sources
      const fallbackTracks = [
        {
          id: 'sample-1',
          title: 'Amazing Grace',
          duration: '3:30',
          image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
          audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-1.wav',
          user: 'Spelman Glee Club'
        },
        {
          id: 'sample-2', 
          title: 'Wade in the Water',
          duration: '4:15',
          image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
          audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-2.wav',
          user: 'Spelman Glee Club'
        },
        {
          id: 'sample-3',
          title: 'Lift Every Voice and Sing',
          duration: '5:12',
          image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
          audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-3.wav',
          user: 'Spelman Glee Club'
        },
        {
          id: 'sample-4',
          title: 'Precious Lord',
          duration: '3:45',
          image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
          audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-4.wav',
          user: 'Spelman Glee Club'
        }
      ];
      
      return new Response(
        JSON.stringify({ tracks: fallbackTracks, source: 'fallback' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log(`Raw SoundCloud response:`, JSON.stringify(data, null, 2));
    console.log(`Found ${data.collection?.length || 0} tracks`);

    // Transform SoundCloud data to match our Track interface
    const tracks = data.collection?.map((track: any) => {
      console.log(`Processing track: ${track.title}, stream_url: ${track.stream_url}`);
      return {
        id: track.id.toString(),
        title: track.title,
        duration: formatDuration(track.duration),
        image: track.artwork_url || track.user?.avatar_url || '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
        audioUrl: track.stream_url ? `${track.stream_url}?client_id=${clientId}` : null,
        user: track.user?.username,
        permalink_url: track.permalink_url
      };
    }).filter((track: any) => track.audioUrl) || [];

    console.log(`Filtered tracks with audio URLs: ${tracks.length}`);

    return new Response(
      JSON.stringify({ tracks }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching SoundCloud tracks:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function formatDuration(milliseconds: number): string {
  if (!milliseconds) return '0:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}