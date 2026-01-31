const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TikTokOEmbedResponse {
  version: string;
  type: string;
  title: string;
  author_url: string;
  author_name: string;
  width: string;
  height: string;
  html: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  provider_url: string;
  provider_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching TikTok oEmbed for URL:', url);

    // Call TikTok's oEmbed API
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; GleeWorld/1.0)',
      },
    });

    if (!response.ok) {
      console.error('TikTok oEmbed API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `TikTok API returned ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: TikTokOEmbedResponse = await response.json();
    
    console.log('TikTok oEmbed response received:', {
      title: data.title,
      author: data.author_name,
      hasThumbnail: !!data.thumbnail_url,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: data.title,
          authorName: data.author_name,
          authorUrl: data.author_url,
          thumbnailUrl: data.thumbnail_url,
          thumbnailWidth: data.thumbnail_width,
          thumbnailHeight: data.thumbnail_height,
          html: data.html,
          width: data.width,
          height: data.height,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tiktok-oembed function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
