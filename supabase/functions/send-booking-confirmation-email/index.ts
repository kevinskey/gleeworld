import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { resolveTenantBranding } from "../_shared/tenantBranding.ts";
import { authenticateCaller, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// I3: escapes attacker-controlled strings (notes, service/location names)
// before they're interpolated into the email HTML. Everything on this path
// ultimately traces back to a public-intake caller with no session, so
// treat every field from `payload` as hostile.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface BookingConfirmationRequest {
  recordId: string;
  to: string;
  tenantSlug: string | null;
  payload: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Resolves a tenant's branding row by slug for resolveTenantBranding().
// Must NOT use _shared/branding.ts:getOrgName() — under service role (RLS
// bypassed) that helper picks an arbitrary tenant's row and memoizes it
// process-wide for 60s, pinning every other tenant's email to the wrong name.
async function brandingQuery(slug: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: tenant } = await admin
    .from('gw_tenants').select('id').eq('slug', slug).maybeSingle();
  if (!tenant) return null;
  const { data } = await admin
    .from('gw_branding_settings')
    .select('tenant_id, org_name, welcome_sms_template')
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  return data ?? null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // I3: this function sends email from the platform domain. Its ONLY
  // legitimate caller is public-intake, which uses the service-role key —
  // authenticateCaller resolves that, and only that, to { internal: true }.
  //
  // Checking merely that the caller is non-null is not enough: authenticateCaller
  // returns a Caller for ANY valid user JWT, so a null-check would still let
  // any signed-in user on any of the ~50 tenants send arbitrary mail from this
  // domain to any address. That narrows the phishing primitive from "the whole
  // internet" to "anyone with an account" — it does not close it. Require
  // internal.
  const caller = await authenticateCaller(req);
  if (!caller?.internal) return unauthorizedResponse(corsHeaders, 403);

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);
    const { recordId, to, tenantSlug, payload }: BookingConfirmationRequest = await req.json();
    const branding = await resolveTenantBranding(brandingQuery, tenantSlug);
    const orgName = branding.orgName;

    console.log('📅 Sending booking confirmation email to:', to);

    // I4: the page (src/pages/PublicBookingPage.tsx) only ever sends
    // { serviceId, appointmentDate, startTime, notes } — it never had a
    // serviceName or location field to send, so this always fell back to
    // "your appointment" with no location line. Resolved server-side by
    // serviceId instead of trusting more client-supplied strings: it's one
    // extra admin-client lookup, it can't be spoofed, and it needs no
    // frontend payload changes.
    const serviceId = payload?.serviceId as string | undefined;
    let serviceName = 'your appointment';
    let location = '';
    if (serviceId) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: service } = await admin
        .from('gw_services')
        .select('name, location')
        .eq('id', serviceId)
        .maybeSingle();
      if (service?.name) serviceName = service.name;
      if (service?.location) location = service.location;
    }

    const appointmentDateRaw = payload?.appointmentDate as string | undefined;
    const formattedDate = appointmentDateRaw
      ? new Date(appointmentDateRaw).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'the scheduled date';
    const startTime = escapeHtml((payload?.startTime as string) || '');
    const notes = escapeHtml((payload?.notes as string) || '');
    serviceName = escapeHtml(serviceName);
    location = escapeHtml(location);

    const emailResponse = await resend.emails.send({
      from: `${orgName} <bookings@gleeworld.org>`,
      to: [to],
      subject: `Booking Confirmation - ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #8B5CF6; }
            .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #8B5CF6, #A855F7); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .logo span { color: white; font-size: 32px; font-weight: bold; }
            h1 { color: #8B5CF6; margin: 0; font-size: 28px; }
            .subtitle { color: #666; font-size: 16px; margin: 5px 0 0; }
            .content { margin: 30px 0; }
            .highlight-box { background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: 600; color: #555; }
            .detail-value { color: #333; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <span>✓</span>
              </div>
              <h1>Booking Confirmed!</h1>
              <p class="subtitle">${orgName}</p>
            </div>

            <div class="content">
              <p>Thank you for booking with ${orgName}. Your appointment is confirmed.</p>

              <div class="highlight-box">
                <h2 style="margin: 0 0 15px; font-size: 24px;">${serviceName}</h2>
                <div class="detail-row" style="border: none; justify-content: center; flex-direction: column;">
                  <div class="detail-label" style="color: white; margin-bottom: 10px;">Date & Time</div>
                  <div class="detail-value" style="color: white; font-size: 18px; font-weight: bold;">${formattedDate}${startTime ? ` at ${startTime}` : ''}</div>
                </div>
              </div>

              ${location ? `
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${location}</span>
              </div>` : ''}

              <div class="detail-row">
                <span class="detail-label">Confirmation ID:</span>
                <span class="detail-value">${escapeHtml(recordId ?? '')}</span>
              </div>

              ${notes ? `
              <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${notes}</span>
              </div>` : ''}

              <p>If you need to reschedule or have any questions, please contact us.</p>

              <p>We look forward to seeing you!</p>
            </div>

            <div class="footer">
              <p>${orgName}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('✅ Booking confirmation email sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message: `Booking confirmation sent to ${to}`,
      emailId: emailResponse.data?.id,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Error sending booking confirmation email:', error);

    return new Response(JSON.stringify({
      error: error.message || 'Failed to send booking confirmation email'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);
