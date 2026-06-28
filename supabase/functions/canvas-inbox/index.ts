// canvas-inbox — Canvas Conversations (inbox) operations.
//
// Body (list):       { action: 'list', scope?: 'inbox'|'sent'|'archived'|'unread' }
// Body (get):        { action: 'get', conversation_id }
// Body (create):     { action: 'create', recipient_ids: number[], body, subject?, context_code? }
// Body (reply):      { action: 'reply', conversation_id, body }
// Body (search):     { action: 'search', q, context_code? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCanvasClientForTenant } from "../_shared/canvas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    const padded = part + "===".slice((part.length + 3) % 4);
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ACTIONS = new Set(["list", "get", "create", "reply", "search"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");
  const payload = decodeJwtPayload(jwt);
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id ?? (payload as any)?.app_metadata?.tenant_id;
  // deno-lint-ignore no-explicit-any
  const userId = (payload as any)?.sub;
  if (!tenantId || !userId) return err(400, "no_tenant_or_user_in_jwt");

  let body: {
    action?: string; scope?: string; conversation_id?: number;
    recipient_ids?: number[]; body?: string; subject?: string;
    context_code?: string; q?: string;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.action || !ACTIONS.has(body.action)) return err(400, "bad_action");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const resolved = await getCanvasClientForTenant(admin, tenantId);
  if (!resolved) return err(409, "canvas_not_bound");

  const { data: profile } = await admin
    .from("gw_profiles").select("canvas_user_id").eq("user_id", userId).maybeSingle();
  if (!profile?.canvas_user_id) return err(409, "canvas_user_not_provisioned");

  const cuid = profile.canvas_user_id;
  const c = resolved.client;

  try {
    if (body.action === "list") {
      const scope = (body.scope as "inbox" | "sent" | "archived" | "unread") ?? "inbox";
      const list = await c.listConversations(cuid, scope);
      return new Response(JSON.stringify({
        ok: true,
        conversations: list.map((cv) => ({
          id: cv.id,
          subject: cv.subject ?? null,
          last_message: cv.last_message ?? null,
          last_message_at: cv.last_message_at ?? null,
          message_count: cv.message_count,
          workflow_state: cv.workflow_state,
          starred: !!cv.starred,
          participants: cv.participants.map((p) => ({
            id: p.id, name: p.name, avatar_url: p.avatar_url ?? null,
          })),
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "get") {
      if (!body.conversation_id) return err(400, "missing_conversation_id");
      const cv = await c.getConversation(body.conversation_id, cuid);
      return new Response(JSON.stringify({
        ok: true,
        conversation: {
          id: cv.id,
          subject: cv.subject ?? null,
          messages: cv.messages.map((m) => ({
            id: m.id, author_id: m.author_id, created_at: m.created_at, body: m.body,
          })),
          participants: cv.participants.map((p) => ({
            id: p.id, name: p.name, avatar_url: p.avatar_url ?? null,
          })),
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "create") {
      if (!body.recipient_ids?.length || !body.body?.trim()) return err(400, "missing_fields");
      const result = await c.createConversation({
        asUserId: cuid,
        recipientIds: body.recipient_ids,
        body: body.body.trim(),
        subject: body.subject?.trim(),
        contextCode: body.context_code,
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "reply") {
      if (!body.conversation_id || !body.body?.trim()) return err(400, "missing_fields");
      const result = await c.addConversationMessage({
        conversationId: body.conversation_id, asUserId: cuid, body: body.body.trim(),
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "search") {
      if (!body.q?.trim()) return new Response(JSON.stringify({ ok: true, recipients: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const recipients = await c.searchRecipients({
        asUserId: cuid, search: body.q.trim(), contextCode: body.context_code,
      });
      return new Response(JSON.stringify({
        ok: true,
        recipients: recipients.map((r) => ({
          id: r.id, name: r.name, type: r.type ?? null, avatar_url: r.avatar_url ?? null,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
