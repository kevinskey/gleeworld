// gw-course-enroll — the ONE endpoint both /join/:code and
// /academy/:courseCode/onboarding call. Handles two callers with one
// contract, so role, enrollment_status, and course-resolution semantics
// stay identical no matter which path invoked it.
//
// Modes (auto-detected from the request shape):
//
//   Public "join-by-code" flow (JoinCourse.tsx)
//     Body: { joinCode, email, fullName?, appOrigin?, orgName? }
//     No Authorization header (or an anon one).
//     → Resolve course by join_code.
//     → Create the user via GoTrue admin (if new) + magic-link email
//       via Resend so they land signed-in on /welcome?next=<class>.
//     → Enroll them in the course.
//     → Response: { invitationSent: true, courseSlug, alreadyEnrolled }.
//
//   Authenticated "one-click enroll" flow (CourseOnboarding.tsx)
//     Body: { courseCode?, courseId? }
//     Authorization: Bearer <user JWT>.
//     → Resolve course by code or id.
//     → Insert enrollment for the JWT-owner (idempotent on 23505).
//     → No email; no magic link.
//     → Response: { enrolled: true, alreadyEnrolled, courseSlug }.
//
// Both modes share:
//   • role='student' + enrollment_status='enrolled' defaults
//   • tenant resolution from the course's tenant_id (source of truth)
//   • plan-cap enforcement via gw_tenant_plan_usage (skipped when the
//     user is already a member of the tenant — reinvites don't consume
//     a seat)
//   • idempotent enrollment upsert (23505 → alreadyEnrolled: true)
//
// gw-invite-student stays alive for admin bulk-invite paths that need
// the tenantId/invitedBy control surface; do NOT collapse it in here.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollPayload {
  // Course selectors — provide EXACTLY ONE.
  joinCode?: string;
  courseId?: string;
  courseCode?: string;
  // Public-flow-only fields (ignored when Authorization is present):
  email?: string;
  fullName?: string;
  appOrigin?: string;
  orgName?: string;
}

interface CourseRow {
  id: string;
  course_code: string | null;
  title: string | null;
  tenant_id: string;
}

