import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = '/' } = await req.json();
    const baseUrl = 'https://conducting.gleeworld.org';
    const targetUrl = `${baseUrl}${path}`;

    console.log(`Conducting Proxy: Fetching ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GleeWorldProxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`Conducting Proxy: Error fetching ${targetUrl}: ${response.status}`);
      return new Response(JSON.stringify({ error: `Failed to fetch: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let html = await response.text();

    // Rewrite relative URLs to absolute
    html = html.replace(/href="\//g, `href="${baseUrl}/`);
    html = html.replace(/src="\//g, `src="${baseUrl}/`);
    html = html.replace(/url\(\//g, `url(${baseUrl}/`);
    
    // Rewrite relative paths without leading slash
    html = html.replace(/href="(?!http|mailto|#|javascript)/g, `href="${baseUrl}/`);
    html = html.replace(/src="(?!http|data:)/g, `src="${baseUrl}/`);

    // Inject base tag for any remaining relative URLs
    const baseTag = `<base href="${baseUrl}/" target="_self">`;
    html = html.replace(/<head>/i, `<head>${baseTag}`);

    // Remove any X-Frame-Options meta tags
    html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

    console.log(`Conducting Proxy: Successfully proxied ${targetUrl}`);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Conducting Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
