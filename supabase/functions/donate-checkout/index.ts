// Edge function: server-side donation intake + Stripe Checkout hand-off for
// GleeWorld peer-to-peer Giving pages.
//
// Modeled directly on store-checkout: the client sends an amount but NEVER a
// price it invented for a product, and every trust decision (is this
// fundraiser live, does this tenant have the add-on, which Stripe account
// collects, is this amount inside the campaign's own bounds) is re-resolved
// here from the database. The pending gw_donations row is written before we
// ever talk to Stripe so the Connect webhook has something to promote on
// metadata.order_id.
//
// Money posture: 0% platform fee, permanently. This is a Connect DIRECT
// charge on the tenant's own account and `applicationFeeCents` is
// deliberately never passed — GleeWorld is not in the money path and takes
// no cut. Do not add one here without changing the product's public promise.
//
// GleeWorld is NOT a 501(c)(3) and never asserts deductibility on its own
// behalf; the receipt language comes from the tenant's own attestation
// stored on the fundraiser row.
import { createCheckout, type LineItem } from '../_shared/payments/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE_URL = Deno.env.get('GW_PUBLIC_SITE_URL') ?? 'https://gleeworld.org';
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;

async function pg(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`pg ${path} ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Donor-supplied free text lands on a public wall. Cap it and strip control
 *  characters so a message can't smuggle layout or newline-flood the page. */
function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return s.length ? s : null;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      fundraiser_slug, participant_slug, amount_cents, cover_fee,
      donor_name, donor_email, message, is_anonymous, hide_amount,
    } = body ?? {};

    if (typeof fundraiser_slug !== 'string' || !SLUG_RE.test(fundraiser_slug)) {
      return j({ error: 'bad fundraiser' }, 400);
    }
    if (participant_slug != null && (typeof participant_slug !== 'string' || !SLUG_RE.test(participant_slug))) {
      return j({ error: 'bad participant' }, 400);
    }
    if (!Number.isInteger(amount_cents)) return j({ error: 'amount must be whole cents' }, 400);
    const email = typeof donor_email === 'string' ? donor_email.trim() : '';
    if (!email || !email.includes('@') || email.length > 254) return j({ error: 'valid donor_email required' }, 400);

    // Card-testing defense, same shape as store-checkout. A donation form is
    // a favourite target precisely because the donor picks the amount.
    // Trusted client IP: nginx overwrites X-Real-IP with $remote_addr, so
    // prefer it and otherwise take the LAST (proxy-appended) X-Forwarded-For
    // hop, never the client-controllable first entry.
    const xff = req.headers.get('x-forwarded-for');
    const ip = (req.headers.get('x-real-ip')
      ?? (xff ? xff.split(',').map(s => s.trim()).filter(Boolean).pop() : '')
      ?? '').trim();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await pg(
      `gw_store_checkout_attempts?or=(ip.eq.${encodeURIComponent(ip)},email.eq.${encodeURIComponent(email)})&created_at=gte.${since}&select=id`,
    );
    if (Array.isArray(recent) && recent.length >= 5) return j({ error: 'too many attempts, try again later' }, 429);
    await pg('gw_store_checkout_attempts', { method: 'POST', body: JSON.stringify({ ip, email }) });

    // Resolve the campaign server-side — status, window, bounds, and the
    // owning tenant all come from the row, never from the request.
    const frows = await pg(
      `gw_fundraisers?slug=eq.${encodeURIComponent(fundraiser_slug)}&select=id,tenant_id,name,status,opens_at,closes_at,min_gift_cents,max_gift_cents,fee_cover_enabled,fee_cover_bps,allow_participants`,
    );
    const f = Array.isArray(frows) && frows[0];
    if (!f) return j({ error: 'fundraiser not found' }, 404);
    // Table vocabulary is draft/active/closed/cancelled; the UI's is
    // draft/live/closed. This reads the table's, so 'active' is "live".
    if (f.status !== 'active') return j({ error: 'this fundraiser is not accepting donations' }, 400);
    const now = Date.now();
    if (f.opens_at && new Date(f.opens_at).getTime() > now) return j({ error: 'this fundraiser has not started yet' }, 400);
    if (f.closes_at && new Date(f.closes_at).getTime() < now) return j({ error: 'this fundraiser has ended' }, 400);
    if (amount_cents < f.min_gift_cents || amount_cents > f.max_gift_cents) {
      return j({ error: `gift must be between $${(f.min_gift_cents / 100).toFixed(2)} and $${(f.max_gift_cents / 100).toFixed(2)}` }, 400);
    }

    // Add-on gate.
    const subs = await pg(
      `gw_tenant_subscriptions?tenant_id=eq.${encodeURIComponent(f.tenant_id)}&module_id=eq.giving&select=status`,
    );
    const enabled = Array.isArray(subs) && subs.some((s: any) => ['active', 'trial'].includes(s.status));
    if (!enabled) return j({ error: 'Giving add-on not enabled' }, 403);

    // Which Stripe account collects. Resolved BEFORE any gw_donations row is
    // written, so a tenant with the add-on but no connected account can't be
    // used to spam pending rows (the store-checkout lesson).
    const trows = await pg(`gw_tenants?id=eq.${encodeURIComponent(f.tenant_id)}&select=stripe_account_id`);
    const account = (Array.isArray(trows) && trows[0]?.stripe_account_id) || null;
    if (!account) return j({ error: 'this organization has not finished connecting Stripe yet' }, 400);

    // Participant attribution. A gift to a participant who is not public /
    // not consented is redirected to the general fund rather than rejected —
    // the donor already decided to give and should not lose that.
    let participantId: string | null = null;
    let participantName: string | null = null;
    let groupId: string | null = null;
    if (participant_slug && f.allow_participants) {
      const prows = await pg(
        `gw_fundraiser_participants?fundraiser_id=eq.${encodeURIComponent(f.id)}&slug=eq.${encodeURIComponent(participant_slug)}&is_public=eq.true&select=id,display_name,group_id,consent_granted_at`,
      );
      const p = Array.isArray(prows) && prows[0];
      if (p && p.consent_granted_at) {
        participantId = p.id;
        participantName = p.display_name;
        groupId = p.group_id ?? null;
      }
    }

    // Optional processing-fee cover. Computed HERE from the campaign's own
    // basis points — the client's `cover_fee` is a yes/no, not an amount.
    const feeCover = (cover_fee === true && f.fee_cover_enabled)
      ? Math.round(amount_cents * (f.fee_cover_bps / 10000))
      : 0;

    const donation = (
      await pg('gw_donations', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: f.tenant_id,
          fundraiser_id: f.id,
          participant_id: participantId,
          group_id: groupId,
          amount_cents,
          fee_cover_cents: feeCover,
          donor_name: clean(donor_name, 80),
          donor_email: email,
          message: clean(message, 280),
          is_anonymous: is_anonymous === true,
          hide_amount: hide_amount === true,
          status: 'pending',
        }),
      })
    )?.[0];
    if (!donation?.id) return j({ error: 'could not start donation' }, 500);

    const giftLabel = participantName
      ? `Donation to ${participantName} — ${f.name}`
      : `Donation — ${f.name}`;
    const lineItems: LineItem[] = [{ name: giftLabel, unitPriceCents: amount_cents, quantity: 1 }];
    if (feeCover > 0) {
      lineItems.push({ name: 'Cover processing fee', unitPriceCents: feeCover, quantity: 1 });
    }

    const base = `${SITE_URL}/give/${encodeURIComponent(fundraiser_slug)}`;
    const { url } = await createCheckout('stripe', {
      account,
      lineItems,
      orderId: donation.id,
      // Routes the Connect webhook to the donation handler rather than the
      // merch-store one; both ride the same metadata.store_type dispatch.
      storeType: 'giving',
      successUrl: `${base}/thanks?d=${donation.id}`,
      cancelUrl: participant_slug ? `${base}/${encodeURIComponent(participant_slug)}` : base,
      buyerEmail: email,
      // 0% platform fee — applicationFeeCents intentionally omitted.
      metadata: {
        donation_id: donation.id,
        fundraiser_slug,
        ...(participant_slug ? { participant_slug } : {}),
      },
    });

    return j({ url, donation_id: donation.id });
  } catch (e) {
    console.error('[donate-checkout]', e);
    return j({ error: 'donation could not be started' }, 500);
  }
}

Deno.serve(handler);
