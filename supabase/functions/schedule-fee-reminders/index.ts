/**
 * schedule-fee-reminders
 *
 * Cron-invoked scheduler: scans gw_student_fees for fees due in the
 * +7-day, today, and -3-day windows and creates gw_notifications rows
 * with type='fee_reminder'. Idempotent — skips any fee that already has
 * a fee_reminder notification created within the last 20 hours.
 *
 * Deploy/cron: Invoke via pg_cron daily at 08:00 UTC using the same
 * pattern as flatten-storage.sh (see reference_supabase_storage_flatten.md).
 * No JWT auth required — runs with SUPABASE_SERVICE_ROLE_KEY directly.
 *
 * Example pg_cron entry:
 *   SELECT cron.schedule(
 *     'fee-reminders-daily',
 *     '0 8 * * *',
 *     $$SELECT net.http_post(url:='https://<project>.supabase.co/functions/v1/schedule-fee-reminders', headers:='{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}', body:='{}')$$
 *   );
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface ReminderWindow {
  start: string;
  end: string;
  kind: "upcoming_due" | "due_today" | "overdue";
}

function buildWindows(): ReminderWindow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = (offset: number) =>
    new Date(today.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  return [
    { start: iso(7), end: iso(7), kind: "upcoming_due" },
    { start: iso(0), end: iso(0), kind: "due_today" },
    { start: iso(-3), end: iso(-3), kind: "overdue" },
  ];
}

function buildMessage(
  kind: ReminderWindow["kind"],
  feeName: string,
  remaining: number,
  dueDate: string,
): string {
  const amount = `$${remaining.toFixed(2)}`;
  if (kind === "overdue") {
    return `Your ${feeName} payment of ${amount} is overdue.`;
  }
  if (kind === "due_today") {
    return `Your ${feeName} payment of ${amount} is due today.`;
  }
  return `Your ${feeName} payment of ${amount} is due on ${dueDate}.`;
}

serve(async (_req) => {
  const windows = buildWindows();
  const idempotencyWindow = new Date(Date.now() - 20 * 3_600_000).toISOString();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const w of windows) {
    const { data: fees, error: feesErr } = await admin
      .from("gw_student_fees")
      .select("id, user_id, name, amount, paid_amount, due_date, tenant_id")
      .in("status", ["pending", "partial", "overdue"])
      .gte("due_date", w.start)
      .lte("due_date", w.end);

    if (feesErr) {
      errors.push(`window ${w.kind}: ${feesErr.message}`);
      continue;
    }

    for (const fee of fees ?? []) {
      // Idempotency: skip if a fee_reminder for this fee was already sent in the last 20h
      const { data: existing } = await admin
        .from("gw_notifications")
        .select("id")
        .eq("user_id", fee.user_id)
        .eq("related_id", fee.id)
        .eq("type", "fee_reminder")
        .gte("created_at", idempotencyWindow)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const remaining = Number(fee.amount) - Number(fee.paid_amount ?? 0);
      const message = buildMessage(w.kind, fee.name, remaining, fee.due_date);
      const title = w.kind === "overdue" ? "Payment overdue" : "Payment reminder";

      const { error: insertErr } = await admin
        .from("gw_notifications")
        .insert({
          user_id: fee.user_id,
          tenant_id: fee.tenant_id,
          title,
          message,
          type: "fee_reminder",
          related_id: fee.id,
          // link students directly to their fee detail view
          action_url: `/dashboard/my-fees?feeId=${fee.id}`,
        });

      if (insertErr) {
        errors.push(`fee ${fee.id}: ${insertErr.message}`);
      } else {
        created++;
      }
    }
  }

  const status = errors.length > 0 ? 207 : 200;
  return new Response(
    JSON.stringify({ created, skipped, errors }),
    { status, headers: { "Content-Type": "application/json" } },
  );
});
