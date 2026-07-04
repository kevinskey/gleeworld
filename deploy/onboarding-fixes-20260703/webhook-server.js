// Stripe → GleeWorld webhook
//
// Handles two flows:
//   1) Tenant provisioning
//        checkout.session.completed with metadata.gleeworld_tier (set on the
//        GleeWorld payment links) → POST to the superadmin API (:3035), which
//        runs the full provisioning chain (tenant, branding, admin invite,
//        Stripe customer, vhost, modules, welcome email).
//        The Stripe account is shared with other businesses, so any checkout
//        WITHOUT gleeworld_tier is ignored here.
//   2) Module subscription
//        checkout.session.completed with metadata.module_id → upsert gw_tenant_subscriptions
//        customer.subscription.updated  → update status + period_end
//        customer.subscription.deleted  → mark cancelled
//
// Both flows share the same webhook signature secret (one Stripe account).

import express from 'express';
import Stripe from 'stripe';
import { spawnSync } from 'node:child_process';

const PORT             = Number(process.env.PORT || 3030);
const ROOT_DOMAIN      = process.env.ROOT_DOMAIN || 'gleeworld.org';
const SUPERADMIN_URL   = process.env.SUPERADMIN_URL || 'http://127.0.0.1:3035';
const SUPERADMIN_TOKEN = process.env.SUPERADMIN_INTERNAL_TOKEN;
const SERVER_IP        = process.env.SERVER_IP || '198.211.113.144';
const SK = process.env.STRIPE_SECRET_KEY;
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;
// Separate secret for the Connect webhook endpoint. Configured against the
// Connect events endpoint in the Stripe dashboard; left unset until the
// Connect webhook is wired up, in which case the /stripe-connect-webhook
// route refuses incoming events with a 503.
const CONNECT_WHSEC = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '';
const RESEND_KEY = process.env.RESEND_API_KEY;
const SENDER = process.env.SENDER_EMAIL || `welcome@${ROOT_DOMAIN}`;

if (!SK || !WHSEC) {
  console.error('FATAL: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set.');
  process.exit(1);
}

const stripe = new Stripe(SK);
const app = express();

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WHSEC);
  } catch (err) {
    console.error('signature verification failed:', err.message);
    return res.status(400).send(`webhook error: ${err.message}`);
  }

  // Ack quickly (Stripe needs <5s response)
  res.json({ received: true });

  // Idempotency: Stripe redelivers events (timeouts, retries). Without this,
  // a redelivered checkout.session.completed would re-run provisioning, hit
  // the slug 409, and mint a DUPLICATE tenant with a numeric suffix.
  if (!(await claimEvent(event))) {
    console.log(`duplicate delivery of ${event.id} (${event.type}) — skipping`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Store sale (GleeWorld Store on the platform account) — dispatch
        // before the ticket/module branches (handled inside
        // handleCheckoutCompleted) and stop; a store sale never carries
        // gleeworld_tier/module_id metadata.
        if (event.data.object.metadata?.store_type) { await handleStoreCheckoutCompleted(event.data.object); break; }
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await handleSubscriptionChange(event.data.object, 'upsert');
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object, 'cancel');
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`ignoring event: ${event.type}`);
    }
    await markEventProcessed(event.id, null);
  } catch (err) {
    console.error(`error handling ${event.type}:`, err);
    await markEventProcessed(event.id, String(err).slice(0, 500)).catch(() => {});
  }
});

// ── Stripe Connect webhook ─────────────────────────────────────────────────
// Box Office (Phase B). Separate endpoint + separate signing secret from the
// platform /stripe-webhook so we can't accidentally trust a Connect-account
// event signed with the platform's secret (or vice versa).
//
// Only handler we need today is account.updated — mirrors the Connected
// account's capability flags onto gw_tenants so the UI can gate ticket
// selling on stripe_charges_enabled. Other event types are ignored.
app.post('/stripe-connect-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!CONNECT_WHSEC) {
    console.warn('connect webhook hit but STRIPE_CONNECT_WEBHOOK_SECRET unset');
    return res.status(503).send('connect webhook not configured');
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, CONNECT_WHSEC);
  } catch (err) {
    console.error('connect signature verification failed:', err.message);
    return res.status(400).send(`webhook error: ${err.message}`);
  }

  // Ack fast — Stripe needs <5s.
  res.json({ received: true });

  try {
    switch (event.type) {
      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object);
        break;
      case 'checkout.session.completed':
        // Tenant Store sale (Connect account) — dispatch before the
        // box-office ticket branch and stop; box-office orders never carry
        // metadata.store_type.
        if (event.data.object.metadata?.store_type) { await handleStoreCheckoutCompleted(event.data.object); break; }
        // payment_status is 'paid' once Stripe collected the funds. Some
        // checkout flows fire 'completed' before 'paid' (e.g. async PMs);
        // ignore those — we'll handle them on payment_intent.succeeded.
        if (event.data.object.payment_status === 'paid') {
          await handleConnectCheckoutCompleted(event.data.object);
        }
        break;
      case 'charge.refunded':
        // A refund issued from the tenant's Stripe Dashboard (or via our
        // own admin UI — the latter has already updated our DB but the
        // void function is idempotent so a second call is harmless).
        await handleConnectChargeRefunded(event.data.object);
        break;
      default:
        console.log(`connect: ignoring event ${event.type}`);
    }
  } catch (err) {
    console.error(`connect: error handling ${event.type}:`, err);
  }
});

