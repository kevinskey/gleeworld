// Concierge web search: Google Programmable Search results + a DeepSeek-written
// AI answer grounded in those results (same provider/model as assistant-chat).
// Powers the search section of /dashboard/concierge so members can search the
// web without leaving GleeWorld.
//
// Env (droplet: /opt/supabase — mapped into the functions container):
//   GOOGLE_CSE_API_KEY  Google API key with "Custom Search API" enabled
//                       (falls back to GOOGLE_SEARCH_API_KEY)
//   GOOGLE_CSE_ID       Programmable Search Engine ID (cx) configured to
//                       "search the entire web"
//   DEEPSEEK_API_KEY    AI answer (ASSISTANT_MODEL / ASSISTANT_API_URL
//                       override the model/endpoint, as in assistant-chat)
//
// Degrades gracefully: missing Google keys -> results: [] with
// searchConfigured: false; missing DeepSeek key -> answer: null with
// aiConfigured: false. The page renders whatever half is available.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateCaller, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const caller = await authenticateCaller(req);
  if (!caller) return unauthorizedResponse(corsHeaders);

  try {
    const { query } = await req.json();
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleKey = Deno.env.get('GOOGLE_CSE_API_KEY') || Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const googleCx = Deno.env.get('GOOGLE_CSE_ID');
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');

    let results: WebResult[] = [];
    let searchConfigured = Boolean(googleKey && googleCx);

    if (searchConfigured) {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', googleKey!);
      url.searchParams.set('cx', googleCx!);
      url.searchParams.set('q', q);
      url.searchParams.set('num', '8');
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        results = (data.items || []).map((item: any) => ({
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || '',
          displayLink: item.displayLink || '',
        }));
      } else {
        console.error('Google CSE error:', res.status, await res.text());
        searchConfigured = false;
      }
    }

    let answer: string | null = null;
    const aiConfigured = Boolean(deepseekKey);

    if (aiConfigured) {
      try {
        const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
        const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-v4-pro';
        const sources = results.length
          ? results.map((r, i) => `[${i + 1}] ${r.title}\n${r.link}\n${r.snippet}`).join('\n\n')
          : '(no web results available)';
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekKey}` },
          body: JSON.stringify({
            model,
            max_tokens: 600,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  'You answer web searches for members of GleeWorld, a choir management app. ' +
                  'Give a direct, concise answer to the query, grounded in the provided web results when they are relevant. ' +
                  'Cite sources inline as [1], [2] matching the numbered results. If the results are unhelpful, answer from ' +
                  'general knowledge and say so. Keep it under 200 words. Plain prose, no headers.',
              },
              { role: 'user', content: `Query: ${q}\n\nWeb results:\n${sources}` },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          answer = data?.choices?.[0]?.message?.content ?? null;
        } else {
          console.error('DeepSeek error:', res.status, (await res.text()).slice(0, 300));
        }
      } catch (err) {
        // AI answer is an enhancement — return web results even if the model fails.
        console.error('AI answer error:', err);
      }
    }

    return new Response(
      JSON.stringify({ query: q, answer, results, searchConfigured, aiConfigured }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in concierge-search:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
