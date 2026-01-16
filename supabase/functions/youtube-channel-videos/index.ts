import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelInput, maxResults = 10 } = await req.json();
    
    if (!channelInput) {
      return new Response(
        JSON.stringify({ error: 'Channel ID or URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract channel ID from various URL formats
    let channelId = channelInput;
    
    // Handle @username format (requires search)
    const handleMatch = channelInput.match(/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) {
      console.log('Resolving handle:', handleMatch[1]);
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].snippet.channelId;
        console.log('Resolved to channel ID:', channelId);
      } else {
        return new Response(
          JSON.stringify({ error: 'Channel not found for handle: ' + handleMatch[1] }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Handle youtube.com/channel/UC... format
    const channelUrlMatch = channelInput.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelUrlMatch) {
      channelId = channelUrlMatch[1];
    }

    // Handle youtube.com/c/ChannelName or youtube.com/user/Username
    const customUrlMatch = channelInput.match(/youtube\.com\/(c|user)\/([^/?]+)/);
    if (customUrlMatch) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(customUrlMatch[2])}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].snippet.channelId;
      }
    }

    console.log('Fetching videos for channel:', channelId);

    // Get the channel's uploads playlist ID
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Channel not found: ' + channelId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
    const channelTitle = channelData.items[0].snippet?.title;
    const channelThumbnail = channelData.items[0].snippet?.thumbnails?.default?.url;

    if (!uploadsPlaylistId) {
      return new Response(
        JSON.stringify({ error: 'Could not find uploads playlist for channel' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploads playlist ID:', uploadsPlaylistId);

    // Fetch videos from the uploads playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    if (playlistData.error) {
      console.error('YouTube API error:', playlistData.error);
      return new Response(
        JSON.stringify({ error: playlistData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videos: YouTubeVideo[] = (playlistData.items || []).map((item: any) => ({
      video_id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      published_at: item.snippet.publishedAt,
    }));

    console.log(`Found ${videos.length} videos for channel ${channelTitle}`);

    return new Response(
      JSON.stringify({ 
        channel_id: channelId,
        channel_title: channelTitle,
        channel_thumbnail: channelThumbnail,
        videos 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in youtube-channel-videos:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
