// Public intake — the single write path for anonymous appointment bookings
// and audition submissions.
//
// INTENTIONALLY UNAUTHENTICATED. Every other edge function calls
// authenticateCaller(); this one must not, because its whole purpose is to
// serve visitors with no session. FUNCTIONS_VERIFY_JWT is false in
// production, so the rate limit in handleIntake is the only protection this
// endpoint has. Do not remove it.
//
// All decision logic lives in _shared/publicIntake.ts so it can be tested
// under vitest. This file supplies real I/O and nothing else.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleIntake,
  type IntakeDeps,
  type IntakeInput,
  type IntakeAccount,
} from "../_shared/publicIntake.ts";
import { resolveTenantBranding } from "../_shared/tenantBranding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-slug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const HTTP_STATUS: Record<string, number> = {
  rate_limited: 429,
  invalid_input: 400,
  unavailable: 409,
  no_active_session: 409,
  write_failed: 500,
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST." }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "invalid_input", message: "Malformed request." }, 400);
  }

  const account = (body.account ?? {}) as IntakeAccount;
  const kind = body.kind === "appointment" ? "appointment" : "audition";
  const sourceIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const input: IntakeInput = {
    kind,
    tenantSlug:
      (typeof body.tenantSlug === "string" ? body.tenantSlug : null) ||
      req.headers.get("x-tenant-slug"),
    sourceIp,
    account,
    payload: (body.payload ?? {}) as Record<string, unknown>,
  };

  // Resolves a tenant's branding row by slug. Named and pulled out of the
  // `deps` object below because inlined as a nested arrow it reads as one
  // long unreadable expression (two queries chained through a subselect).
  async function brandingQuery(slug: string) {
    const { data: tenant } = await admin
      .from("gw_tenants").select("id").eq("slug", slug).maybeSingle();
    if (!tenant) return null;
    const { data } = await admin
      .from("gw_branding_settings")
      .select("tenant_id, org_name, welcome_sms_template")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    return data ?? null;
  }

  const deps: IntakeDeps = {
    async countRecentAttempts(email, ip) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [byEmail, byIp] = await Promise.all([
        admin.from("gw_public_intake_attempts")
          .select("id", { count: "exact", head: true })
          .eq("email", email).gte("created_at", since),
        admin.from("gw_public_intake_attempts")
          .select("id", { count: "exact", head: true })
          .eq("source_ip", ip).gte("created_at", since),
      ]);
      return { email: byEmail.count ?? 0, ip: byIp.count ?? 0 };
    },

    async recordAttempt(email, ip) {
      await admin.from("gw_public_intake_attempts").insert({ email, source_ip: ip });
    },

    async preflight(inp) {
      if (inp.kind === "audition") {
        const { data } = await admin
          .from("audition_sessions").select("id").eq("is_active", true).limit(1);
        if (!data || data.length === 0) {
          return {
            ok: false, reason: "no_active_session",
            message: "No active audition session found. Please contact administration.",
          };
        }
        return { ok: true };
      }
      // Appointment: the service must exist and be active, and the slot free.
      const serviceId = inp.payload.serviceId as string;
      const { data: svc } = await admin
        .from("gw_services").select("id, duration_minutes")
        .eq("id", serviceId).eq("is_active", true).maybeSingle();
      if (!svc) {
        return { ok: false, reason: "unavailable", message: "That service is no longer available." };
      }
      const { data: avail } = await admin.rpc("check_appointment_availability", {
        p_service_id: serviceId,
        p_appointment_date: inp.payload.appointmentDate,
        p_start_time: inp.payload.startTime,
        p_duration_minutes: svc.duration_minutes,
      });
      if (!avail?.available) {
        return {
          ok: false, reason: "unavailable",
          message: avail?.error ?? "That time was just taken. Please pick another.",
        };
      }
      return { ok: true };
    },

    async findUserByEmail(email) {
      // gw_profiles mirrors auth.users and is directly queryable by email,
      // which avoids paging the admin user list.
      const { data } = await admin
        .from("gw_profiles").select("user_id").ilike("email", email).maybeSingle();
      return data?.user_id ? { id: data.user_id } : null;
    },

    async createAccount(acct, tenantSlug) {
      const { data, error } = await admin.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        // Auto-confirm: the confirmation-link round trip is exactly what
        // stranded visitors in the old flow. They receive a confirmation
        // email moments later regardless.
        email_confirm: true,
        user_metadata: {
          full_name: `${acct.firstName} ${acct.lastName}`.trim(),
          phone: acct.phone ?? null,
          signup_context: "public_intake",
          tenant_slug: tenantSlug,
        },
      });
      if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
      return { id: data.user.id };
    },

    async deleteAccount(userId) {
      await admin.auth.admin.deleteUser(userId);
    },

    async writeRecord(inp, userId) {
      if (inp.kind === "appointment") {
        const { data, error } = await admin.rpc("book_appointment", {
          p_service_id: inp.payload.serviceId,
          p_appointment_date: inp.payload.appointmentDate,
          p_start_time: inp.payload.startTime,
          p_customer_name: `${inp.account.firstName} ${inp.account.lastName}`.trim(),
          p_customer_email: inp.account.email,
          p_customer_phone: inp.account.phone ?? null,
          p_attendee_count: 1,
          p_special_requests: (inp.payload.notes as string) ?? null,
        });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error ?? "Booking failed");
        // book_appointment sets created_by = auth.uid(), which is NULL under
        // the service role. Point it at the person who actually booked so the
        // appointment shows up on their dashboard.
        await admin.from("gw_appointments")
          .update({ created_by: userId }).eq("id", data.appointment_id);
        return { id: data.appointment_id as string };
      }

      const { data: sessions } = await admin
        .from("audition_sessions").select("id").eq("is_active", true).limit(1);
      const { data, error } = await admin
        .from("audition_applications")
        .insert({ ...(inp.payload.application as Record<string, unknown>),
                  user_id: userId, session_id: sessions![0].id, status: "submitted" })
        .select("id").single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    branding: (tenantSlug) => resolveTenantBranding(brandingQuery, tenantSlug),

    async sendEmail({ to, kind, recordId, input: inp }) {
      const fn = kind === "audition"
        ? "send-audition-confirmation-email"
        : "send-booking-confirmation-email";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ recordId, to, tenantSlug: inp.tenantSlug, payload: inp.payload }),
      });
      if (!res.ok) throw new Error(`email fn ${res.status}`);
    },

    async sendSms({ to, body: smsBody }) {
      // gw-send-sms requires an authenticated caller; the service-role key
      // resolves to { internal: true } in _shared/auth.ts.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ to, message: smsBody }),
      });
      if (!res.ok) throw new Error(`sms fn ${res.status}`);
    },

    log(event, detail) {
      console.log(`[public-intake] ${event}`, JSON.stringify(detail));
    },
  };

  const result = await handleIntake(deps, input);
  return json(result, result.ok ? 200 : (HTTP_STATUS[result.reason] ?? 400));
});
