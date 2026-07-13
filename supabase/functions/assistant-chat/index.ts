import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';
import { toolsForRole, toOpenAiTools, TOOL_CATALOG, type AssistantRole } from './toolCatalog.ts';
import { buildSystemPrompt } from './prompt.ts';
import { buildChatRequest, callModel, type ChatMessage } from './provider.ts';
import { executeServerTool } from './executors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MAX_TOOL_ITERATIONS = 6;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || !caller.userId) return unauthorizedResponse(corsHeaders);
  const role: AssistantRole = caller.isAdmin ? 'admin' : 'member';

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-chat';
  if (!apiKey) return json({ error: 'Assistant is not configured' }, 500);

  let body: { messages?: Array<{ role: string; content: string }>; context?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const history = (body.messages ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  ).slice(-20);
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return json({ error: 'messages must end with a user message' }, 400);
  }

  // Client constructed WITH the caller's JWT: every query below runs under RLS.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const ctx = {
    firstName: String(body.context?.firstName ?? 'there'),
    role,
    tenantName: String(body.context?.tenantName ?? 'GleeWorld'),
    activeModules: Array.isArray(body.context?.activeModules) ? body.context!.activeModules as string[] : [],
    nowIso: new Date().toISOString(),
    timezone: String(body.context?.timezone ?? 'America/New_York'),
  };

  const tools = toolsForRole(role);
  const openAiTools = toOpenAiTools(tools);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
  const actions: Array<{ tool: string; args: Record<string, unknown>; confirm: boolean }> = [];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { message } = await callModel(buildChatRequest(messages, openAiTools, model), apiKey, apiUrl);
      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return json({ reply: message.content ?? '', actions });
      }
      messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const def = tools.find((t) => t.name === tc.function.name);
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* leave empty */ }
        let result: string;
        if (!def) {
          result = JSON.stringify({ error: `Tool not available: ${tc.function.name}` });
        } else if (def.execution === 'server') {
          result = await executeServerTool(def.name, args, {
            supabase: userClient,
            youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ?? undefined,
          });
        } else {
          // Client-executed: queue it for the browser and tell the model it's underway.
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
    return json({ reply: 'That took too many steps — try breaking the request into smaller pieces.', actions });
  } catch (e) {
    console.error('assistant-chat error:', e);
    return json({ error: "I couldn't reach the assistant right now. Please try again." }, 502);
  }
});
