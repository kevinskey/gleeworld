// gw-invite-student — creates an auth user via service role, marks them as a
// student in gw_profiles, optionally enrolls in a course, and emails a magic
// link so the recipient lands signed in without needing to set a password.
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
  courseId?: string;
  tenantId?: string; // server resolves if missing
  invitedBy?: string;
  appOrigin?: string; // e.g., https://blackmusicscholar.academy
  orgName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as InvitePayload;
    if (!body.email) throw new Error("email is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Generate a magic link (creates user if doesn't exist).
    // The link lands on /auth/callback which handles "new user → onboarding,
    // existing user → ?next" routing.
    const origin = (body.appOrigin || "").replace(/\/+$/, "");
    let next = "/academy";
    if (body.courseId) {
      // Look up the course_code so we can deep-link to the class page.
      const { data: c } = await supabase.from("gw_courses").select("course_code").eq("id", body.courseId).maybeSingle();
      if (c?.course_code) next = `/academy/c/${String(c.course_code).toLowerCase()}`;
    }
    const redirectTo = origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: body.email,
      options: { redirectTo },
    });
    if (linkErr) throw new Error(`Magic link failed: ${linkErr.message}`);
    const actionLink = linkData?.properties?.action_link;
    const userId = linkData?.user?.id;
    if (!actionLink || !userId) throw new Error("No action_link or user_id returned");

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

    // 3. Ensure profile row exists with role='student'.
    await supabase.from("gw_profiles").upsert(
      {
        user_id: userId,
        email: body.email,
        full_name: body.fullName || null,
        role: "student",
        tenant_id: tenantId,
      },
      { onConflict: "user_id" }
    );

    // 4. Ensure tenant membership so the JWT hook injects tenant_id on next sign-in.
    if (tenantId) {
      await supabase.from("gw_tenant_members").upsert(
        { user_id: userId, tenant_id: tenantId, role: "student" },
        { onConflict: "user_id,tenant_id" }
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

    // 4. Send invite email via Resend.
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
    const orgName = body.orgName || "your music program";
    // Sender shows the tenant's name (the actual address stays on our verified
    // gleeworld.org domain so Resend will deliver).
    const safeFromName = orgName.replace(/[<>"]/g, "").trim() || "Your music program";
    const subject = `Welcome to ${orgName}`;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;padding:24px;">
        <h2 style="color:#1a1a1a;">Welcome to ${escapeHtml(orgName)}.</h2>
        <p>You've been invited to join. Click below to sign in — no password needed.</p>
        <p><a href="${actionLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in to your account</a></p>
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

    // 5. Log invite as sent (best-effort).
    try {
      await supabase.from("gw_student_invites").insert({
        email: body.email,
        full_name: body.fullName || null,
        course_id: body.courseId || null,
        invited_by: body.invitedBy || null,
        tenant_id: body.tenantId || undefined,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    } catch {}

    return new Response(JSON.stringify({ success: true, userId, email: body.email }), {
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
