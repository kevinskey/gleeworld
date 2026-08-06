#!/usr/bin/env python3
"""Add a box-office branch to the PLATFORM /stripe-webhook dispatcher.

Tickets sold by a tenant flagged gw_tenants.uses_platform_stripe are charged
on the platform account, so their checkout.session.completed arrives at
/stripe-webhook rather than /stripe-connect-webhook. The existing
handleConnectCheckoutCompleted is account-agnostic (it reads only
metadata.order_id, session.id, session.payment_intent), so we reuse it.

Also hardens that handler with the UUID guard the file already defines for
exactly this purpose -- it now receives ids from two dispatchers.
"""
import re
import sys

PATH = '/opt/gleeworld-provision-webhook/server.js'
src = open(PATH).read()
orig = src

# ── 1. Platform dispatcher: route box-office sales before the store branch ──
# Anchor on the case label so the new branch lands ABOVE the store-sale
# comment, keeping each comment attached to the branch it describes.
old_dispatch = """      case 'checkout.session.completed':
        // Store sale (GleeWorld Store on the platform account) — dispatch"""

new_dispatch = """      case 'checkout.session.completed':
        // Box-office ticket sale charged on the PLATFORM account (a tenant
        // flagged gw_tenants.uses_platform_stripe -- the platform operator's
        // own tenant, which cannot Connect an account to itself). Same
        // fulfillment path as the Connect route; only the account differs.
        // MUST precede the store branch: both carry metadata.store_type.
        if (event.data.object.metadata?.store_type === 'box-office') { await handleConnectCheckoutCompleted(event.data.object); break; }
        // Store sale (GleeWorld Store on the platform account) — dispatch"""

if "store_type === 'box-office'" in src:
    print('dispatch: already patched')
elif old_dispatch in src:
    src = src.replace(old_dispatch, new_dispatch, 1)
    print('dispatch: patched')
else:
    sys.exit('FATAL: platform dispatch block not found -- aborting without writing')

# ── 2. UUID guard on the shared fulfillment handler ─────────────────────────
old_guard = """  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.log('connect checkout.session.completed without order_id metadata — not a box-office sale');
    return;
  }"""

new_guard = """  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.log('checkout.session.completed without order_id metadata — not a box-office sale');
    return;
  }
  // This handler is reached from both the Connect and the platform dispatcher,
  // and orderId is interpolated into a $$-quoted SQL literal below. A real
  // UUID cannot contain "$$", so validating the shape closes the breakout.
  if (!UUID_RE.test(orderId)) {
    console.error('refusing to fulfill: order_id is not a uuid', JSON.stringify(orderId).slice(0, 120));
    return;
  }"""

if 'refusing to fulfill: order_id is not a uuid' in src:
    print('uuid guard: already patched')
elif old_guard in src:
    src = src.replace(old_guard, new_guard, 1)
    print('uuid guard: patched')
else:
    sys.exit('FATAL: fulfillment guard block not found -- aborting without writing')

if src == orig:
    print('no changes needed')
else:
    open(PATH, 'w').write(src)
    print('wrote', PATH)