const ENROLL_DEFAULTS = { role: "student" as const, enrollment_status: "enrolled" as const };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as EnrollPayload;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRole);

    // ── 1. Resolve the course ──────────────────────────────────────────
    const course = await resolveCourse(admin, body);
    if (!course) return jsonError(404, "course_not_found", "No matching course for the provided identifier.");

    const courseSlug = (course.course_code ?? "").toLowerCase().replace(/\s+/g, "-");
    const tenantId = course.tenant_id;

    // ── 2. Authenticated caller? Direct-enroll and return. ─────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const authedUserId = bearer ? await resolveUserFromJwt(admin, bearer) : null;

    if (authedUserId) {
      const seatCheck = await enforcePlanCap(admin, tenantId, authedUserId);
      if (seatCheck.blocked) return seatCheck.response;
      const { alreadyEnrolled } = await upsertEnrollment(admin, {
        courseId: course.id,
        userId: authedUserId,
        tenantId,
      });
      return json200({
        enrolled: true,
        alreadyEnrolled,
        invitationSent: false,
        courseSlug,
        courseTitle: course.title ?? null,
      });
    }

    // ── 3. Public "join by code" flow — need email. ────────────────────
    if (!body.email) return jsonError(400, "email_required", "Sign in first, or provide an email to invite.");

    const seatCheck = await enforcePlanCapByEmail(admin, tenantId, body.email);
    if (seatCheck.blocked) return seatCheck.response;

    // Generate a magic link that lands on /auth/callback → /welcome
    // → the course slug. Same routing as gw-invite-student so returning
    // students see a consistent flow no matter which endpoint invited them.
    const origin = (body.appOrigin || "").replace(/\/+$/, "");
    const dest = courseSlug ? `/academy/c/${courseSlug}` : "/academy";
    const next = `/welcome?next=${encodeURIComponent(dest)}`;
    const redirectTo = origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;

    // Direct GoTrue admin call — the supabase-js SDK nests redirect_to
    // under options, but GoTrue expects it at the top level. See
    // gw-invite-student for the incident that produced this note.
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: body.email,
        ...(redirectTo ? { redirect_to: redirectTo } : {}),
      }),
    });
    if (!linkRes.ok) {
      const text = await linkRes.text().catch(() => "");
      throw new Error(`Magic link failed: ${linkRes.status} ${text}`);
    }
    const linkData = await linkRes.json();
    const actionLink: string | undefined = linkData?.action_link ?? linkData?.properties?.action_link;
    const userId: string | undefined = linkData?.user?.id ?? linkData?.id;
    if (!actionLink || !userId) throw new Error("No action_link or user_id from generate_link");

    // Profile + tenant membership so the JWT hook picks up tenant_slug
    // on their first sign-in.
    await admin.from("gw_profiles").upsert(
      {
        user_id: userId,
        email: body.email,
        full_name: body.fullName || null,
        role: ENROLL_DEFAULTS.role,
        tenant_id: tenantId,
      },
      { onConflict: "user_id" },
    );
    await admin.from("gw_tenant_members").upsert(
      { user_id: userId, tenant_id: tenantId, role: ENROLL_DEFAULTS.role },
      { onConflict: "user_id,tenant_id" },
    );

    const { alreadyEnrolled } = await upsertEnrollment(admin, {
      courseId: course.id,
      userId,
      tenantId,
    });

    // Email delivery. Sender name is the tenant so the recipient's
    // inbox reads "Black Music Scholar" not "GleeWorld".
    let tenantName = (body.orgName || "").replace(/[<>"]/g, "").trim();
    if (!tenantName) {
      const { data: brand } = await admin
        .from("gw_branding_settings")
        .select("org_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (brand?.org_name) tenantName = String(brand.org_name).replace(/[<>"]/g, "").trim();
    }
    if (!tenantName) tenantName = "your music program";

    const joining = course.title ? `${course.title} on ${tenantName}` : tenantName;
    const subject = `You're invited to join ${joining}`;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;padding:24px;">
        <h2 style="color:#1a1a1a;">You're invited to join ${escapeHtml(joining)}.</h2>
        <p>Click the link below to accept your invitation and sign in — no password needed.</p>
        <p><a href="${actionLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accept invitation &amp; sign in</a></p>
        <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this link: ${actionLink}</p>
      </div>
    `;
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
    const { error: emailErr } = await resend.emails.send({
      from: `${tenantName || "Your music program"} <noreply@gleeworld.org>`,
      to: [body.email],
      subject,
      html,
    });
    if (emailErr) throw new Error(`Email send failed: ${emailErr.message ?? "unknown"}`);

    // Best-effort audit trail; mirrors gw-invite-student so the two
    // paths land the same row shape in gw_student_invites.
    try {
      await admin.from("gw_student_invites").insert({
        email: body.email,
        full_name: body.fullName || null,
        course_id: course.id,
        tenant_id: tenantId,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    } catch { /* non-fatal */ }

    return json200({
      enrolled: true,
      alreadyEnrolled,
      invitationSent: true,
      courseSlug,
      courseTitle: course.title ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(400, "enrollment_failed", msg);
  }
});

// ── helpers ───────────────────────────────────────────────────────────

async function resolveCourse(
  admin: ReturnType<typeof createClient>,
  body: EnrollPayload,
): Promise<CourseRow | null> {
  const cols = "id, course_code, title, tenant_id";
  if (body.courseId) {
    const { data } = await admin.from("gw_courses").select(cols).eq("id", body.courseId).maybeSingle();
    return (data as CourseRow | null) ?? null;
  }
  if (body.joinCode) {
    const { data } = await admin
      .from("gw_courses")
      .select(cols)
      .eq("join_code", body.joinCode.trim().toUpperCase())
      .maybeSingle();
    return (data as CourseRow | null) ?? null;
  }
  if (body.courseCode) {
    // Accept "MUS 070", "MUS-070", "mus-070" — normalize before lookup.
    const raw = body.courseCode.trim();
    const dashed = raw.replace(/\s+/g, "-").toUpperCase();
    const spaced = raw.replace(/-+/g, " ").toUpperCase();
    for (const candidate of [dashed, spaced, raw]) {
      const { data } = await admin
        .from("gw_courses")
        .select(cols)
        .eq("course_code", candidate)
        .maybeSingle();
      if (data) return data as CourseRow;
    }
    // Last-ditch ilike (matches whatever the code column casing happens to be).
    const { data } = await admin
      .from("gw_courses")
      .select(cols)
      .ilike("course_code", raw)
      .maybeSingle();
    return (data as CourseRow | null) ?? null;
  }
  return null;
}

async function resolveUserFromJwt(
  admin: ReturnType<typeof createClient>,
  jwt: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}

async function upsertEnrollment(
  admin: ReturnType<typeof createClient>,
  input: { courseId: string; userId: string; tenantId: string },
): Promise<{ alreadyEnrolled: boolean }> {
  const { error } = await admin.from("gw_course_enrollments").insert({
    course_id: input.courseId,
    user_id: input.userId,
    tenant_id: input.tenantId,
    role: ENROLL_DEFAULTS.role,
    enrollment_status: ENROLL_DEFAULTS.enrollment_status,
  });
  if (error) {
    // 23505 = unique_violation on (course_id, user_id). Idempotent.
    if ((error as { code?: string }).code === "23505") return { alreadyEnrolled: true };
    throw error;
  }
  return { alreadyEnrolled: false };
}

/** Enforce plan student cap against a JWT-owner. Skipped when the user
 *  is already a member of the tenant (reinvite / already-a-student). */
async function enforcePlanCap(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
  userId: string,
): Promise<{ blocked: false } | { blocked: true; response: Response }> {
  const { data: existing } = await admin
    .from("gw_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { blocked: false };
  return checkPlanCap(admin, tenantId);
}

/** Plan cap check when we only have the email (public join flow). */
async function enforcePlanCapByEmail(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
  email: string,
): Promise<{ blocked: false } | { blocked: true; response: Response }> {
  const { data: existing } = await admin
    .from("gw_profiles")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .ilike("email", email.toLowerCase().trim())
    .maybeSingle();
  if (existing) return { blocked: false };
  return checkPlanCap(admin, tenantId);
}

async function checkPlanCap(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
): Promise<{ blocked: false } | { blocked: true; response: Response }> {
  const { data: usage } = await admin.rpc("gw_tenant_plan_usage", { p_tenant_id: tenantId });
  const u = Array.isArray(usage) && usage.length ? usage[0] : null;
  if (!u || u.student_cap === null || u.current_students < u.student_cap) return { blocked: false };
  return {
    blocked: true,
    response: new Response(
      JSON.stringify({
        error: "plan_student_cap_reached",
        detail: `This program's ${u.plan_id ?? "current"} plan is capped at ${u.student_cap} students (currently ${u.current_students}). The director will need to upgrade the plan before you can enroll.`,
        plan_id: u.plan_id,
        current_students: u.current_students,
        student_cap: u.student_cap,
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    ),
  };
}

function json200(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, code: string, detail: string): Response {
  return new Response(JSON.stringify({ error: code, detail }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
