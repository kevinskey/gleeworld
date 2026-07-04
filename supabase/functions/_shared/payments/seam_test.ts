import { verifyAndParseWebhook } from './index.ts';
// A checkout.session.completed fixture (payment_status: 'paid', metadata.order_id set).
const raw = JSON.stringify({ type:'checkout.session.completed', data:{ object:{
  id:'cs_1', payment_intent:'pi_1', amount_total:3000, payment_status:'paid',
  metadata:{ order_id:'ord_1', store_type:'tenant' } }}});
// With verification stubbed for test (VERIFY_SKIP=1), parsing must normalize correctly.
Deno.env.set('PAYMENTS_TEST_SKIP_VERIFY','1');
const p = await verifyAndParseWebhook('stripe', raw, 'sig', 'whsec_x');
if (p.orderId !== 'ord_1' || !p.paid || p.paymentIntentId !== 'pi_1' || p.amountCents !== 3000) {
  throw new Error('parse mismatch: ' + JSON.stringify(p));
}
console.log('seam parse test passed');
