// supabase/functions/permission-slip-reminder-digest/index.ts
//
// POST /functions/v1/permission-slip-reminder-digest
// Headers: Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
//
// Scheduled edge fn (cron) that finds tours starting within 48h with unsigned
// permission slips, groups by tenant and tour manager, then sends a digest
// email per manager with a list of outstanding slips.
//
// Response: 200 { ok: true, digests_sent: number }
//         | 401 { error: 'unauthorized' }
//         | 500 { error: 'processing_failed', details: string }

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json(200, {});
  }

  // --- Auth: verify the caller is using the service role key ---
  const rawToken = (req.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '');
  if (rawToken !== SERVICE_KEY) {
    return json(401, { error: 'unauthorized' });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // --- Step 1: Find tours starting within the next 48h ---
    // PostgREST does NOT push filter predicates through embedded-resource joins
    // (e.g. `.lte('tour.start_date', …)` is silently ignored), so we must
    // query gw_tour_events first, then filter gw_permission_slips by those ids.
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600 * 1000);

    const { data: upcomingTours, error: toursErr } = await admin
      .from('gw_tour_events')
      .select('id, title, start_date, location, description, tenant_id')
      .gte('start_date', now.toISOString())
      .lte('start_date', in48h.toISOString());

    if (toursErr) {
      console.error('Tour query error:', toursErr);
      return json(500, { error: 'processing_failed', details: toursErr.message });
    }

    if (!upcomingTours || upcomingTours.length === 0) {
      console.log('No tours starting within 48h');
      return json(200, { ok: true, digests_sent: 0 });
    }

    const upcomingTourIds = upcomingTours.map((t) => t.id as string);
    // Build a lookup for tour metadata (id → tour row) to avoid re-fetching below
    const tourById: Record<string, { id: string; title: string; start_date: string; location: string; description?: string }> =
      Object.fromEntries(upcomingTours.map((t) => [t.id as string, t as any]));

    // --- Step 2: Fetch pending/sent slips for those tour ids ---
    const { data: outstandingSlips, error: slipsErr } = await admin
      .from('gw_permission_slips')
      .select('id, tenant_id, student_user_id, tour_id')
      .in('tour_id', upcomingTourIds)
      .in('status', ['pending', 'sent']);

    if (slipsErr) {
      console.error('Slips query error:', slipsErr);
      return json(500, { error: 'processing_failed', details: slipsErr.message });
    }

    if (!outstandingSlips || outstandingSlips.length === 0) {
      console.log('No outstanding slips for upcoming tours within 48h');
      return json(200, { ok: true, digests_sent: 0 });
    }

    // --- Group by tenant, then by tour ---
    // Structure: { [tenant_id]: { [tour_id]: [slip objects] } }
    const grouped: Record<string, Record<string, any[]>> = {};

    for (const slip of outstandingSlips) {
      const tenantId = slip.tenant_id as string;
      const tourId = slip.tour_id as string;
      const tour = tourById[tourId];

      if (!tour) {
        // Tour was outside the 48h window or missing; should not happen but guard anyway
        console.warn(`Slip ${slip.id} references tour ${tourId} not in upcoming set; skipping`);
        continue;
      }

      if (!grouped[tenantId]) {
        grouped[tenantId] = {};
      }
      if (!grouped[tenantId][tourId]) {
        grouped[tenantId][tourId] = [];
      }

      grouped[tenantId][tourId].push({
        slipId: slip.id,
        studentUserId: slip.student_user_id,
        tour,
      });
    }

    let digestsSent = 0;

    // --- For each tenant, find tour managers and send digest ---
    for (const tenantId of Object.keys(grouped)) {
      console.log(`Processing tenant ${tenantId}`);

      const { data: managers, error: managersErr } = await admin
        .from('gw_executive_board_members')
        .select('user_id, email')
        .eq('tenant_id', tenantId)
        .eq('position', 'tour_manager')
        .eq('is_active', true);

      if (managersErr) {
        console.error(`Failed to fetch managers for tenant ${tenantId}:`, managersErr);
        continue;
      }

      if (!managers || managers.length === 0) {
        console.log(`No active tour managers for tenant ${tenantId}`);
        continue;
      }

      // Get all student names for this tenant's slips
      const studentIds = new Set<string>();
      Object.values(grouped[tenantId]).forEach((slips) => {
        slips.forEach((slip) => {
          studentIds.add(slip.studentUserId);
        });
      });

      const studentNames: Record<string, string> = {};
      for (const studentId of Array.from(studentIds)) {
        const { data: user } = await admin.auth.admin.getUserById(studentId);
        studentNames[studentId] =
          (user?.user?.user_metadata?.full_name as string | undefined) ??
          user?.user?.email ??
          'Unknown Student';
      }

      // Build email body: tours and unsigned students
      const toursData = Object.entries(grouped[tenantId]).map(([_tourId, slips]) => ({
        tour: slips[0].tour,
        students: slips.map((slip) => studentNames[slip.studentUserId]),
      }));

      // Count only the slips for THIS tenant (not the global total across all tenants)
      const tenantSlipCount = Object.values(grouped[tenantId]).reduce(
        (sum, slips) => sum + slips.length,
        0,
      );
      const subject = `${tenantSlipCount} outstanding permission slip${tenantSlipCount !== 1 ? 's' : ''}`;
      const html = buildDigestEmailHtml({
        tours: toursData,
        totalCount: tenantSlipCount,
      });

      // Send to each manager
      for (const manager of managers) {
        console.log(`Sending digest to manager ${manager.email} for tenant ${tenantId}`);

        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            to: manager.email,
            subject,
            html,
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text().catch(() => '');
          console.error(`Email to ${manager.email} failed:`, emailRes.status, errBody);
          continue;
        }

        digestsSent++;
      }
    }

    console.log(`Sent ${digestsSent} digest emails`);
    return json(200, { ok: true, digests_sent: digestsSent });
  } catch (err: any) {
    console.error('Unhandled error:', err);
    return json(500, {
      error: 'processing_failed',
      details: err.message || String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function buildDigestEmailHtml(p: {
  tours: Array<{
    tour: { title: string; start_date: string; location: string; description?: string };
    students: string[];
  }>;
  totalCount: number;
}): string {
  const tourRows = p.tours
    .map((item) => {
      const tripDate = new Date(item.tour.start_date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const studentList = item.students.map((s) => `<li>${esc(s)}</li>`).join('');
      return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <strong>${esc(item.tour.title)}</strong><br/>
        <span style="font-size:13px;color:#666">${esc(tripDate)} · ${esc(item.tour.location)}</span>
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
        <ul style="margin:0;padding-left:20px;font-size:13px">
          ${studentList}
        </ul>
      </td>
    </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#111;max-width:800px;margin:0 auto;padding:24px">
  <p>Hi Tour Manager,</p>
  <p>
    You have <strong>${p.totalCount} outstanding permission slip${p.totalCount !== 1 ? 's' : ''}</strong>
    for trips starting within the next 48 hours. Please contact the families listed below to complete them.
  </p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0">
    <thead>
      <tr>
        <th style="text-align:left;padding:12px;border-bottom:2px solid #111;font-weight:600">Trip</th>
        <th style="text-align:left;padding:12px;border-bottom:2px solid #111;font-weight:600">Students Pending Signature</th>
      </tr>
    </thead>
    <tbody>
      ${tourRows}
    </tbody>
  </table>
  <p style="color:#666;font-size:13px;margin-top:32px">
    Log into GleeWorld Travel Manager to view details or resend individual permission slip emails.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:11px">Automated reminder from GleeWorld Travel Manager</p>
</body>
</html>`;
}
