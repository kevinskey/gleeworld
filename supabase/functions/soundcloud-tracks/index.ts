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

    const tracks = await fetchSoundCloudTracks(query, limit);
    
    return new Response(
      JSON.stringify({ 
        tracks,
        source: tracks.length > 0 ? 'soundcloud' : 'fallback',
        query: query,
        count: tracks.length
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

async function fetchSoundCloudTracks(query: string, limit: number): Promise<Track[]> {
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  
  console.log('🔑 Checking SOUNDCLOUD_CLIENT_ID:', clientId ? 'Present' : 'Missing');
  
  if (!clientId) {
    console.warn('⚠️ SOUNDCLOUD_CLIENT_ID not configured');
    return getFallbackTracks();
  }

  try {
    // Use SoundCloud API v2 search endpoint
    const searchUrl = 'https://api-v2.soundcloud.com/search/tracks';
    const params = new URLSearchParams({
      q: query,
      client_id: clientId,
      limit: limit.toString(),
      linked_partitioning: '1',
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
      return getFallbackTracks();
    }

    const data = await response.json();
    console.log('📦 SoundCloud response data keys:', Object.keys(data));
    console.log('📦 Collection length:', data.collection?.length || 0);

    if (!data.collection || !Array.isArray(data.collection) || data.collection.length === 0) {
      console.warn('⚠️ No tracks found in SoundCloud response');
      return getFallbackTracks();
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
      return getFallbackTracks();
    }

    console.log(`🎧 Successfully processed ${processedTracks.length} tracks from SoundCloud`);
    return processedTracks;

  } catch (error) {
    console.error('💥 Error fetching from SoundCloud:', error);
    return getFallbackTracks();
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
  console.log('🔄 Using curated gospel fallback tracks');
  
  return [
    {
      id: 'gospel-1',
      title: 'Amazing Grace (Traditional)',
      duration: '4:32',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-1.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-2',
      title: 'Wade in the Water (Spiritual)',
      duration: '3:45',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-2.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-3',
      title: 'Lift Every Voice and Sing',
      duration: '5:12',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-3.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-4',
      title: 'Precious Lord, Take My Hand',
      duration: '4:18',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-4.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-5',
      title: 'Go Tell It on the Mountain',
      duration: '3:28',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-5.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-6',
      title: 'Swing Low, Sweet Chariot',
      duration: '4:05',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-6.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-7',
      title: 'Mary Had a Baby',
      duration: '3:52',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-7.wav',
      user: 'Spelman Glee Club'
    },
    {
      id: 'gospel-8',
      title: 'This Little Light of Mine',
      duration: '3:15',
      image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png',
      audioUrl: 'https://www.soundjay.com/misc/sounds/church-bell-8.wav',
      user: 'Spelman Glee Club'
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