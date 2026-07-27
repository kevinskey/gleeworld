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

  const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!braveKey || !deepseekKey) {
    return new Response(JSON.stringify({ error: 'Search is not configured.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { query?: string };
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400, headers: corsHeaders }); }
  const query = String(body.query ?? '').trim();
  if (!query) return new Response(JSON.stringify({ results: [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const out = await runWebSearch({ query, braveKey, deepseekKey });
    return new Response(JSON.stringify(out),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed.';
    return new Response(JSON.stringify({ error: msg }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
