import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller } from '../_shared/auth.ts';
import { validateCourseSpec } from '../_shared/courseSpec.ts';
import { buildGenerationMessages, type CourseFormInput } from './prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// One model call → JSON content. No tools; DeepSeek json_object mode.
async function generateSpec(messages: Array<{ role: string; content: string }>, apiKey: string, apiUrl: string, model: string): Promise<unknown> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 4000, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`Model API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Model returned no content');
  return JSON.parse(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || (!caller.internal && !caller.userId)) return json({ error: 'Unauthorized' }, 401);
  if (!caller.internal && !caller.isAdmin) return json({ error: 'Only a director or admin can create courses.' }, 403);

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-chat';
  if (!apiKey) return json({ error: 'Course generation is not configured' }, 500);

  let input: CourseFormInput;
  try { input = (await req.json()) as CourseFormInput; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!input?.title || !input.term_start || !input.term_end || !Array.isArray(input.meeting_patterns)) {
    return json({ error: 'title, term_start, term_end, and meeting_patterns are required.' }, 400);
  }

  // Generate → validate, with one corrective retry on invalid spec.
  let spec: unknown;
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = buildGenerationMessages(input, new Date().toISOString());
    if (attempt === 1 && lastErr) messages.push({ role: 'user', content: `The previous JSON was invalid: ${lastErr}. Return a corrected CourseSpec JSON.` });
    let candidate: unknown;
    try { candidate = await generateSpec(messages, apiKey, apiUrl, model); }
    catch (e) { return json({ error: `Generation failed: ${e instanceof Error ? e.message : 'model error'}` }, 502); }
    const v = validateCourseSpec(candidate);
    if (v.ok) { spec = v.spec; break; }
    lastErr = v.error;
  }
  if (!spec) return json({ error: `Couldn't generate a valid course from those inputs — try simplifying the goals or shortening the term. (${lastErr})` }, 422);

  // Create the draft under the caller's JWT so RLS applies (same trust model as the client path).
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data, error } = await userClient.rpc('assistant_create_course', { spec });
  if (error) return json({ error: `Couldn't create the course: ${error.message}` }, 500);
  if (!data?.course_id) return json({ error: "Couldn't create the course (no confirmation returned — check permissions)." }, 500);
  return json(data);
});
