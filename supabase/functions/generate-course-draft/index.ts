import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller } from '../_shared/auth.ts';
import { validateCourseSpec, type CourseSpec } from '../_shared/courseSpec.ts';
import { buildGenerationMessages, type CourseFormInput } from './prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Model-authored free text is prose, not markup — tags are stripped
// (never escaped) so the sink downstream can keep using them as plain
// text safely. This guards CourseModules.tsx's dangerouslySetInnerHTML
// on module.description against a prompt-injection payload (e.g. an
// <img onerror=...> smuggled through a free-text course goal) since no
// HTML sanitizer (DOMPurify or otherwise) exists in this repo yet.
// NOTE: the assistant-chat path feeds the same sink and is NOT covered
// by this — see final-fix-report.md follow-up.
const stripTags = (v: unknown): string => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : v as string);

function sanitizeSpecText(spec: CourseSpec): CourseSpec {
  for (const m of spec.modules ?? []) {
    if (m.title !== undefined) m.title = stripTags(m.title);
    if (m.description !== undefined) m.description = stripTags(m.description);
    if (Array.isArray(m.learning_objectives)) {
      m.learning_objectives = m.learning_objectives.map(stripTags);
    }
    for (const a of m.assignments ?? []) {
      if (a.title !== undefined) a.title = stripTags(a.title);
      if (a.instructions !== undefined) a.instructions = stripTags(a.instructions);
      if (a.description !== undefined) a.description = stripTags(a.description);
    }
  }
  if (spec.rubric) {
    if (spec.rubric.title !== undefined) spec.rubric.title = stripTags(spec.rubric.title);
    if (spec.rubric.description !== undefined) spec.rubric.description = stripTags(spec.rubric.description);
    for (const c of spec.rubric.criteria ?? []) {
      if (c.name !== undefined) c.name = stripTags(c.name);
      if (c.description !== undefined) c.description = stripTags(c.description);
    }
  }
  return spec;
}

// One model call → JSON content. No tools; DeepSeek json_object mode.
async function generateSpec(messages: Array<{ role: string; content: string }>, apiKey: string, apiUrl: string, model: string): Promise<unknown> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 8000, response_format: { type: 'json_object' } }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Model API ${res.status}: ${raw.slice(0, 200)}`);
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error(`Model API returned a non-JSON body: ${raw.slice(0, 150)}`); }
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  const finish = choice?.finish_reason ?? 'unknown';
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(`Model returned empty content (finish_reason=${finish})`);
  }
  if (finish === 'length') {
    throw new Error('The generated course was too long and got cut off — try fewer weeks or simpler goals.');
  }
  try { return JSON.parse(content); }
  catch { throw new Error(`Model returned malformed JSON (finish_reason=${finish}, ${content.length} chars)`); }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || (!caller.internal && !caller.userId)) return json({ error: 'Unauthorized' }, 401);
  if (!caller.internal) {
    // Course-editor gate mirrors the DB's is_course_editor() (migration
    // 20260713220000): is_admin/is_super_admin OR role in the editor set.
    // Deliberately NOT caller.isAdmin / ADMIN_ROLES from _shared/auth.ts —
    // that list excludes 'instructor' and 'super_admin', which would 403
    // this form's primary users even though the RPC would accept them.
    const svc = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: prof } = await svc
      .from('gw_profiles')
      .select('role, is_admin, is_super_admin')
      .eq('user_id', caller.userId as string)
      .maybeSingle();
    const EDITOR_ROLES = ['admin', 'super_admin', 'super-admin', 'executive', 'instructor'];
    const isEditor = !!(prof?.is_admin || prof?.is_super_admin || EDITOR_ROLES.includes(prof?.role || ''));
    if (!isEditor) return json({ error: 'Only an instructor, director, or admin can create courses.' }, 403);
  }

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
  spec = sanitizeSpecText(spec as CourseSpec);

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