async function handleConnectAccountUpdated(account) {
  // account.id is the acct_* — match it to the row we stored when the
  // tenant kicked off onboarding. Mirror the two capability flags so the
  // BoxOffice UI can show "ready to sell" vs "Stripe still verifying".
  if (!account?.id) return;
  const charges = account.charges_enabled ? 'true' : 'false';
  const payouts = account.payouts_enabled ? 'true' : 'false';
  await runSql(`
    UPDATE gw_tenants
       SET stripe_charges_enabled = ${charges},
           stripe_payouts_enabled = ${payouts},
           updated_at = now()
     WHERE stripe_account_id = $$${account.id}$$;
  `);
  console.log(`✓ connect account.updated ${account.id} charges=${charges} payouts=${payouts}`);
}

// ── Box Office fulfillment ─────────────────────────────────────────────────
// Connect-account checkout.session.completed → call gw_box_office_fulfill_order
// (atomic seat decrement + ticket mint, idempotent on order id), then send
// the receipt email with the buyer's tickets URL.
async function handleConnectCheckoutCompleted(session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.log('connect checkout.session.completed without order_id metadata — not a box-office sale');
    return;
  }
  const signingSecret = process.env.TICKET_SIGNING_SECRET || '';
  if (!signingSecret) {
    console.error('TICKET_SIGNING_SECRET unset — cannot fulfill orders');
    return;
  }
  const paymentIntent = session.payment_intent || '';

  // The fulfillment function does ALL of: lock + check capacity + increment
  // sold + mint tickets + flip order to paid, in one transaction. Returns
  // either {ok:true,...} or {already_paid:true} (idempotent retry).
  const sql = `SELECT public.gw_box_office_fulfill_order(
    $$${orderId}$$::uuid,
    $$${session.id}$$,
    $$${paymentIntent}$$,
    $$${signingSecret}$$
  ) AS result;`;
  const raw = await runSqlReturn(sql);
  let result = null;
  try {
    // runSqlReturn gives us the raw psql output; pull the JSON line.
    const line = raw.split('\n').map(l => l.trim()).find(l => l.startsWith('{'));
    result = line ? JSON.parse(line) : null;
  } catch (e) {
    console.error('failed to parse fulfill result', e, raw);
    return;
  }
  if (!result) {
    console.error('fulfill returned no result for order', orderId);
    return;
  }
  if (result.already_paid) {
    console.log(`✓ order ${orderId} already paid — skipping mint`);
    return;
  }
  if (result.error) {
    console.error(`✗ order ${orderId} fulfill failed: ${result.error}`, result);
    await alertFulfillmentFailure(orderId, session.id, result);
    return;
  }
  console.log(`✓ order ${orderId} fulfilled — ${(result.tickets || []).length} tickets minted`);

  // Send the receipt email with their tickets URL + QR snapshots. Best-
  // effort; a failed email doesn't unmint the tickets.
  try {
    await sendTicketEmail(result);
  } catch (err) {
    console.error('ticket email send failed for order', orderId, err);
  }
}

