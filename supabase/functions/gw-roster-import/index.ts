// Bulk roster import: admin uploads parsed CSV rows, each new member gets a
// Supabase auth invite email; the handle_new_user_profile trigger enrolls
// them into the caller's tenant via the tenant_slug metadata.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateCaller } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-slug",
};

interface RosterRow {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  voice_part?: string;
  class_year?: number | string;
  role?: string;
}

const ALLOWED_ROLES = ["member", "student", "graduate", "fan", "auditioner"];
const MAX_ROWS = 200;

// gw_profiles_voice_part_check allows only S1,S2,A1,A2,T1,T2,B1,B2.
function normalizeVoicePart(input?: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  const direct = v.toUpperCase().replace(/\s+/g, "");
  if (/^[SATB][12]$/.test(direct)) return direct;
  const m = v.toLowerCase().match(/^(soprano|alto|tenor|bass|baritone)\s*([12])?$/);
  if (!m) return null;
  const letter = m[1] === "baritone" ? "B" : m[1][0].toUpperCase();
  return `${letter}${m[2] ?? "1"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await authenticateCaller(req);
    if (!caller) return json({ error: "Unauthorized" }, 401);
    if (!caller.internal && !caller.isAdmin) {
      return json({ error: "Admin access required" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { rows, default_role } = (await req.json()) as {
      rows: RosterRow[];
      default_role?: string;
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ error: "rows[] required" }, 400);
    }
    if (rows.length > MAX_ROWS) {
      return json({ error: `Max ${MAX_ROWS} rows per request` }, 400);
    }

    // Tenant comes from the caller's own profile, never from the request body.
    let tenantId: string | null = null;
    let tenantSlug = "main";
    let tenantSubdomain: string | null = null;
    if (caller.userId) {
      const { data: prof } = await admin
        .from("gw_profiles")
        .select("tenant_id")
        .eq("user_id", caller.userId)
        .maybeSingle();
      tenantId = prof?.tenant_id ?? null;
      if (tenantId) {
        const { data: t } = await admin
          .from("gw_tenants")
          .select("slug, subdomain")
          .eq("id", tenantId)
          .maybeSingle();
        if (t) {
          tenantSlug = t.slug;
          tenantSubdomain = t.subdomain;
        }
      }
    }
    if (!tenantId) {
      const { data: t } = await admin
        .from("gw_tenants")
        .select("id, slug, subdomain")
        .eq("slug", "main")
        .maybeSingle();
      tenantId = t?.id ?? null;
      tenantSubdomain = t?.subdomain ?? null;
    }
    if (!tenantId) return json({ error: "Could not resolve tenant" }, 500);

    const redirectTo =
      (tenantSlug !== "main" && tenantSubdomain
        ? `https://${tenantSubdomain}.gleeworld.org`
        : "https://gleeworld.org") + "/auth?welcome=1";

    const fallbackRole = ALLOWED_ROLES.includes(default_role ?? "")
      ? default_role!
      : "member";

    const results: Array<{ email: string; status: string; message?: string }> = [];

    for (const raw of rows) {
      const email = (raw.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email: raw.email ?? "", status: "error", message: "Invalid email" });
        continue;
      }
      const role = ALLOWED_ROLES.includes((raw.role ?? "").trim().toLowerCase())
        ? (raw.role ?? "").trim().toLowerCase()
        : fallbackRole;
      const firstName = (raw.first_name ?? "").trim() || undefined;
      const lastName = (raw.last_name ?? "").trim() || undefined;
      const fullName =
        (raw.full_name ?? "").trim() ||
        [firstName, lastName].filter(Boolean).join(" ") ||
        undefined;
      const classYear = raw.class_year != null && `${raw.class_year}`.trim() !== ""
        ? parseInt(`${raw.class_year}`, 10) || null
        : null;

      try {
        let userId: string | null = null;
        let status = "invited";

        const { data: invited, error: ie } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName, tenant_slug: tenantSlug, role },
          redirectTo,
        });

        if (ie) {
          if (ie.message?.includes("already been registered") || (ie as any).code === "email_exists") {
            // Existing account — link into this tenant instead of inviting.
            const { data: existing } = await admin
              .from("gw_profiles")
              .select("user_id")
              .ilike("email", email)
              .not("user_id", "is", null)
              .limit(1)
              .maybeSingle();
            if (!existing?.user_id) {
              results.push({ email, status: "error", message: "Account exists but profile not found" });
              continue;
            }
            userId = existing.user_id;
            status = "linked";
            await admin.from("gw_tenant_members").upsert(
              { user_id: userId, tenant_id: tenantId, role },
              { onConflict: "user_id,tenant_id", ignoreDuplicates: true },
            );
          } else {
            results.push({ email, status: "error", message: ie.message });
            continue;
          }
        } else {
          userId = invited.user?.id ?? null;
        }

        let warn: string | undefined;
        if (userId) {
          const update: Record<string, unknown> = {};
          if (firstName) update.first_name = firstName;
          if (lastName) update.last_name = lastName;
          if (fullName && status === "invited") update.full_name = fullName;
          if (raw.phone?.trim()) update.phone = raw.phone.trim();
          const vp = normalizeVoicePart(raw.voice_part);
          if (vp) update.voice_part = vp;
          else if (raw.voice_part?.trim()) warn = `Unrecognized voice part "${raw.voice_part.trim()}" skipped`;
          if (classYear) update.class_year = classYear;
          if (Object.keys(update).length > 0) {
            const { error: ue } = await admin.from("gw_profiles").update(update).eq("user_id", userId);
            if (ue) warn = `Invited, but profile details failed: ${ue.message}`;
          }
        }

        results.push({ email, status, message: warn });
      } catch (e) {
        results.push({ email, status: "error", message: (e as Error).message ?? "Unknown error" });
      }
    }

    const summary = {
      invited: results.filter((r) => r.status === "invited").length,
      linked: results.filter((r) => r.status === "linked").length,
      errors: results.filter((r) => r.status === "error").length,
    };
    return json({ ok: true, summary, results });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
