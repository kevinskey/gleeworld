// Songwriting AI assist: verifies the caller, checks the tenant's
// songwriting entitlement, rate-limits per user, proxies to DeepSeek,
// and logs usage to gw_songwriting_ai_logs (rate-limit counter + cost
// ledger). DEEPSEEK_API_KEY only ever lives here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MODEL = 'deepseek-chat'
const RATE_LIMIT = 200          // calls
const RATE_WINDOW_MIN = 15      // minutes

type FeatureSpec = {
  build: (p: Record<string, unknown>) => { system: string; user: string } | { error: string }
  temperature: number
  maxTokens: number
  inputPreview: (p: Record<string, unknown>) => string
}

// ⬇ Ported verbatim from ~/songwriter/server/routes/ai.js — one entry per
// route, system/user strings and temperature/maxTokens unchanged. The
// `build` fn returns {error} for the same 400-validations the old routes
// did (e.g. rhymes without `word`). All six old routes pass
// `responseFormat: 'json'` to callAI, so every feature here is JSON mode —
// no `jsonMode` flag needed (see porting note in the task brief).
const FEATURES: Record<string, FeatureSpec> = {
  // Rhymes for a word (with optional context + style) — ai.js L55-83
  rhymes: {
    temperature: 0.7,
    maxTokens: 600,
    inputPreview: (p) => String(p.word ?? ''),
    build: (p) => {
      const word = p.word as string | undefined
      if (!word) return { error: 'word is required' }
      const context = (p.context as string) ?? ''
      const style = (p.style as string) ?? ''
      const system = `You are a songwriter's rhyme assistant. Return diverse, useful rhymes — mix perfect rhymes, near rhymes (slant/assonance), and multi-syllable rhymes. Prefer rhymes that fit the song's mood.

Output STRICT JSON:
{
  "perfect": ["word1", "word2", ...],
  "near": ["word1", "word2", ...],
  "multi": ["two word", "multi syllable", ...]
}
Give 8-12 options per category when possible. No explanations.`
      const user = `Word: ${word}
${context ? `Line context: ${context}\n` : ''}${style ? `Song style/mood: ${style}` : ''}`
      return { system, user }
    },
  },

  // Suggest the next line given previous lines — ai.js L84-113 (route
  // 'next-line' renamed 'next_line')
  next_line: {
    temperature: 0.9,
    maxTokens: 500,
    inputPreview: (p) => (Array.isArray(p.previous_lines) ? (p.previous_lines as unknown[]).join(' / ') : ''),
    build: (p) => {
      const previous_lines = Array.isArray(p.previous_lines) ? (p.previous_lines as string[]) : []
      if (previous_lines.length === 0) return { error: 'previous_lines array is required' }
      const section_type = (p.section_type as string) ?? 'verse'
      const style = (p.style as string) ?? ''
      const count = (p.count as number) ?? 3
      const system = `You are a songwriting co-writer. Given prior lines of a ${section_type}, suggest the next line.
Match the meter, rhyme scheme, and emotional tone. Do NOT repeat or paraphrase existing lines.

Output STRICT JSON: { "suggestions": ["line 1", "line 2", "line 3"] }
Give ${count} distinct suggestions. Lyrics only — no quotes, no numbering, no commentary.`
      const user = `Style/mood: ${style || 'not specified'}
Previous lines:
${previous_lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Write ${count} options for the next line.`
      return { system, user }
    },
  },

  // Synonyms for a word, grouped by register/tone — ai.js L114-143
  synonyms: {
    temperature: 0.7,
    maxTokens: 600,
    inputPreview: (p) => String(p.word ?? ''),
    build: (p) => {
      const word = p.word as string | undefined
      if (!word) return { error: 'word is required' }
      const context = (p.context as string) ?? ''
      const style = (p.style as string) ?? ''
      const system = `You are a songwriter's thesaurus. Given a word, suggest alternatives grouped by register so the writer can match the song's voice. Keep meaning close — no off-topic words.

Output STRICT JSON:
{
  "common": ["everyday alternatives", ...],
  "vivid": ["sensory/concrete words", ...],
  "poetic": ["formal/literary/elevated words", ...],
  "phrases": ["multi-word alternatives", ...]
}
Give 6-10 options per category when possible. No explanations.`
      const user = `Word: ${word}
${context ? `Line context: ${context}\n` : ''}${style ? `Song style/mood: ${style}` : ''}`
      return { system, user }
    },
  },

  // Sensory word bank — words across the five senses for a topic/feeling —
  // ai.js L144-174
  sensory: {
    temperature: 0.8,
    maxTokens: 700,
    inputPreview: (p) => String(p.topic ?? ''),
    build: (p) => {
      const topic = p.topic as string | undefined
      if (!topic) return { error: 'topic is required' }
      const context = (p.context as string) ?? ''
      const style = (p.style as string) ?? ''
      const system = `You are a songwriter's sensory dictionary. Given a topic, feeling, or scene, suggest concrete, specific words for each of the five senses so the writer can "show, not tell."

Output STRICT JSON:
{
  "sight": ["specific visual words/phrases", ...],
  "sound": ["specific aural words/phrases", ...],
  "touch": ["tactile/temperature/texture words", ...],
  "taste": ["taste words/phrases", ...],
  "smell": ["scent words/phrases", ...]
}
Give 6-10 options per sense when relevant. Skip senses that don't fit (return empty array). Prefer evocative single words and short phrases over abstract concepts.`
      const user = `Topic: ${topic}
${context ? `Line context: ${context}\n` : ''}${style ? `Song style/mood: ${style}` : ''}`
      return { system, user }
    },
  },

  // Related concepts — thematically associated words (motifs, imagery,
  // props) — ai.js L175-204
  related: {
    temperature: 0.8,
    maxTokens: 700,
    inputPreview: (p) => String(p.word ?? ''),
    build: (p) => {
      const word = p.word as string | undefined
      if (!word) return { error: 'word is required' }
      const context = (p.context as string) ?? ''
      const style = (p.style as string) ?? ''
      const system = `You are a songwriter's concept web. Given a word, return thematically associated words: objects, motifs, places, actions, and feelings that share imagery or live in the same world. NOT synonyms — associations. Example: "ocean" → "anchor, salt, tide, lighthouse, drift, undertow."

Output STRICT JSON:
{
  "objects": ["concrete things in this world", ...],
  "places": ["settings/locations", ...],
  "actions": ["verbs that fit", ...],
  "feelings": ["emotions/states tied to this concept", ...]
}
Give 6-10 per category when relevant. Prefer specific, image-rich words.`
      const user = `Word: ${word}
${context ? `Line context: ${context}\n` : ''}${style ? `Song style/mood: ${style}` : ''}`
      return { system, user }
    },
  },

  // Rewrite a specific line — ai.js L205-229
  rewrite: {
    temperature: 0.85,
    maxTokens: 400,
    inputPreview: (p) => String(p.line ?? ''),
    build: (p) => {
      const line = p.line as string | undefined
      if (!line) return { error: 'line is required' }
      const instruction = (p.instruction as string) ?? 'make it stronger'
      const context = (p.context as string) ?? ''
      const count = (p.count as number) ?? 3
      const system = `You are a songwriting editor. Rewrite the given line per the instruction. Keep roughly the same syllable count unless the instruction says otherwise. Preserve the line's function in the song.

Output STRICT JSON: { "rewrites": ["version 1", "version 2", "version 3"] }
Give ${count} distinct rewrites. Lyrics only.`
      const user = `Context: ${context || 'none'}
Original line: ${line}
Instruction: ${instruction}`
      return { system, user }
    },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) return json({ error: 'AI not configured' }, 500)

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const claims = await verifyJwtClaims(token)
    if (!claims) return json({ error: 'invalid_token' }, 401)
    const tenantId = claims.tenant_id as string | undefined
    const userId = claims.sub as string
    if (!tenantId) return json({ error: 'JWT missing tenant_id' }, 401)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Entitlement: active/trial subscription row (or starter tier).
    const { data: mod } = await sb.from('gw_billing_modules')
      .select('tier').eq('id', 'songwriting').maybeSingle()
    if (mod?.tier !== 'starter') {
      const { data: sub } = await sb.from('gw_tenant_subscriptions')
        .select('status, current_period_end')
        .eq('tenant_id', tenantId).eq('module_id', 'songwriting').maybeSingle()
      const live = sub && ['active', 'trial'].includes(sub.status) &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
      if (!live) return json({ error: 'songwriting_not_enabled' }, 403)
    }

    // Rate limit: RATE_LIMIT calls per RATE_WINDOW_MIN per user.
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString()
    const { count } = await sb.from('gw_songwriting_ai_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', since)
    if ((count ?? 0) >= RATE_LIMIT) {
      return json({ error: 'Too many AI requests. Try again in a few minutes.' }, 429)
    }

    const { feature, payload = {} } = await req.json()
    const spec = FEATURES[feature as string]
    if (!spec) return json({ error: 'unknown feature' }, 422)
    const built = spec.build(payload)
    if ('error' in built) return json({ error: built.error }, 422)

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: built.system },
          { role: 'user', content: built.user },
        ],
        temperature: spec.temperature,
        max_tokens: spec.maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    if (!dsRes.ok) return json({ error: 'AI provider error' }, 502)
    const ds = await dsRes.json()
    const raw = ds.choices?.[0]?.message?.content ?? ''
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return json({ error: 'Failed to parse AI response' }, 502) }

    await sb.from('gw_songwriting_ai_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      feature,
      input_preview: spec.inputPreview(payload).slice(0, 300),
      output_preview: raw.slice(0, 300),
      prompt_tokens: ds.usage?.prompt_tokens ?? null,
      completion_tokens: ds.usage?.completion_tokens ?? null,
    })
    return json(parsed)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
