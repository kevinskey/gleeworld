// Stripe → GleeWorld auto-provision webhook
//
// Listens for `checkout.session.completed`, then:
//   1. Validates the signature (no provision without it).
//   2. Pulls org name, email, preferred subdomain from session metadata.
//   3. Picks a safe subdomain if none was provided.
//   4. Runs /var/www/gleeworld/scripts/provision-tenant.sh.
//   5. Sends a welcome email via Resend's HTTPS API (bypasses
//      the DO outbound-SMTP block — we go out on port 443).
//
// Env vars (read from /etc/gleeworld-provision.env via systemd):
//   STRIPE_SECRET_KEY        — used only to look up subscription metadata
//   STRIPE_WEBHOOK_SECRET    — verifies signature on incoming events
//   RESEND_API_KEY           — for sending welcome emails
//   PROVISION_SCRIPT         — path to provision-tenant.sh (default below)
//   PORT                     — listen port (default 3030)
//   ROOT_DOMAIN              — default 'gleeworld.org'

import express from 'express';
import Stripe from 'stripe';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT             = Number(process.env.PORT || 3030);
const ROOT_DOMAIN      = process.env.ROOT_DOMAIN || 'gleeworld.org';
const PROVISION_SCRIPT = process.env.PROVISION_SCRIPT || '/var/www/gleeworld/scripts/provision-tenant.sh';
const SK = process.env.STRIPE_SECRET_KEY;
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SENDER = process.env.SENDER_EMAIL || `welcome@${ROOT_DOMAIN}`;

if (!SK || !WHSEC) {
  console.error('FATAL: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set.');
  process.exit(1);
}
if (!existsSync(PROVISION_SCRIPT)) {
  console.error(`FATAL: PROVISION_SCRIPT not found at ${PROVISION_SCRIPT}`);
  process.exit(1);
}

const stripe = new Stripe(SK);
const app = express();

// Stripe webhook signature verification requires the raw body, not parsed JSON.
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WHSEC);
  } catch (err) {
    console.error('signature verification failed:', err.message);
    return res.status(400).send(`webhook error: ${err.message}`);
  }

  // We only act on completed checkouts.
  if (event.type !== 'checkout.session.completed') {
    console.log(`ignoring event type: ${event.type}`);
    return res.json({ received: true });
  }

  const session = event.data.object;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const orgName = session.metadata?.org_name
                  || session.custom_fields?.find(f => f.key === 'org_name')?.text?.value
                  || (customerEmail ? customerEmail.split('@')[0] : 'New Organization');
  const requestedSubdomain = (
    session.metadata?.subdomain
    || session.custom_fields?.find(f => f.key === 'subdomain')?.text?.value
    || slugify(orgName)
  ).toLowerCase();

  // Quickly acknowledge Stripe (5 second limit) — provisioning runs detached.
  res.json({ received: true });

  // Pick a unique subdomain. If the one they asked for collides, append digits.
  const subdomain = pickUniqueSubdomain(requestedSubdomain);

  console.log(`▸ provisioning ${orgName} → ${subdomain}.${ROOT_DOMAIN}`);

  // Run the provision script. ~90 seconds.
  const result = spawnSync('bash', [
    PROVISION_SCRIPT,
    '--org',       orgName,
    '--short',     shortenName(orgName),
    '--email',     customerEmail,
    '--subdomain', subdomain,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    console.error('provision failed:', result.stderr || result.stdout);
    await emailAdminFailure(customerEmail, orgName, result.stderr || result.stdout);
    return;
  }

  // The script prints the recovery link. Extract it.
  const link = (result.stdout.match(/(https?:\/\/[^\s]*\/auth\/v1\/verify[^\s]+)/) || [])[1];
  if (!link) {
    console.error('no recovery link found in provision output. stdout:\n', result.stdout);
    return;
  }

  await emailWelcome(customerEmail, orgName, subdomain, link);
  console.log(`✓ done. ${customerEmail} ← welcome email sent`);
});

// Health check (good for nginx/cron monitoring)
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`GleeWorld provision webhook listening on 127.0.0.1:${PORT}`);
});

// ── helpers ────────────────────────────────────────────────────────────────

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]/, x => 'g' + x) // ensure starts with a letter
    .slice(0, 20) || 'site';
}

function shortenName(s) {
  const words = String(s).split(/\s+/);
  return words.slice(0, 3).join(' ').slice(0, 30);
}

function pickUniqueSubdomain(base) {
  let candidate = base;
  let n = 0;
  while (existsSync(`/opt/supabase-${candidate}`)) {
    n += 1;
    candidate = `${base}${n}`;
    if (n > 50) throw new Error('cannot find a free subdomain');
  }
  return candidate;
}

async function emailWelcome(to, org, subdomain, recoveryLink) {
  if (!RESEND_KEY) {
    console.warn('RESEND_API_KEY not set, skipping welcome email. Link:', recoveryLink);
    return;
  }
  const siteUrl = `https://${subdomain}.${ROOT_DOMAIN}`;
  const subject = `Your ${org} site is live`;
  const text = `Welcome to GleeWorld!

Your site is ready: ${siteUrl}

Click this one-time link to set your password:
${recoveryLink}

Once you're in, you'll land on a quick setup wizard where you can upload your logo, set your brand color, and invite your members.

Need help? Just reply to this email.

— Kevin
GleeWorld
`;

  const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;color:#0f172a;max-width:560px;margin:32px auto;padding:0 16px;">
<h1 style="font-size:24px;">Welcome to GleeWorld 🎵</h1>
<p>Your site for <strong>${escapeHtml(org)}</strong> is live at <a href="${siteUrl}" style="color:#0071e3">${siteUrl}</a>.</p>
<p><a href="${recoveryLink}" style="display:inline-block;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#c084fc);color:#fff;font-weight:600;padding:14px 24px;border-radius:999px;text-decoration:none;">Set your password</a></p>
<p style="color:#64748b;font-size:14px;">Or paste this into your browser:<br><code style="font-size:12px;">${recoveryLink}</code></p>
<p>Once you sign in, a setup wizard will walk you through uploading your logo, picking a brand color, and inviting members.</p>
<p>Reply to this email anytime if you get stuck.</p>
<p>— Kevin<br>GleeWorld</p>
</body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `GleeWorld <${SENDER}>`,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`resend send failed (${resp.status}):`, body);
  }
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
      text: `Customer email: ${customerEmail}\n\nError:\n${err.slice(0, 4000)}`,
    }),
  }).catch(() => {});
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
