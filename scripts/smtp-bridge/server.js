// GleeWorld SMTP → Resend HTTPS bridge.
//
// Why this exists: DigitalOcean blocks outbound ports 25/465/587 by default.
// Supabase Auth (GoTrue) can only send mail via SMTP. This service runs
// locally on the droplet, looks like a normal SMTP server to GoTrue, but
// forwards every accepted message to Resend's HTTPS API instead.
//
// Configure GoTrue with:
//   SMTP_HOST=smtp-bridge   (or 127.0.0.1)
//   SMTP_PORT=1025
//   SMTP_USER=anything
//   SMTP_PASS=anything       (we don't validate creds — we're on localhost)
//
// Env vars (read from /etc/gleeworld-smtp-bridge.env via systemd):
//   RESEND_API_KEY     — required, Resend bearer token
//   BIND_PORT          — default 1025
//   ACCEPTED_FROM_DOMAINS — comma list, default '' (accept any). Reject if set
//                          and the From: domain isn't in the list.

import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { readFileSync, existsSync } from 'node:fs';

const PORT = Number(process.env.BIND_PORT || 1025);
const RESEND_KEY = process.env.RESEND_API_KEY;
const ALLOW_LIST = (process.env.ACCEPTED_FROM_DOMAINS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

if (!RESEND_KEY) {
  console.error('FATAL: RESEND_API_KEY env var is required.');
  process.exit(1);
}

const server = new SMTPServer({
  // No auth, no TLS. GoTrue will only send unauth+plain if its SMTP_USER
  // and SMTP_PASS are blank, so we configure the stacks that way.
  authOptional: true,
  disabledCommands: ['STARTTLS', 'AUTH'],
  size: 10 * 1024 * 1024, // 10 MB

  // Accept everything (we'll filter inside onData).
  onMailFrom(address, _session, callback) { callback(); },
  onRcptTo(address, _session, callback)   { callback(); },

  onData(stream, session, callback) {
    let chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', async () => {
      try {
        const raw = Buffer.concat(chunks);
        const parsed = await simpleParser(raw);

        const fromAddr = parsed.from?.value?.[0]?.address || '';
        const fromDom = fromAddr.split('@')[1]?.toLowerCase() || '';

        if (ALLOW_LIST.length && !ALLOW_LIST.includes(fromDom)) {
          console.warn(`✗ reject: from-domain ${fromDom} not in ACCEPTED_FROM_DOMAINS`);
          return callback(new Error(`From domain ${fromDom} not allowed.`));
        }

        const toList = (parsed.to?.value || []).map(a => a.address).filter(Boolean);
        const ccList = (parsed.cc?.value || []).map(a => a.address).filter(Boolean);
        const bccList = (parsed.bcc?.value || []).map(a => a.address).filter(Boolean);

        if (!toList.length && !ccList.length && !bccList.length) {
          // fall back to envelope recipients (RCPT TO)
          toList.push(...session.envelope.rcptTo.map(r => r.address));
        }

        const body = {
          from: parsed.from?.text || `GleeWorld <noreply@gleeworld.org>`,
          to: toList,
          subject: parsed.subject || '(no subject)',
          html: parsed.html || undefined,
          text: parsed.text || (parsed.html ? undefined : '(no body)'),
        };
        if (ccList.length) body.cc = ccList;
        if (bccList.length) body.bcc = bccList;
        if (parsed.headers.get('reply-to')) {
          body.reply_to = parsed.headers.get('reply-to').text;
        }

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const errBody = await resp.text();
          console.error(`✗ resend rejected (${resp.status}):`, errBody.slice(0, 400));
          return callback(new Error(`Resend error: ${resp.status}`));
        }

        const data = await resp.json().catch(() => ({}));
        console.log(`✓ sent → ${toList.join(', ')}  subject=${JSON.stringify(parsed.subject || '')}  id=${data.id || '?'}`);
        callback();
      } catch (err) {
        console.error('✗ bridge error:', err.message);
        callback(err);
      }
    });
  },
});

server.on('error', err => {
  console.error('smtp server error:', err.message);
});

// Bind to 0.0.0.0 so Docker containers can reach us via host-gateway.
// UFW already blocks port 1025 from the public internet (only 22/80/443 are
// open) so this is safe.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`GleeWorld SMTP→HTTPS bridge listening on 0.0.0.0:${PORT}`);
  if (ALLOW_LIST.length) console.log('Accepting From: domains:', ALLOW_LIST.join(', '));
});
