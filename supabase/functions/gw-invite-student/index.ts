// gw-invite-student — creates an auth user via service role, marks them in
// gw_profiles with the requested role, optionally enrolls in a course, and —
// unless sendEmail:false — emails a magic link so the recipient lands signed
// in without needing to set a password. With sendEmail:false the account and
// tenant membership are still created; the person just isn't emailed (they
// sign in later with their email via magic link or password reset).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  email: string;
  fullName?: string;
  full_name?: string; // snake_case alias — what the People page sends
  role?: string; // clamped to ALLOWED_ROLES; anything else becomes 'student'
  sendEmail?: boolean; // default true; false = create account + membership, no email
  courseId?: string;
  tenantId?: string; // server resolves if missing
  invitedBy?: string;
  appOrigin?: string; // e.g., https://blackmusicscholar.academy
  orgName?: string;
}

// This endpoint runs service-role. Never let a caller-supplied role reach
// admin/super_admin — promotion stays a deliberate act in the Edit dialog.
const ALLOWED_ROLES = new Set(["student", "instructor", "fan"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as InvitePayload;
    if (!body.email) throw new Error("email is required");
    const role = ALLOWED_ROLES.has(String(body.role || "").toLowerCase()) ? String(body.role).toLowerCase() : "student";
    const fullName = (body.fullName || body.full_name || "").trim() || null;
    const sendEmail = body.sendEmail !== false;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 0. Resolve tenant_id early so we can enforce the plan's student cap
    //    BEFORE creating any auth/profile state. (The post-link block
    //    further down does the same resolution; this duplicates the
    //    minimum needed for the cap check so we fail fast on over-cap.)
    let preflightTenantId: string | undefined = body.tenantId;
    if (!preflightTenantId && body.courseId) {
      const { data: c } = await supabase.from("gw_courses").select("tenant_id").eq("id", body.courseId).maybeSingle();
      if (c?.tenant_id) preflightTenantId = c.tenant_id;
    }
    if (!preflightTenantId && body.appOrigin) {
      try {
        const host = new URL(body.appOrigin).hostname.replace(/^www\./, "");
        const slugGuess = host.split(".")[0];
        const { data: t } = await supabase.from("gw_tenants").select("id").eq("slug", slugGuess).maybeSingle();
        if (t?.id) preflightTenantId = t.id;
      } catch { /* ignore */ }
    }

    // Plan cap enforcement. Skip when:
    //   • tenant_id couldn't be resolved (no plan to check)
    //   • the email is already a student in this tenant (re-invite,
    //     no new seat consumed)
    //   • the tenant has no paid plan (free trials and unconfigured
    //     workspaces aren't blocked)
    //   • the plan's student_cap is null (Institution tier = unlimited;
    //     verified 2026-07-04 against the reseeded gw_billing_plans rows —
    //     gw_tenant_plan_usage joins bp.student_cap generically by plan_id
    //     so it picks up institution's NULL cap with no code change, and
    //     the `u.student_cap !== null` guard below already treats NULL as
    //     "don't block". See docs/superpowers/runbooks/
    //     2026-07-04-tier-launch-runbook.md for the verification query.)
    if (preflightTenantId) {
      const emailLower = body.email.toLowerCase().trim();
      const { data: existingProfile } = await supabase
        .from("gw_profiles")
        .select("user_id")
        .eq("tenant_id", preflightTenantId)
        .ilike("email", emailLower)
        .maybeSingle();
      if (!existingProfile) {
        const { data: usage } = await supabase.rpc("gw_tenant_plan_usage", { p_tenant_id: preflightTenantId });
        const u = Array.isArray(usage) && usage.length ? usage[0] : null;
        if (u && u.student_cap !== null && u.current_students >= u.student_cap) {
          return new Response(
            JSON.stringify({
              error: "plan_student_cap_reached",
              detail: `Your ${u.plan_id ?? "current"} plan is capped at ${u.student_cap} students (currently ${u.current_students}). Upgrade your plan in Workspace Settings to add more.`,
              plan_id: u.plan_id,
              current_students: u.current_students,
              student_cap: u.student_cap,
              upgrade_url: body.appOrigin ? `${body.appOrigin.replace(/\/+$/, "")}/dashboard/workspace?tab=plan` : "/dashboard/workspace?tab=plan",
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // 1. Generate a magic link (creates user if doesn't exist).
    // The link lands on /auth/callback which handles "new user → onboarding,
    // existing user → ?next" routing.
    const origin = (body.appOrigin || "").replace(/\/+$/, "");
    // Where the student ends up AFTER filling out their profile.
    let dest = "/academy";
    let courseTitle = ""; // used in the email subject + body
    if (body.courseId) {
      // Look up the course_code AND title so we can deep-link to the
      // class page and address the student by the class name in the
      // invite email. Slug convention matches CourseShell's URL parser:
      // lowercase + spaces → hyphens. e.g. "GLEE 000" → "glee-000".
      const { data: c } = await supabase
        .from("gw_courses")
        .select("course_code, title")
        .eq("id", body.courseId)
        .maybeSingle();
      if (c?.course_code) {
        const slug = String(c.course_code).toLowerCase().replace(/\s+/g, "-");
        dest = `/academy/c/${slug}`;
      }
      if (c?.title) courseTitle = String(c.title);
    }
    // Invited students arrive signed in via the magic link. Because the invite
    // pre-creates their gw_profiles row, AuthCallback would treat them as an
    // existing user and drop them straight on the class/landing page, skipping
    // the profile form. Route them through /onboarding first to fill out their
    // profile, then on to their course/academy (Onboarding honors ?next=).
    const next = `/onboarding?next=${encodeURIComponent(dest)}`;
    const redirectTo = origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;

    // Call GoTrue's admin endpoint directly. The supabase-js SDK nests
    // redirectTo under `options`, but GoTrue's admin/generate_link
    // expects `redirect_to` at the top level — when it's nested,
    // GoTrue silently falls back to SITE_URL (no path, no query), so
    // the magic link redirects to `https://gleeworld.org/` instead of
    // `/auth/callback?next=…` and the user sees a hung "Signing you in…".
    const goTrueUrl = `${Deno.env.get("SUPABASE_URL") ?? ""}/auth/v1/admin/generate_link`;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const linkRes = await fetch(goTrueUrl, {
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
    const actionLink: string | undefined = linkData?.action_link
      ?? linkData?.properties?.action_link;
    const userId: string | undefined = linkData?.user?.id
      ?? linkData?.id;
    if (!actionLink || !userId) {
      throw new Error("No action_link or user_id returned from generate_link");
    }

    // 2. Resolve tenant_id — needed for both profile and tenant membership so
    //    storage/RLS work for the new user.
    let tenantId: string | undefined = body.tenantId;
    if (!tenantId && body.courseId) {
      const { data: c } = await supabase.from("gw_courses").select("tenant_id").eq("id", body.courseId).maybeSingle();
      if (c?.tenant_id) tenantId = c.tenant_id;
    }
    if (!tenantId && origin) {
      // Derive slug from hostname: blackmusicscholar.academy → 'blackmusicscholar'
      try {
        const host = new URL(origin).hostname.replace(/^www\./, "");
        const slugGuess = host.split(".")[0];
        const { data: t } = await supabase.from("gw_tenants").select("id").eq("slug", slugGuess).maybeSingle();
        if (t?.id) tenantId = t.id;
      } catch {}
    }

    // 3. Ensure profile row exists with the requested role. Existing profiles
    //    are never role-changed or name-clobbered by a re-invite — we only
    //    backfill a missing full_name.
    const { data: existingByUserId } = await supabase
      .from("gw_profiles")
      .select("user_id, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existingByUserId) {
      await supabase.from("gw_profiles").insert({
        user_id: userId,
        email: body.email,
        full_name: fullName,
        role,
        tenant_id: tenantId,
      });
    } else if (fullName && !existingByUserId.full_name) {
      await supabase.from("gw_profiles").update({ full_name: fullName }).eq("user_id", userId);
    }

    // 4. Ensure tenant membership so the JWT hook injects tenant_id on next
    //    sign-in. DO NOTHING on conflict — a re-invite must not rewrite the
    //    role of someone who was since promoted.
    if (tenantId) {
      await supabase.from("gw_tenant_members").upsert(
        { user_id: userId, tenant_id: tenantId, role },
        { onConflict: "user_id,tenant_id", ignoreDuplicates: true }
      );
    }

    // 3. Optionally enroll in course. Service-role inserts skip the JWT-based
    //    tenant_id trigger, so set it explicitly here.
    if (body.courseId) {
      await supabase.from("gw_course_enrollments").insert({
        course_id: body.courseId,
        user_id: userId,
        role: "student",
        enrollment_status: "enrolled",
        tenant_id: tenantId,
      });
    }

    if (sendEmail) {
      // 4. Resolve the tenant's display name for the invite copy. Prefer an explicit
      //    orgName from the caller, else the tenant's branding org_name, else a generic.
      let tenantName = (body.orgName || "").replace(/[<>"]/g, "").trim();
      if (!tenantName && tenantId) {
        const { data: brand } = await supabase
          .from("gw_branding_settings")
          .select("org_name")
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (brand?.org_name) tenantName = String(brand.org_name).replace(/[<>"]/g, "").trim();
      }
      if (!tenantName) tenantName = "your music program";

      // 5. Send invite email via Resend.
      const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
      // Sender shows the tenant's name (the actual address stays on our verified
      // gleeworld.org domain so Resend will deliver).
      const safeFromName = tenantName || "Your music program";
      // Always: "You're invited to join {Class} on {Tenant}". When the invite isn't
      // tied to a specific class, fall back to just the tenant name.
      const joining = courseTitle ? `${courseTitle} on ${tenantName}` : tenantName;
      const subject = `You're invited to join ${joining}`;
      const html = `
        <div style="font-family:sans-serif;max-width:600px;padding:24px;">
          <h2 style="color:#1a1a1a;">You're invited to join ${escapeHtml(joining)}.</h2>
          <p>Click the link below to accept your invitation and sign in — no password needed.</p>
          <p><a href="${actionLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accept invitation &amp; sign in</a></p>
          <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this link: ${actionLink}</p>
        </div>
      `;
      const { error: emailErr } = await resend.emails.send({
        from: `${safeFromName} <noreply@gleeworld.org>`,
        to: [body.email],
        subject,
        html,
      });
      if (emailErr) throw new Error(`Email send failed: ${emailErr.message ?? "unknown"}`);
    }

    // 5. Log the invite/add (best-effort — the table may reject unknown
    //    statuses; that must never fail the request).
    try {
      await supabase.from("gw_student_invites").insert({
        email: body.email,
        full_name: fullName,
        course_id: body.courseId || null,
        invited_by: body.invitedBy || null,
        tenant_id: body.tenantId || undefined,
        status: sendEmail ? "sent" : "added",
        sent_at: new Date().toISOString(),
      });
    } catch {}

    return new Response(JSON.stringify({ success: true, userId, email: body.email, emailSent: sendEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
