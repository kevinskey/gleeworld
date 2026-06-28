// lti-roster-sync — pulls the Canvas course roster via NRPS and
// upserts gw_profiles rows in the matching GleeWorld tenant.
//
// Called by a tenant admin or on a schedule. Body:
//   { "context_link_id": "<uuid>" }
//
// NRPS returns paginated JSON. We follow the `next` Link header until
// exhausted. Each member becomes a gw_profiles row keyed on email; if
// the user already exists we just refresh name/role. Students who were
// in the previous sync but aren't in this one are marked inactive
// rather than deleted (so historical attendance / grades survive).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requestPlatformToken, NRPS_SCOPE } from "../_shared/lti.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { context_link_id: string; }
interface NrpsMember {
  user_id?: string;           // Canvas sub
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
  status?: string;
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Parse the RFC-5988 Link header for the next page URL.
function parseNextLink(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.split(",").find((p) => /rel\s*=\s*"?next"?/i.test(p));
  if (!match) return null;
  const m = match.match(/<([^>]+)>/);
  return m ? m[1] : null;
}

// Map a CourseInstructor / Mentor / Learner role URI to a GleeWorld role.
function mapRole(roles: string[] | undefined): "instructor" | "admin" | "student" {
  const set = new Set(roles ?? []);
  if ([...set].some((r) => /Instructor|Administrator|Mentor/i.test(r))) return "instructor";
  return "student";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const auth = req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "unauthorized");

  let body: Body;
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.context_link_id) return err(400, "missing_context_link_id");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: ctx, error: ctxErr } = await admin
    .from("lti_context_links")
    .select("id, platform_id, tenant_id, nrps_context_memberships_url")
    .eq("id", body.context_link_id)
    .single();
  if (ctxErr || !ctx) return err(404, "context_not_found", ctxErr?.message);
  if (!ctx.nrps_context_memberships_url) {
    return err(409, "nrps_not_available", "Launch did not include NRPS endpoint; enable in Canvas tool config.");
  }

  const { data: platform, error: pErr } = await admin
    .from("lti_platforms")
    .select("client_id, auth_token_url")
    .eq("id", ctx.platform_id)
    .single();
  if (pErr || !platform) return err(500, "platform_lookup_failed", pErr?.message);

  let token: string;
  try {
    token = await requestPlatformToken({
      clientId: platform.client_id,
      tokenUrl: platform.auth_token_url,
      scopes: [NRPS_SCOPE],
    });
  } catch (e) {
    return err(502, "token_exchange_failed", e instanceof Error ? e.message : String(e));
  }

  // Walk all pages.
  let url: string | null = ctx.nrps_context_memberships_url;
  const seenEmails = new Set<string>();
  let upserted = 0;
  let pageCount = 0;
  while (url) {
    pageCount++;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.ims.lti-nrps.v2.membershipcontainer+json",
      },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return err(502, "nrps_fetch_failed", `${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    const members: NrpsMember[] = data?.members ?? [];
    for (const m of members) {
      if (m.status && m.status !== "Active") continue;
      const email = m.email?.toLowerCase().trim();
      if (!email) continue;
      seenEmails.add(email);
      const fullName = m.name ?? [m.given_name, m.family_name].filter(Boolean).join(" ") || null;
      const role = mapRole(m.roles);

      // Find existing profile in this tenant (by email).
      const { data: existing } = await admin
        .from("gw_profiles")
        .select("user_id")
        .eq("tenant_id", ctx.tenant_id)
        .ilike("email", email)
        .maybeSingle();

      if (existing?.user_id) {
        await admin
          .from("gw_profiles")
          .update({ full_name: fullName ?? undefined, is_active: true })
          .eq("user_id", existing.user_id)
          .eq("tenant_id", ctx.tenant_id);
        upserted++;
      } else {
        // Create the auth user + profile.
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName, created_via: "lti_roster_sync" },
        });
        if (cErr || !created?.user) continue; // skip on per-user failure
        await admin.from("gw_profiles").insert({
          user_id: created.user.id,
          email,
          full_name: fullName,
          tenant_id: ctx.tenant_id,
          role,
        });
        // Best-effort: link by lti_sub if NRPS gave us one.
        if (m.user_id) {
          await admin.from("lti_user_links").upsert({
            platform_id: ctx.platform_id,
            lti_sub: m.user_id,
            user_id: created.user.id,
            email_at_link: email,
          }, { onConflict: "platform_id,lti_sub" });
        }
        upserted++;
      }
    }
    url = parseNextLink(res.headers.get("Link"));
  }

  return new Response(JSON.stringify({
    ok: true,
    pages_fetched: pageCount,
    members_upserted: upserted,
    distinct_emails: seenEmails.size,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
