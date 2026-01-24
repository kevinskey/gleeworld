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
    const baseUrl = 'https://conducting.gleeworld.org';
    const requestUrl = new URL(req.url);
    const functionBaseUrl = `${requestUrl.origin}${requestUrl.pathname}`;

    // Support both:
    // - GET ?path=/patterns  -> returns rewritten HTML
    // - GET ?asset=/assets/... -> returns proxied static asset (JS/CSS/images)
    // - POST { path } -> backwards-compatible HTML response
    let path = '/';
    let asset: string | null = null;

    if (req.method === 'GET') {
      path = requestUrl.searchParams.get('path') ?? '/';
      asset = requestUrl.searchParams.get('asset');
    } else {
      const body = await req.json().catch(() => ({}));
      path = body?.path ?? '/';
    }

    if (asset) {
      const assetUrl = `${baseUrl}${asset}`;
      console.log(`Conducting Proxy (asset): Fetching ${assetUrl}`);

      const upstream = await fetch(assetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GleeWorldProxy/1.0)',
          'Accept': '*/*',
        },
      });

      if (!upstream.ok) {
        console.error(`Conducting Proxy (asset): Error fetching ${assetUrl}: ${upstream.status}`);
        return new Response(JSON.stringify({ error: `Failed to fetch asset: ${upstream.status}` }), {
          status: upstream.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Preserve content-type; allow cross-origin loads just in case.
      const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
      const body = await upstream.arrayBuffer();

      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          // Be explicit; some browsers are picky with module scripts.
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    }

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

    // 1) Rewrite asset URLs to be same-origin (served by this function)
    //    This avoids CORS/module-script blocking inside the iframe.
    //    Example: /assets/app.js -> {functionBaseUrl}?asset=/assets/app.js
    html = html.replace(/(href|src)="\/(assets\/[^\"\']+)"/g, `$1="${functionBaseUrl}?asset=/$2"`);
    html = html.replace(/url\(\/(assets\/[^\)]+)\)/g, `url(${functionBaseUrl}?asset=/$1)`);

    // 2) Rewrite internal navigation (SPA routes) to stay inside the proxy.
    //    Example: href="/terms" -> href="{functionBaseUrl}?path=/terms"
    html = html.replace(
      /href="\/(?!assets\/)([^\"\']*)"/g,
      (match, p1) => {
        // Keep anchors like href="/#section" and avoid double-encoding.
        const dest = `/${p1}`;
        return `href="${functionBaseUrl}?path=${encodeURIComponent(dest)}"`;
      },
    );

    // 3) Inject base tag that points to this proxy so remaining relative URLs resolve here.
    const baseTag = `<base href="${functionBaseUrl}?path=/" target="_self">`;
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