// Store sale (GleeWorld Store on the platform account, or a Tenant Store on a
// Connect account). Distinguished from tickets/modules by metadata.store_type.
async function handleStoreCheckoutCompleted(session) {
  const orderId = session.metadata?.order_id;
  const storeType = session.metadata?.store_type;
  if (!orderId || !storeType) return; // not a store sale
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id || '');
  const sql = `SELECT public.gw_store_fulfill_order($$${orderId}$$::uuid, $$${session.id}$$, $$${pi}$$) AS result;`;
  const raw = await runSqlReturn(sql);
  const line = raw.split('\n').map(l => l.trim()).find(l => l.startsWith('{'));
  const result = line ? JSON.parse(line) : null;
  if (result?.ok) console.log('[store] fulfilled order', orderId, 'ents', (result.entitlements||[]).length);
  else if (result?.already_paid) console.log('[store] order already paid (idempotent)', orderId);
  else console.error('[store] fulfill error', orderId, result);
  // Digital delivery + receipt email are issued by a follow-up (out of scope here);
  // entitlements already exist in gw_store_entitlements for store-download to serve.
}

// Find the order by payment_intent and atomically void it (gw_tickets
// flipped to 'void', tier.quantity_sold decremented, order.status set to
// 'refunded'). Idempotent via the SQL function so re-deliveries from
// Stripe and our own admin UI converge on the same end state.
async function handleConnectChargeRefunded(charge) {
  const pi = charge.payment_intent;
  if (!pi) {
    console.log('connect charge.refunded without payment_intent — skipping');
    return;
  }
  // Look up which order this PI belongs to.
  const lookup = await runSqlReturn(`
    SELECT row_to_json(t) FROM (
      SELECT id, tenant_id, status
        FROM gw_ticket_orders
       WHERE stripe_payment_intent_id = $$${pi}$$
       LIMIT 1
    ) t;
  `);
  const order = JSON.parse((lookup || '').trim() || 'null');
  if (!order) {
    console.log(`connect charge.refunded for unknown PI ${pi} — not ours`);
    return;
  }
  if (order.status === 'refunded' || order.status === 'void') {
    console.log(`✓ order ${order.id} already ${order.status} — skipping`);
    return;
  }
  const raw = await runSqlReturn(`
    SELECT public.gw_box_office_void_order(
      $$${order.id}$$::uuid,
      $$${order.tenant_id}$$::uuid,
      'refunded'
    ) AS result;
  `);
  let result = null;
  try {
    const line = raw.split('\n').map(l => l.trim()).find(l => l.startsWith('{'));
    result = line ? JSON.parse(line) : null;
  } catch (e) {
    console.error('failed to parse void_order result', e, raw);
    return;
  }
  if (result?.error) {
    console.error(`✗ order ${order.id} void_order failed: ${result.error}`, result);
    return;
  }
  console.log(`✓ order ${order.id} voided (Stripe dashboard refund) — ${result?.tickets_voided ?? 0} tickets voided`);
}

// runSql variant that returns stdout so callers can parse SELECT results.
async function runSqlReturn(sql) {
  const result = spawnSync('docker', [
    'exec', 'supabase-db',
    'psql', '-U', 'supabase_admin', '-d', 'postgres',
    '-At',                       // tuples-only + unaligned for clean JSON
    '-v', 'ON_ERROR_STOP=1',
    '-c', sql,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`SQL failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout || '';
}

async function alertFulfillmentFailure(orderId, sessionId, result) {
  if (!RESEND_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GleeWorld <${SENDER}>`,
      to: [`kevin@${ROOT_DOMAIN}`],
      subject: `🚨 Box Office fulfillment failed — order ${orderId}`,
      text: `A Stripe checkout completed but our fulfillment failed.\n\n`
        + `Order: ${orderId}\nSession: ${sessionId}\nReason: ${result.error || 'unknown'}\n\n`
        + `Full result:\n${JSON.stringify(result, null, 2)}\n\n`
        + `The buyer was charged. Issue a refund from the tenant's Stripe Dashboard.`,
    }),
  }).catch(() => {});
}

