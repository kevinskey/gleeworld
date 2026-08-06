import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';
import { toolsForRole, toOpenAiTools, TOOL_CATALOG, type AssistantRole } from './toolCatalog.ts';
import { buildSystemPrompt } from './prompt.ts';
import { buildChatRequest, callModel, type ChatMessage } from './provider.ts';
import { executeServerTool, type ConciergeResult } from './executors.ts';
import { validateCourseSpec } from '../_shared/courseSpec.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Model rounds per turn. Providers that call tools one-at-a-time burn a
// round per action, so 6 exhausted on any compound request ("make a note,
// add three tasks, and schedule it") — Kevin hit the wall 2026-08-02.
// Cost stays bounded: each round is one capped (max_tokens 1000) call.
const MAX_TOOL_ITERATIONS = 12;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || !caller.userId) return unauthorizedResponse(corsHeaders);
  const role: AssistantRole = caller.isAdmin ? 'admin' : 'member';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const webSearchUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/web-search` : undefined;
  const webSearchAuthHeader = req.headers.get('Authorization') ?? undefined;

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
  // DeepSeek renamed `deepseek-chat` → `deepseek-v4-pro` / `deepseek-v4-flash`
  // and returns HTTP 400 on the old name, so any container still defaulting
  // to `deepseek-chat` fails every request with "Model API 400: The
  // supported API model names are deepseek-v4-pro or deepseek-v4-flash".
  // Default to `-pro` here for tool-calling quality; tenants can override
  // to `-flash` (cheaper/faster) via the ASSISTANT_MODEL env var.
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-v4-pro';
  if (!apiKey) return json({ error: 'Assistant is not configured' }, 500);

  let body: {
    messages?: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
    thread_id?: string;
    new_thread?: boolean;
  };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  // Client constructed WITH the caller's JWT: every query below runs under RLS.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  // === Thread resolution (Layer 2: persistent chat) ==================
  // Three ways in:
  //   1. Client passed a valid thread_id → load its history from the DB.
  //   2. Client passed thread_id but it's stale/foreign/deleted → treat as
  //      no-thread and create a new one (don't 400 the user off — the
  //      localStorage they had may just point at a deleted thread).
  //   3. Client passed nothing (or new_thread: true) → create a new thread.
  // If the client also passed `messages`, we take only the LAST user message
  // as the current turn — the DB is now the source of truth for history.
  let threadId: string | null = null;
  let dbHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (!body.new_thread && typeof body.thread_id === 'string' && body.thread_id.length > 0) {
    const { data: existing } = await userClient
      .from('gw_assistant_threads')
      .select('id')
      .eq('id', body.thread_id)
      .maybeSingle();
    if (existing) {
      threadId = existing.id;
      const { data: msgs } = await userClient
        .from('gw_assistant_messages')
        .select('role, content, created_at')
        .eq('thread_id', threadId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: true })
        .limit(30);
      dbHistory = (msgs ?? [])
        .filter((m) => typeof m.content === 'string' && m.content.length > 0)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
    }
  }
  if (!threadId) {
    const { data: created } = await userClient
      .from('gw_assistant_threads')
      .insert({ user_id: caller.userId })
      .select('id')
      .single();
    threadId = created?.id ?? null;
    // If insert failed (RLS mis-config, etc.), we still serve the turn —
    // just without persistence. Better than 500ing on a chat.
  }

  // Latest user message from the client (they always send at least this).
  const clientHistory = (body.messages ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  );
  const latestUser = clientHistory[clientHistory.length - 1];
  if (!latestUser || latestUser.role !== 'user') {
    return json({ error: 'messages must end with a user message' }, 400);
  }

  // Server-side truth: prior DB history + latest client user turn.
  // Capped at 20 to bound prompt size; DB stores everything, we only feed
  // the tail to the model.
  const history = [...dbHistory, { role: 'user' as const, content: latestUser.content }].slice(-20);

  // Pull the caller's profile server-side so the model has stable, fresh
  // facts about them on every turn — the client only sends firstName + tz
  // and we don't want a stale bundle to be the reason the assistant calls
  // someone by their first initial or forgets they're a bass. RLS scopes
  // this to their own row; a missing row (fresh signup, no gw_profiles
  // yet) just falls back to whatever the client passed.
  let profile: {
    full_name?: string | null;
    role?: string | null;
    voice_part?: string | null;
    class_year?: string | null;
    home_address?: string | null;
  } | null = null;
  try {
    const { data } = await userClient
      .from('gw_profiles')
      .select('full_name, role, voice_part, class_year, home_address')
      .eq('user_id', caller.userId)
      .maybeSingle();
    profile = (data as typeof profile) ?? null;
  } catch { /* ignore — the assistant still works with fallback context */ }
  /**
   * Profile fields are coerced with String() before trimming.
   *
   * `(value ?? '').trim()` assumes every column is text. class_year is an
   * INTEGER, so for the two accounts that have one this threw
   * "((intermediate value) ?? '').trim is not a function" and took down the
   * entire assistant request — every question, typed or spoken, for those
   * users only. It survived unnoticed because the accounts used for testing
   * have no class year.
   *
   * Coercing all of them rather than only the integer one: the next column
   * to change type should not be able to do this again.
   */
  const text = (value: unknown): string => (value == null ? '' : String(value).trim());

  const homeAddress = text(profile?.home_address) || undefined;

  const fullName = text(profile?.full_name);
  const inferredFirst = fullName.split(/\s+/)[0] || '';
  // Coarse geolocation, if the client got permission from the browser.
  // Server just passes lat/lng through to the prompt; the model uses
  // them when calling find_nearby_place. Silently absent when denied.
  const rawGeo = body.context?.geo as { lat?: unknown; lng?: unknown } | undefined;
  const geo = rawGeo && typeof rawGeo.lat === 'number' && typeof rawGeo.lng === 'number'
    ? { lat: rawGeo.lat, lng: rawGeo.lng }
    : undefined;
  // Page list the client's build actually ships (from navCatalog). Sanitized
  // hard: model-visible strings from the request body. Cap 100 entries so a
  // hostile client can't balloon the prompt.
  const rawTargets = body.context?.navTargets;
  const navTargets = Array.isArray(rawTargets)
    ? rawTargets
        .filter((t): t is { key: unknown; label: unknown } => !!t && typeof t === 'object')
        .map((t) => ({ key: String(t.key ?? '').slice(0, 60), label: String(t.label ?? '').slice(0, 60) }))
        .filter((t) => /^[a-z0-9-]+$/.test(t.key) && t.label.length > 0)
        .slice(0, 100)
    : undefined;
  const ctx = {
    firstName: inferredFirst || String(body.context?.firstName ?? 'there'),
    fullName: fullName || undefined,
    tenantRole: text(profile?.role) || undefined,
    voicePart: text(profile?.voice_part) || undefined,
    classYear: text(profile?.class_year) || undefined,
    role,
    tenantName: String(body.context?.tenantName ?? 'GleeWorld'),
    activeModules: Array.isArray(body.context?.activeModules) ? body.context!.activeModules as string[] : [],
    nowIso: new Date().toISOString(),
    timezone: String(body.context?.timezone ?? 'America/New_York'),
    geo,
    navTargets,
  };

  const tools = toolsForRole(role);
  const openAiTools = toOpenAiTools(tools);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
  const actions: Array<{ tool: string; args: Record<string, unknown>; confirm: boolean }> = [];
  let resultsPanel: ConciergeResult | undefined = undefined;

  // Persist the user's turn immediately so we don't lose it if the model
  // call fails downstream. The assistant reply is saved once we have it.
  // If threadId is null (persistence disabled by an insert failure), these
  // are no-ops.
  const persistUserTurn = async () => {
    if (!threadId) return;
    await userClient.from('gw_assistant_messages').insert({
      thread_id: threadId,
      user_id: caller.userId,
      role: 'user',
      content: latestUser.content,
    });
    // First user message in an empty thread becomes the thread title so
    // the picker can show something recognizable. Truncated so it doesn't
    // eat the row.
    if (dbHistory.length === 0) {
      const title = latestUser.content.slice(0, 80).trim();
      await userClient.from('gw_assistant_threads').update({ title }).eq('id', threadId);
    }
  };
  const persistAssistantReply = async (reply: string) => {
    if (!threadId || !reply) return;
    await userClient.from('gw_assistant_messages').insert({
      thread_id: threadId,
      user_id: caller.userId,
      role: 'assistant',
      content: reply,
    });
  };
  await persistUserTurn();

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { message } = await callModel(buildChatRequest(messages, openAiTools, model), apiKey, apiUrl);
      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const reply = message.content ?? '';
        // Empty replies are ONLY legal on action turns (silent-action UX).
        // The model over-applied the rule to plain conversation ("how are
        // you today" → empty → the client renders dead silence, which
        // users read as "assistant not reachable" — Kevin, iOS, 08-03).
        // Give it one corrective nudge; if it stays silent, fall through
        // with a minimal honest reply rather than nothing.
        if (!reply.trim() && actions.length === 0) {
          messages.push({ role: 'assistant', content: '' });
          messages.push({
            role: 'user',
            content: 'Your last message was empty but you queued no action this turn. Empty replies are only allowed when you actually performed a UI action. Answer the user now in one or two sentences.',
          });
          continue;
        }
        await persistAssistantReply(reply);
        return json({ reply, actions, resultsPanel, thread_id: threadId });
      }
      messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const def = tools.find((t) => t.name === tc.function.name);
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* leave empty */ }
        let result: string = JSON.stringify({ error: `Unhandled execution type for tool ${def?.name ?? 'unknown'}` });
        if (!def) {
          result = JSON.stringify({ error: `Tool not available: ${tc.function.name}` });
        } else if (def.execution === 'server') {
          const toolOut = await executeServerTool(def.name, args, {
            supabase: userClient,
            youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ?? undefined,
            googleMapsApiKey: Deno.env.get('GOOGLE_MAPS_API_KEY') ?? undefined,
            homeAddress,
            webSearchUrl,
            webSearchAuthHeader,
          });
          result = toolOut.replyJson;
          // Multi-tool iterations: last non-undefined panel wins. The panel is a UI
          // surface, not an accumulator — the client shows one card at a time.
          if (toolOut.resultsPanel) resultsPanel = toolOut.resultsPanel;
        } else {
          // Client-executed: queue it for the browser and tell the model it's underway.
          if (def.name === 'create_course_draft') {
            const v = validateCourseSpec(args.spec);
            if (!v.ok) {
              // Feed the structured error back so the model can fix the spec —
              // never queue a confirm card for a spec the RPC would reject.
              messages.push({ role: 'tool', content: JSON.stringify({ error: v.error }), tool_call_id: tc.id });
              continue;
            }
          }
          actions.push({ tool: def.name, args, confirm: def.confirm });
          result = JSON.stringify(
            def.confirm
              ? { status: 'pending_user_confirmation', note: 'Tell the user you have prepared this and they must confirm the card to send it.' }
              : { status: 'queued_on_client', note: 'Tell the user this is being done now.' },
          );
        }
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
      }
    }
    // Tool budget exhausted. Don't scold-and-discard: every action queued so
    // far still runs on the client, so ask the model — WITHOUT tools — to
    // tell the user what got done and what's left. Static fallback only if
    // even that plain completion fails.
    let timeoutReply = "That was a big request — I finished part of it. Ask me to continue and I'll pick up the rest.";
    try {
      messages.push({
        role: 'user',
        content: 'You have used your tool budget for this turn. Do not call any more tools. In one or two sentences, tell the user what you completed and what remains, and suggest they say "continue" to finish the rest.',
      });
      const { message } = await callModel(buildChatRequest(messages, [], model), apiKey, apiUrl);
      if (message.content?.trim()) timeoutReply = message.content;
    } catch { /* keep the static fallback */ }
    await persistAssistantReply(timeoutReply);
    return json({ reply: timeoutReply, actions, resultsPanel, thread_id: threadId });
  } catch (e) {
    console.error('assistant-chat error:', e);
    // Intentionally no resultsPanel here — the model crashed mid-turn; the
    // client keeps whatever panel it last showed and moves on with the next
    // successful turn.
    return json({ error: "I couldn't reach the assistant right now. Please try again." }, 502);
  }
});
