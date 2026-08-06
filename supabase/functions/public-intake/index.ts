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
  resolveAttemptCounts,
  assertNoPgError,
  lookupUserByEmail,
  pickAuditionApplicationFields,
  type IntakeDeps,
  type IntakeInput,
  type IntakeAccount,
  type IntakeKind,
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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// Shapes raw, untrusted JSON into a safe IntakeAccount. handleIntake already
// checks email format and password length, but it assumes the fields it's
// handed exist and are strings — `input.account.email.trim()` on a missing
// or non-string email throws before handleIntake's own try block, on a
// deliberately unauthenticated endpoint anyone can hit with `{}`. That must
// never happen past this function.
function toIntakeAccount(raw: unknown): IntakeAccount | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  if (
    !isNonEmptyString(a.email) ||
    !isNonEmptyString(a.password) ||
    !isNonEmptyString(a.firstName) ||
    !isNonEmptyString(a.lastName)
  ) {
    return null;
  }
  return {
    email: a.email,
    password: a.password,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: typeof a.phone === "string" && a.phone.trim() ? a.phone : null,
  };
}

// send-audition-confirmation-email has its own existing callers (the
// authenticated audition-application flow) and expects
// { applicationId, applicantName, applicantEmail, auditionDate, auditionTime,
// auditionLocation } — not the { recordId, to, tenantSlug, payload } shape
// public-intake uses for send-booking-confirmation-email. Adapt on this side
// rather than moving the sibling's contract. `inp.payload.application` is
// exactly what writeRecord inserts into audition_applications, so it already
// carries full_name / email / audition_time_slot in that table's column
// names.
function buildAuditionEmailBody(recordId: string, inp: IntakeInput) {
  const application = (inp.payload.application ?? {}) as Record<string, unknown>;
  const fullName = isNonEmptyString(application.full_name)
    ? application.full_name
    : `${inp.account.firstName} ${inp.account.lastName}`.trim();
  const applicantEmail = isNonEmptyString(application.email)
    ? application.email
    : inp.account.email;
  const slotRaw = application.audition_time_slot;
  const slot = isNonEmptyString(slotRaw) ? new Date(slotRaw) : null;
  const validSlot = slot && !Number.isNaN(slot.getTime()) ? slot : null;

  return {
    applicationId: recordId,
    applicantName: fullName,
    applicantEmail,
    auditionDate: validSlot ? validSlot.toISOString().split("T")[0] : "",
    auditionTime: validSlot
      ? validSlot.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      : "",
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST." }, 405);

  // Everything below can throw on malformed input or a transient dependency
  // failure. This endpoint has no auth gate, so a thrown, uncaught error
  // inside `serve`'s handler produces Deno's default error Response — which
  // carries none of `corsHeaders` — turning a clean 4xx/5xx into an opaque
  // CORS failure in the browser. Nothing may escape this try without going
  // through `json()`.
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, reason: "invalid_input", message: "Malformed request." }, 400);
    }

    if (body.kind !== "appointment" && body.kind !== "audition") {
      return json(
        { ok: false, reason: "invalid_input", message: "Unrecognized submission type." },
        400,
      );
    }
    const kind: IntakeKind = body.kind;

    const account = toIntakeAccount(body.account);
    if (!account) {
      return json(
        {
          ok: false,
          reason: "invalid_input",
          message: "Please provide your first name, last name, email, and a password.",
        },
        400,
      );
    }

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

    // C3/C4: resolve the tenant ONCE, up front, from the caller-supplied
    // slug — never trust it bare. The service-role client below carries no
    // x-tenant-slug header of its own, so every query it makes is otherwise
    // tenant-blind: current_tenant_id() returns NULL for a service-role
    // caller and the anon fallback reads a header that was never forwarded.
    // Without this, gw_services and audition_sessions lookups (below) would
    // silently match ANY tenant's rows rather than this request's tenant.
    // A submission whose tenant cannot be resolved is rejected outright —
    // there is no safe default to fall back to.
    if (!input.tenantSlug) {
      return json(
        {
          ok: false,
          reason: "invalid_input",
          message: "This site is not configured for public submissions. Please contact the organization directly.",
        },
        400,
      );
    }
    const { data: tenantRow } = await admin
      .from("gw_tenants").select("id").eq("slug", input.tenantSlug).maybeSingle();
    if (!tenantRow?.id) {
      return json(
        {
          ok: false,
          reason: "invalid_input",
          message: "This site is not configured for public submissions. Please contact the organization directly.",
        },
        400,
      );
    }
    const tenantId: string = tenantRow.id;

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
        // C1: resolveAttemptCounts throws on either query's error instead of
        // defaulting to 0 — a missing gw_public_intake_attempts table (the
        // literal state before this feature's migration is applied) must
        // fail the submission closed, not silently disable the rate limit.
        return resolveAttemptCounts(byEmail, byIp);
      },

      async recordAttempt(email, ip) {
        const result = await admin.from("gw_public_intake_attempts").insert({ email, source_ip: ip });
        // C1: the insert's error was previously discarded entirely. A
        // failure here means this attempt is invisible to every future
        // count, so it must fail the whole submission rather than proceed
        // as if the attempt had been recorded.
        assertNoPgError(result, "recordAttempt");
      },

      async preflight(inp) {
        if (inp.kind === "audition") {
          // C4: scoped to the resolved tenant. Unscoped, this matched
          // whichever tenant's session sorted first — a visitor on a
          // tenant with no audition process of its own would silently
          // attach to a stranger tenant's session instead of being
          // rejected.
          const { data } = await admin
            .from("audition_sessions").select("id")
            .eq("is_active", true).eq("tenant_id", tenantId).limit(1);
          if (!data || data.length === 0) {
            return {
              ok: false, reason: "no_active_session",
              message: "No active audition session found. Please contact administration.",
            };
          }
          return { ok: true };
        }
        // Appointment: the service must exist, be active, and belong to
        // THIS tenant, and the slot free. The tenant check is what stops a
        // visitor on tenant A from booking a service that belongs to
        // tenant B (gw_services has no RLS restricting an anon-facing
        // lookup by id alone).
        const serviceId = inp.payload.serviceId as string;
        const { data: svc } = await admin
          .from("gw_services").select("id, duration_minutes")
          .eq("id", serviceId).eq("is_active", true).eq("tenant_id", tenantId).maybeSingle();
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
        // which avoids paging the admin user list. I1: this MUST be an
        // exact match — lookupUserByEmail's type only exposes `.eq(...)`,
        // so this call site cannot regress to `.ilike(...)` (which treats
        // `%`/`_` in attacker-supplied input as LIKE wildcards, letting
        // e.g. `victi_@example.com` resolve to victim@example.com).
        return lookupUserByEmail(admin.from("gw_profiles").select("user_id"), email);
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
          // appointment shows up on their dashboard. Best-effort: the booking
          // itself is already real, so a failure here must not fail the
          // submission — but it must not vanish silently either, or the
          // visitor sees success while their appointment never appears on
          // their dashboard with nothing logged to explain why.
          const { error: createdByError } = await admin
            .from("gw_appointments")
            .update({ created_by: userId }).eq("id", data.appointment_id);
          if (createdByError) {
            deps.log("created_by_update_failed", {
              appointmentId: data.appointment_id,
              userId,
              error: createdByError.message,
            });
          }
          return { id: data.appointment_id as string };
        }

        // C4: same tenant scoping as preflight — re-checked here rather
        // than trusted from preflight's result, since the two run in
        // separate requests to the DB with a real (if narrow) gap between
        // them.
        const { data: sessions } = await admin
          .from("audition_sessions").select("id")
          .eq("is_active", true).eq("tenant_id", tenantId).limit(1);
        if (!sessions || sessions.length === 0) {
          // Preflight already confirmed a session was active; this only fires
          // if it went inactive in the gap between preflight and write. Named
          // so the write_failed log line says what actually happened instead
          // of a bare "Cannot read properties of undefined".
          throw new Error("audition_session_no_longer_active");
        }
        // I2: only the columns the real audition form submits are ever
        // written. `inp.payload.application` is attacker-controlled JSON —
        // spreading it directly would let a crafted request set `status`,
        // `user_id`, `session_id`, or any other column audition_applications
        // happens to have. user_id/session_id/status are set explicitly
        // below and always win regardless of what pickAuditionApplicationFields
        // lets through.
        //
        // audition_applications has no tenant_id column (verified against
        // every migration that touches this table — see
        // .superpowers/sdd/2026-08-06-public-tenant-intake/final-fix-report.md,
        // C3), so none is set here. The row's tenant is established
        // transitively through session_id, which preflight and this
        // function both just confirmed belongs to `tenantId`.
        const { data, error } = await admin
          .from("audition_applications")
          .insert({
            ...pickAuditionApplicationFields((inp.payload.application ?? {}) as Record<string, unknown>),
            user_id: userId,
            session_id: sessions[0].id,
            status: "submitted",
          })
          .select("id").single();
        if (error) throw new Error(error.message);
        return { id: data.id as string };
      },

      branding: (tenantSlug) => resolveTenantBranding(brandingQuery, tenantSlug),

      async sendEmail({ to, kind, recordId, input: inp }) {
        // The two sibling functions have different, pre-existing request
        // shapes. send-booking-confirmation-email was written for this
        // feature and matches { recordId, to, tenantSlug, payload } exactly.
        // send-audition-confirmation-email already has a caller in the
        // authenticated audition-application flow (src/utils/
        // sendAuditionConfirmationEmail.ts) and expects
        // { applicationId, applicantName, applicantEmail, auditionDate,
        // auditionTime, auditionLocation? } — its contract must not move, so
        // the adapting happens here.
        const fn = kind === "audition"
          ? "send-audition-confirmation-email"
          : "send-booking-confirmation-email";
        const requestBody = kind === "audition"
          ? buildAuditionEmailBody(recordId, inp)
          : { recordId, to, tenantSlug: inp.tenantSlug, payload: inp.payload };
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(requestBody),
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
  } catch (err) {
    // Last resort: handleIntake itself always resolves and every dep call
    // inside it is already covered by its own try, so reaching here means
    // something in this wrapper threw (bad input shaping, a rejected
    // fetch/db call made outside handleIntake, etc.). Whatever it was, the
    // response must still carry corsHeaders — that's the entire point of
    // this catch.
    console.error("[public-intake] unhandled_error", err);
    return json(
      {
        ok: false,
        reason: "unavailable",
        message: "We could not process your submission right now. Please try again.",
      },
      500,
    );
  }
});