async function sendTicketEmail(result) {
  if (!RESEND_KEY) {
    console.warn('RESEND_API_KEY unset — cannot email tickets');
    return;
  }
  // Look up the event + tenant for nicer email subject lines.
  const meta = await runSqlReturn(`
    SELECT row_to_json(t) FROM (
      SELECT e.title, e.start_date, e.venue_name, e.box_office_slug,
             ten.slug AS tenant_slug, ten.name AS tenant_name
        FROM gw_events e
        JOIN gw_tenants ten ON ten.id = e.tenant_id
       WHERE e.id = $$${result.event_id}$$::uuid
    ) t;
  `);
  const event = JSON.parse((meta || '').trim() || 'null') || {};
  const ticketsUrl = `https://${event.tenant_slug}.${ROOT_DOMAIN}/tickets/${result.access_token}`;
  const eventDate = event.start_date
    ? new Date(event.start_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    : '';
  const ticketCount = (result.tickets || []).length;
  const plural = ticketCount === 1 ? '' : 's';

  const text =
`Thanks for your order — your ticket${plural} for ${event.title || 'the event'} ${ticketCount === 1 ? 'is' : 'are'} below.

${event.title || ''}
${eventDate}${event.venue_name ? ' · ' + event.venue_name : ''}

Show this page at the door (scan the QR code from your phone):
${ticketsUrl}

${ticketCount} ticket${plural} attached.

Questions? Reply to this email.
— ${event.tenant_name || 'Box Office'}`;

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 4px;">${escapeHtml(event.title || 'Your tickets')}</h2>
    <p style="margin:0 0 16px;color:#555;">${escapeHtml(eventDate)}${event.venue_name ? ' · ' + escapeHtml(event.venue_name) : ''}</p>
    <p>Thanks for your order. You have <strong>${ticketCount} ticket${plural}</strong>.</p>
    <p>Open this page on your phone at the door — each ticket scans individually:</p>
    <p><a href="${ticketsUrl}" style="display:inline-block;background:#0b1220;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View your tickets</a></p>
    <p style="color:#888;font-size:12px;">${escapeHtml(ticketsUrl)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#888;font-size:12px;">— ${escapeHtml(event.tenant_name || 'Box Office')}</p>
  </body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Box Office <${SENDER}>`,
      to: [result.buyer_email],
      subject: `🎟 Your ticket${plural} — ${event.title || 'Event'}`,
      text,
      html,
    }),
  });
  console.log(`✓ ticket email sent to ${result.buyer_email}`);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`GleeWorld webhook listening on 127.0.0.1:${PORT}`);
});

// ── handlers ──────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session) {
  const moduleId = session.metadata?.module_id;
  const tenantId = session.metadata?.tenant_id || session.client_reference_id;

  // Module activation flow
  if (moduleId && tenantId) {
    console.log(`▸ module activation: ${moduleId} for tenant ${tenantId}`);

    // Save stripe_customer_id on the tenant (first time)
    if (session.customer) {
      await runSql(
        `UPDATE gw_tenants SET stripe_customer_id = $$${session.customer}$$ WHERE id = $$${tenantId}$$ AND (stripe_customer_id IS NULL OR stripe_customer_id = '');`
      );
    }

    // Fetch the subscription to get period_end + status
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      const status = sub.status === 'trialing' ? 'trial' : 'active';
      await runSql(`
        INSERT INTO gw_tenant_subscriptions
          (tenant_id, module_id, status, current_period_end, stripe_subscription_id, enabled_at)
        VALUES ($$${tenantId}$$, $$${moduleId}$$, $$${status}$$, $$${periodEnd}$$, $$${sub.id}$$, now())
        ON CONFLICT (tenant_id, module_id) DO UPDATE SET
          status = EXCLUDED.status,
          current_period_end = EXCLUDED.current_period_end,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          cancelled_at = NULL;
      `);
      console.log(`✓ ${moduleId} active for tenant ${tenantId} until ${periodEnd}`);
    }
    return;
  }

  // Tenant provisioning flow — only GleeWorld plan purchases carry this tag.
  // Normalize legacy payment-link metadata (solo/school/institution predate
  // the canonical PLAN_TIERS ids) so gw_tenants.plan is always canonical.
  const TIER_ALIASES = { solo: 'ensemble', school: 'studio', institution: 'university' };
  const rawTier = session.metadata?.gleeworld_tier;
  const tier = TIER_ALIASES[rawTier] || rawTier;
  if (!tier) {
    console.log('checkout without gleeworld_tier or module_id — not GleeWorld, ignoring');
    return;
  }
  if (!SUPERADMIN_TOKEN) {
    console.error('SUPERADMIN_INTERNAL_TOKEN not set — cannot provision');
    await emailAdminFailure(session.customer_details?.email, 'unknown org', 'SUPERADMIN_INTERNAL_TOKEN not configured on webhook');
    return;
  }

  const customerEmail = session.customer_details?.email || session.customer_email;
  const customerName = session.customer_details?.name || '';
  const orgName = session.custom_fields?.find(f => f.key === 'org_name')?.text?.value
    || session.metadata?.org_name
    || (customerEmail ? customerEmail.split('@')[0] : 'New Organization');
  const requestedSubdomain = slugify(
    session.custom_fields?.find(f => f.key === 'subdomain')?.text?.value
    || session.metadata?.subdomain
    || orgName
  );

  console.log(`▸ provisioning ${orgName} (${tier}) → ${requestedSubdomain}.${ROOT_DOMAIN}`);

  // The superadmin API enforces slug uniqueness (409) — retry with a suffix.
  let provisioned = null, lastError = null;
  for (let n = 0; n < 5 && !provisioned; n++) {
    const slug = n === 0 ? requestedSubdomain : `${requestedSubdomain}${n + 1}`;
    try {
      const resp = await fetch(`${SUPERADMIN_URL}/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': SUPERADMIN_TOKEN },
        body: JSON.stringify({
          slug,
          name: orgName,
          subdomain: slug,
          admin_email: customerEmail,
          admin_name: customerName,
          plan: tier,
          // Self-serve purchase → customer designs their own site (guided
          // Site Setup on first sign-in).
          deployment_path: 'self',
          // Link the tenant to the customer who actually paid, so the plan
          // subscription and future module purchases share one Stripe customer.
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        }),
      });
      const body = await resp.json().catch(() => ({}));
      if (resp.ok) {
        provisioned = { slug, body };
      } else if (resp.status === 409) {
        lastError = `slug taken: ${slug}`;
        continue;
      } else {
        lastError = `${resp.status} ${JSON.stringify(body).slice(0, 2000)}`;
        break;
      }
    } catch (e) {
      lastError = String(e);
      break;
    }
  }

  if (!provisioned) {
    console.error('provision failed:', lastError);
    await emailAdminFailure(customerEmail, orgName, lastError);
    return;
  }

  console.log(`✓ provisioned ${orgName} → ${provisioned.slug}.${ROOT_DOMAIN}`);

  // Tag the PLAN subscription with the tenant so later lifecycle events
  // (renewal, past_due, cancellation) can find their tenant. Without this
  // the base plan is billing-orphaned and non-payment never suspends a site.
  // (tenantId is already declared at the top of this function for the
  // module-activation branch — this is the newly provisioned tenant's id.)
  const provisionedTenantId = provisioned.body?.tenant?.id;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (provisionedTenantId && subscriptionId) {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        metadata: { tenant_id: provisionedTenantId, gleeworld_plan: tier },
      });
      console.log(`✓ plan subscription ${subscriptionId} tagged with tenant ${provisionedTenantId}`);
    } catch (e) {
      console.error('plan subscription tagging failed:', e.message);
    }
  }

  await emailAdminSuccess(customerEmail, orgName, tier, provisioned.slug, provisioned.body);
}

