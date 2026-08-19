# Auctions — email ingestion (tier 2)

Receives auction-house notification email at **auctions@inbound.gleeworld.org**
and turns it into auctions and lots. This is the spec's tier-2 ingestion: the
houses send these to us, which is what makes reading them legitimate where
scraping their sites would not be.

Depends on Phases 1 and 2 being applied.

## Why Resend, and why a subdomain

GleeWorld already sends all its mail through Resend, so `RESEND_API_KEY` is
already on the droplet — no new vendor, no new billing relationship. Resend
added inbound receiving, which fits the existing `receive-group-sms` webhook
pattern this codebase already runs.

**The root domain's MX must not be touched.** `gleeworld.org` points at
Purelymail, which is where `admin@gleeworld.org` and every other human
mailbox lives. Purelymail has no inbound webhook API, so it cannot feed the
app, and repointing the root MX would break all existing mail. Hence a
dedicated subdomain, `inbound.gleeworld.org`, which had no MX records.

## Architecture

```
auction house → auctions@inbound.gleeworld.org
              → Resend receives + stores
              → POST /functions/v1/auctions-inbound   (verify signature, fetch, store raw)
              → ext_auction_inbound_emails            (verbatim, nothing interpreted yet)
              → auctions-parse-email (cron)           (LLM → auctions + lots)
              → auctions-normalize (cron)             (reads each lot's specs)
```

Three deliberate splits:

**Receive and parse are separate functions.** Resend retries on timeout and an
LLM call takes seconds; a slow webhook would turn into duplicated work. The
webhook only verifies, fetches, and stores.

**Mail is stored verbatim before anything interprets it.** Parsing rules for
eight houses' formats will be wrong at first. Keeping the original means a bad
parse is re-runnable rather than a lost auction notice, and an unparseable
message is still visible to a human.

**Lots enter invisible.** Email-created lots keep `review_status = 'pending'`,
so members cannot see them until `auctions-normalize` has read their specs and
cleared them.

## Step 1 — apply the migration (DONE)

`supabase/migrations/20260818120300_auction_inbound_email.sql` — applied
2026-08-18. Creates `ext_auction_inbound_emails`, staff-only, with a unique
constraint on `(provider, provider_email_id)` so a webhook retry is a no-op.
Verified on prod as a rolled-back dry run first, including the retry case.

## Step 2 — deploy the functions (DONE)

`auctions-inbound` and `auctions-parse-email` deployed 2026-08-18. Both
verified to reject unauthenticated calls (401).

## Step 3 — Resend setup (YOURS — nothing works until this is done)

1. **Resend dashboard → Domains → Add domain**, enter `inbound.gleeworld.org`
   and enable receiving.
2. **Add the DNS records Resend shows you** — the receiving MX plus any
   verification TXT. Use their exact values; do not copy them from here, and
   **do not touch the MX on the root `gleeworld.org`**, which must keep
   pointing at Purelymail.
3. **Resend dashboard → Webhooks → Add endpoint**
   - URL: `https://supabase.gleeworld.org/functions/v1/auctions-inbound`
   - Event: `email.received`
4. **Copy the signing secret** (starts `whsec_`) and put it on the droplet:
   ```
   ssh root@198.211.113.144
   echo 'RESEND_INBOUND_SECRET=whsec_...' >> /opt/supabase/.env
   docker restart supabase-edge-functions
   ```
   Until this is set the webhook refuses **every** request — it fails closed
   rather than accepting unverified mail.
5. **Subscribe the houses.** Use `auctions@inbound.gleeworld.org` on each
   house's auction notification signup. Only do this where their terms allow
   it; record the position in `ext_auction_sources.notes` and set that
   source's `ingest_method` to `email`.

## Step 4 — schedule the parser

Off-peak for DeepSeek, after mail has had time to arrive, before the
normalizer at 12:00 UTC:

```sql
SELECT cron.schedule('auctions-parse-email', '45 11 * * *', $$
  SELECT net.http_post(
    url := 'https://supabase.gleeworld.org/functions/v1/auctions-parse-email',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb);
$$);
```

Full daily order once all four are scheduled: parse-email 11:45 → normalize
12:00 → match 12:30 → digest 13:00.

## Security notes

The webhook is a public endpoint, so it is the one place in this module where
untrusted input arrives. Protections, all covered by tests:

- **Svix signature verification** (HMAC-SHA256 over
  `${svix-id}.${svix-timestamp}.${raw body}`) using the raw request bytes.
- **Replay protection** — timestamps outside a five-minute window are refused,
  and the signature is bound to the message id so it cannot be moved onto
  another message.
- **Fails closed** on a missing header, unparseable timestamp, absent secret,
  or unknown signature version.
- **Constant-time comparison**, so a forged signature leaks nothing by timing.
- Extracted URLs are restricted to `http`/`https`, so a `javascript:` link in a
  listing can never be stored and later rendered.
- Sender-to-house matching is on a dot boundary, so `hgpauction.com.evil.test`
  cannot impersonate `hgpauction.com`.
- Raw mail is staff-only. Members see auctions and lots, never correspondence.

## Post-deploy QA (nothing below has been done)

1. Send a plain email from any address to `auctions@inbound.gleeworld.org`.
   Confirm a row appears in `ext_auction_inbound_emails` with `status =
   'pending'` and `source_id` NULL (unknown sender).
2. Confirm a forged POST to the webhook with a bad signature returns 401 and
   creates no row.
3. Forward a **real** auction-house email, run `auctions-parse-email` by hand,
   and read the returned `results` array before trusting anything it created.
4. Check that a sale it created looks right on `/auctions` — especially the
   dates, which are the field most likely to be misread.
5. Re-run the parser on the same email and confirm it does not create a
   duplicate sale or duplicate lots.

## Known limits

- **Parsing rules have never seen a real auction email.** The extraction is
  LLM-based precisely because the formats are unpredictable, and it is
  deliberately conservative — an unrecognised sender, an unreadable date, or a
  confidence below 0.6 flags the message for a human instead of writing a
  guess. Expect the first few real messages to need review, and expect to tune
  the threshold once there is evidence.
- Attachments are not read. Several houses attach the catalog as a PDF; that
  is a separate piece of work.
- A house that sends one email covering several sales will be flagged for
  review rather than split automatically.
