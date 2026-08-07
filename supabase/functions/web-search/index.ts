import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';
import { runWebSearch } from './runWebSearch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: corsHeaders });

  const caller = await authenticateCaller(req);
  if (!caller?.userId) return unauthorizedResponse(corsHeaders);

  // A search provider is required; the summarizer is not. Requiring both meant
  // an unset Brave key — which is how this shipped — turned every question into
  // "Search is not configured" even though results were perfectly obtainable.
  // Empty strings count as unset: the droplet had BRAVE_SEARCH_API_KEY defined
  // but blank, which passes a truthiness check on the name alone.
  const braveKey = (Deno.env.get('BRAVE_SEARCH_API_KEY') ?? '').trim() || undefined;
  const firecrawlKey = (Deno.env.get('FIRECRAWL_API_KEY') ?? '').trim() || undefined;
  const deepseekKey = (Deno.env.get('DEEPSEEK_API_KEY') ?? '').trim() || undefined;
  if (!braveKey && !firecrawlKey) {
    return new Response(JSON.stringify({ error: 'Search is not configured.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { query?: string };
  try { body = await req.json(); } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const query = String(body.query ?? '').trim();
  if (!query) return new Response(JSON.stringify({ results: [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const deepseekModel = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-v4-pro';
  try {
    const out = await runWebSearch({ query, braveKey, firecrawlKey, deepseekKey, deepseekModel });
    return new Response(JSON.stringify(out),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed.';
    return new Response(JSON.stringify({ error: msg }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