async function handleSubscriptionChange(sub, kind) {
  const tenantId = sub.metadata?.tenant_id;
  const moduleId = sub.metadata?.module_id;

  // Base-plan subscription (tagged at provisioning): sync its lifecycle to
  // the tenant itself — non-payment or cancellation must reach the site.
  if (tenantId && !moduleId && sub.metadata?.gleeworld_plan) {
    const tenantStatus =
      kind === 'cancel'            ? 'suspended' :
      sub.status === 'past_due'    ? 'past_due'  :
      sub.status === 'unpaid'      ? 'suspended' :
      sub.status === 'canceled'    ? 'suspended' :
      'active';
    await runSql(`
      UPDATE gw_tenants SET status = $$${tenantStatus}$$, updated_at = now()
      WHERE id = $$${tenantId}$$;
    `);
    console.log(`✓ plan subscription ${kind}: tenant ${tenantId} → ${tenantStatus}`);
    return;
  }

  if (!tenantId || !moduleId) {
    // Not a module subscription and not a tagged plan sub. Ignore.
    return;
  }
  if (kind === 'cancel') {
    await runSql(`
      UPDATE gw_tenant_subscriptions
      SET status = 'cancelled', cancelled_at = now()
      WHERE tenant_id = $$${tenantId}$$ AND module_id = $$${moduleId}$$;
    `);
    console.log(`✗ ${moduleId} cancelled for tenant ${tenantId}`);
    return;
  }
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
  const status =
    sub.status === 'active'   ? 'active'   :
    sub.status === 'trialing' ? 'trial'    :
    sub.status === 'past_due' ? 'past_due' :
    sub.status === 'canceled' ? 'cancelled':
    'active';
  await runSql(`
    INSERT INTO gw_tenant_subscriptions
      (tenant_id, module_id, status, current_period_end, stripe_subscription_id, enabled_at)
    VALUES ($$${tenantId}$$, $$${moduleId}$$, $$${status}$$, $$${periodEnd}$$, $$${sub.id}$$, now())
    ON CONFLICT (tenant_id, module_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      cancelled_at = CASE WHEN EXCLUDED.status='cancelled' THEN now() ELSE NULL END;
  `);
  console.log(`✓ subscription ${kind}: ${moduleId} for tenant ${tenantId} status=${status}`);
}

async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;
  const sub = await stripe.subscriptions.retrieve(invoice.subscription);
  const tenantId = sub.metadata?.tenant_id;
  const moduleId = sub.metadata?.module_id;
  if (tenantId && !moduleId && sub.metadata?.gleeworld_plan) {
    await runSql(`
      UPDATE gw_tenants SET status = 'past_due', updated_at = now()
      WHERE id = $$${tenantId}$$;
    `);
    console.warn(`⚠ plan payment failed: tenant ${tenantId} → past_due`);
    return;
  }
  if (!tenantId || !moduleId) return;
  await runSql(`
    UPDATE gw_tenant_subscriptions
    SET status = 'past_due'
    WHERE tenant_id = $$${tenantId}$$ AND module_id = $$${moduleId}$$;
  `);
  console.warn(`⚠ payment failed: ${moduleId} for tenant ${tenantId} → past_due`);
}

// ── helpers ───────────────────────────────────────────────────────────────

// Insert-or-skip on gw_webhook_events.event_id (UNIQUE). Returns true when
// this delivery claimed the event, false on a duplicate. Fails OPEN (returns
// true) if the DB is unreachable — better a rare duplicate check downstream
// than dropping a paying customer's event.
async function claimEvent(event) {
  try {
    const out = await runSqlReturn(`
      INSERT INTO gw_webhook_events (provider, event_id, event_type, payload, status)
      VALUES ('stripe', $$${event.id}$$, $$${event.type}$$,
              jsonb_build_object('id', $$${event.id}$$, 'type', $$${event.type}$$),
              'processing')
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id;
    `);
    return (out || '').trim().length > 0;
  } catch (e) {
    console.error('claimEvent failed (processing anyway):', e.message);
    return true;
  }
}

async function markEventProcessed(eventId, errorMessage) {
  const status = errorMessage ? 'error' : 'processed';
  const errCol = errorMessage
    ? `, error_message = $$${errorMessage.replace(/\$\$/g, '$')}$$`
    : '';
  await runSql(`
    UPDATE gw_webhook_events
       SET status = '${status}', processed_at = now()${errCol}
     WHERE event_id = $$${eventId}$$;
  `);
}

function runSql(sql) {
  // Use docker exec to run SQL inside the supabase-db container.
  const result = spawnSync('docker', [
    'exec', 'supabase-db',
    'psql', '-U', 'supabase_admin', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-c', sql,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`SQL failed (${result.status}): ${result.stderr || result.stdout}`);
  }
}

function slugify(s) {
  // Superadmin API requires ^[a-z0-9-]{3,60}$
  const slug = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'site';
  return slug.length < 3 ? `${slug}-glee` : slug;
}

async function emailAdminSuccess(customerEmail, org, tier, slug, provisionBody) {
  if (!RESEND_KEY) return;
  const verification = provisionBody?.verification;
  const verificationBlock = verification
    ? `Verification: ${verification.passed ? 'ALL CHECKS GREEN ✓' : 'FAILED — welcome email withheld, see items below'}\n`
      + verification.checks.map((c) => `  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`).join('\n')
      + `\nWelcome email: ${provisionBody.welcome_sent ? 'sent' : 'NOT sent'}\n`
    : 'Verification: no report returned (older superadmin build?)\n';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GleeWorld <${SENDER}>`,
      to: [`kevin@${ROOT_DOMAIN}`],
      subject: `${verification && !verification.passed ? '🚨' : '🎉'} New GleeWorld customer: ${org} (${tier})`,
      text: `A new tenant was provisioned automatically.\n\n`
        + `Organization: ${org}\nPlan: ${tier}\nAdmin email: ${customerEmail}\n`
        + `Site: https://${slug}.${ROOT_DOMAIN}\n\n`
        + verificationBlock,
    }),
  }).catch(() => {});
}

async function emailAdminFailure(customerEmail, org, err) {
  if (!RESEND_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GleeWorld <${SENDER}>`,
      to: [`kevin@${ROOT_DOMAIN}`],
      subject: `🚨 Provision FAILED for ${org}`,
      text: `Customer: ${customerEmail}\n\nError:\n${(err || '').slice(0, 4000)}`,
    }),
  }).catch(() => {});
}
