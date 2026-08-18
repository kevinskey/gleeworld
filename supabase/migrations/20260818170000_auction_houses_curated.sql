-- Auction houses — curated data load.
--
-- Phase 1 seeded eight houses as stubs: a name, a URL, and "ToS not yet
-- reviewed". This reads their actual terms and records what they say.
--
-- Every buyer_premium_pct here was quoted from the house's OWN terms page and
-- then re-verified independently against the live page before being written.
-- Where a house does not publish a fixed rate, the premium stays NULL — the
-- schema refuses a rate without a source URL precisely so an unverifiable
-- number can never reach the landed-cost maths.
--
-- The headline finding: the houses with the best medical inventory have the
-- STRICTEST anti-scraping terms, and none of them restrict email. Centurion
-- forbids "any robot, spider, other automatic device, or manual process";
-- Bidspotter forbids data mining AND building a database from their content
-- AND enabling others to; Public Surplus and AllSurplus both ban crawlers
-- outright. All four publish or permit auction-notification email. That
-- asymmetry is why the module's tier-2 ingestion is email and never scraping.
--
-- The one exception is GSA Auctions, which publishes a genuine public API with
-- a free self-serve key and no anti-automation clause — verified returning 781
-- active lots. That is the only sanctioned programmatic source of the eleven.
--
-- Applied to prod 2026-08-18; committed here so the curation is reproducible.
--
-- Self-hosted: record-only; apply by hand as supabase_admin, WITHOUT
-- --single-transaction (this file opens its own BEGIN/COMMIT).

BEGIN;

-- Every buyer_premium_pct below is quoted from the house's OWN terms page,
-- recorded with the URL it came from. Where a house does not publish a fixed
-- rate, the premium stays NULL rather than carrying a plausible-looking guess.

-- ── Heritage Global Partners ──────────────────────────────────────────────
-- 19% stated in their general terms; per-sale terms can supersede.
-- No anti-scraping clause anywhere in their terms; robots.txt permissive.
UPDATE ext_auction_sources SET
  base_url                 = 'https://www.hgpauction.com',
  buyer_premium_pct        = 19.00,
  buyer_premium_note       = '19% of the winning bid, per general terms s.7. Per-sale terms supersede. Additional 3% surcharge on credit card payment.',
  buyer_premium_source_url = 'https://www.hgpauction.com/terms-and-conditions/',
  terms_url                = 'https://www.hgpauction.com/terms-and-conditions/',
  terms_reviewed_at        = now(),
  terms_position           = 'email_ok',
  calendar_url             = 'https://www.hgpauction.com/auction-category/biotech-pharmaceutical-medical/',
  email_alerts_url         = 'https://hgpauction-4008550.hs-sites.com/email-alert-sign-up',
  notes                    = 'Terms reviewed 2026-08-18: no clause restricting automated access, and robots.txt is permissive. Public email-alert signup exists, so the email tier is the sanctioned path. Publishes roughly 3 months ahead. NOTE ON FIT: their recurring volume is lab and clinical diagnostics (analyzers, sample automation), not imaging iron — MRI/CT appear only occasionally.'
WHERE slug = 'heritage-global';

-- ── Centurion Service Group ───────────────────────────────────────────────
-- The strongest imaging fit of any house reviewed, and also the strictest
-- terms: crawling is forbidden outright, so this source can only ever be
-- manual or email.
UPDATE ext_auction_sources SET
  base_url                 = 'https://centurionservice.com',
  buyer_premium_pct        = 20.00,
  buyer_premium_note       = '20% of the hammer price, per their terms of sale. Additional 3% convenience fee on credit card payment. A legacy Bidspotter catalogue shows a different tiered 19/18/17% schedule, so treat 20% as the default and read each sale''s own terms.',
  buyer_premium_source_url = 'https://centurionservice.com/medical-auction-terms-of-sale',
  terms_url                = 'https://centurionservice.com/medical-auction-terms-of-sale',
  terms_reviewed_at        = now(),
  terms_position           = 'email_ok',
  calendar_url             = 'https://centurionservice.com/auction-calendar',
  email_alerts_url         = 'https://share.hsforms.com/1qkvL96ZrTsSD6fzs3Rkfiw11nvg',
  notes                    = 'DO NOT CRAWL. Terms reviewed 2026-08-18: "YOU will not use any robot, spider, other automatic device, or manual process to monitor or copy" their site or bidding platform — unusually broad, and it covers the marketing site too. Nothing restricts subscribing an address to their notification list, so EMAIL IS THE ONLY automated path here. Owned by TRIMEDX, trading under its own name. Warehouses Charlotte, Chicago, Phoenix. MRI and CT appear on the FIXED ASSETS track specifically; the radiology page is mostly C-arms and mammography.'
WHERE slug = 'centurion-service';

-- ── Bidspotter ────────────────────────────────────────────────────────────
-- Aggregator: the premium belongs to whichever auctioneer is hosting, so
-- there is deliberately no rate here.
UPDATE ext_auction_sources SET
  base_url                 = 'https://www.bidspotter.com/en-us/',
  terms_url                = 'https://www.bidspotter.com/en-us/about-us/legal/website-terms-and-conditions',
  terms_reviewed_at        = now(),
  terms_position           = 'email_ok',
  calendar_url             = 'https://www.bidspotter.com/en-us/auction-catalogues',
  email_alerts_url         = 'https://www.bidspotter.com/en-us/auction-alerts',
  notes                    = 'DO NOT CRAWL — the hardest prohibition of any source reviewed (2026-08-18). Their terms forbid "data mining, robots or similar data gathering", forbid building "a database ... by systematically and/or regularly downloading, caching, printing and/or storing" their material, and extend that to "enable or permit others to do so". Building a tracker by crawling them is precisely the described conduct. Their keyword Auction Alerts are free and explicitly offered, so email is the sanctioned channel. Premium is set per hosting auctioneer, never by the platform — do not store one here. ~2,750 medical lots listed. PARSER TRAP: "MRI Auctions" on this site is an auctioneer''s company name (Machinery Resources International), not the imaging modality.'
WHERE slug = 'bidspotter';

-- ── Hilco: retired from the tracked set ───────────────────────────────────
-- Kept rather than deleted so the reasoning survives and nobody re-adds it.
UPDATE ext_auction_sources SET
  name                     = 'Hilco Industrial',
  base_url                 = 'https://hilcoindustrial.com',
  terms_url                = 'https://hilcoindustrial.com/disclaimer-hilco-industrial',
  terms_reviewed_at        = now(),
  terms_position           = 'manual_only',
  active                   = false,
  notes                    = 'DEACTIVATED 2026-08-18 — not a useful source for medical imaging. Reviewed: their current and past sales are steel mills, die casting, refineries and packaging lines; no medical or diagnostic imaging auction found on any Hilco domain. They publish no dated auction calendar, their Bidspotter storefront is empty, and their bidding platform is dormant and blocks automated clients. Their premium is explicitly per-sale ("the rate of which will vary sale to sale"), so no default can be stored. Their disclaimer also restricts republishing their content. URL corrected: hilcoglobal.com is the holding company and runs no auctions; hilcoind.com and hilcobid.com now redirect to hilcoindustrial.com. Re-activate only if their US auction pipeline restarts.'
WHERE slug = 'hilco-industrial';

-- ── New houses ────────────────────────────────────────────────────────────

-- reLink: the highest-volume hospital disposition house found, and the best
-- imaging fit. No premium recorded: they do not publish one on their own site
-- and the 18% seen on Proxibid is third-party.
INSERT INTO ext_auction_sources (name, slug, base_url, ingest_method, terms_position, terms_reviewed_at, calendar_url, notes)
VALUES (
  'reLink Medical', 'relink-medical', 'https://relinkmedical.com', 'manual', 'unreviewed', NULL,
  'https://www.bidspotter.com/en-us/auction-catalogues/relinkm',
  'Added 2026-08-18. Highest-volume US hospital equipment disposition found; their own site advertises fixed imaging removal (MRI, CT, cath labs) plus mammography, linear accelerators, ultrasound and lab analyzers. Runs regular monthly sales, but hosts them on Proxibid and Bidspotter rather than its own site, so there is no calendar of its own to watch. Premium NOT published on their own site — an 18% internet premium appears on Proxibid only, which is third-party and not authoritative; some sales are advertised with no premium at all. Their own Terms of Use could not be separately verified — /terms/ serves terms-of-sale content — so terms remain UNREVIEWED and this source stays manual.'
) ON CONFLICT (slug) DO NOTHING;

-- Global Med Auctions: purpose-built medical surplus house, premium published.
INSERT INTO ext_auction_sources (name, slug, base_url, ingest_method, buyer_premium_pct, buyer_premium_note, buyer_premium_source_url, terms_url, terms_reviewed_at, terms_position, calendar_url, notes)
VALUES (
  'Global Med Auctions', 'global-med-auctions', 'https://globalmedauctions.com', 'manual',
  19.00,
  '19% on credit card, 15% on cash, ACH or bank wire. The higher rate is stored as the default so estimates lean conservative.',
  'https://globalmedauctions.com/faqs/',
  'https://globalmedauctions.com/faqs/', now(), 'manual_only',
  'https://globalmedauctions.com/auctions/',
  'Added 2026-08-18. Purpose-built medical surplus auction house (FL, NY, TX) running monthly sales. C-arms confirmed in real lots (GE OEC 9900 Elite, Siemens Arcadis Avantic) along with ultrasound systems and probes. Sales are hosted on HiBid rather than a dated calendar of their own. No email-alert signup found, so manual entry for now.'
) ON CONFLICT (slug) DO NOTHING;

-- A.J. Willner: episodic rather than specialist, but real imaging has moved
-- through their bankruptcy sales, and they publish a dated calendar.
INSERT INTO ext_auction_sources (name, slug, base_url, ingest_method, buyer_premium_pct, buyer_premium_note, buyer_premium_source_url, terms_reviewed_at, terms_position, calendar_url, notes)
VALUES (
  'A.J. Willner Auctions', 'aj-willner', 'https://www.ajwillnerauctions.com', 'manual',
  15.00,
  '15% on the online bidding platform, plus a 3% card processing fee. Set per auction — there is no site-wide premium page — so confirm on each sale.',
  'https://www.ajwillnerauctions.com/auctions/detail/bw69883',
  now(), 'manual_only',
  'https://www.ajwillnerauctions.com/auctions/current-auctions',
  'Added 2026-08-18. New Jersey bankruptcy and receivership auctioneer running 100+ sales a year. EPISODIC, not a medical specialist — but genuine imaging has moved through their sales (an Open MRI centre liquidation carried a Hitachi Airis II 0.3T MRI, a Siemens Somatom Sensation 4 CT, Hitachi ultrasound and a Siemens radiology suite). Publishes a dated current-auctions page and has an inline email signup with no standalone URL.'
) ON CONFLICT (slug) DO NOTHING;

-- Neither publishes a fixed buyer's premium, so neither gets one. Both ban
-- crawling outright and both permit email notifications, which is exactly the
-- asymmetry the module's email tier was built for.

-- ── Public Surplus ────────────────────────────────────────────────────────
UPDATE ext_auction_sources SET
  base_url          = 'https://www.publicsurplus.com',
  terms_url         = 'https://www.publicsurplus.com/sms/login/plainTermsAndConditions',
  terms_reviewed_at = now(),
  terms_position    = 'email_ok',
  calendar_url      = 'https://www.publicsurplus.com/sms/browse/cataucs?catid=23',
  notes             = 'DO NOT CRAWL. Terms reviewed 2026-08-18, Buyer Agreement s.1.5(v): "You will not use any robot, spider, other automatic device, or manual process to monitor or copy our web pages". s.6.8 also claims copyright over all site content, which constrains storing and redisplaying their listings, not just fetching them. Email is clean and affirmatively consented in s.1.7 ("we may send future correspondence ... that notifies you of auction items that we believe might interest you") — allowlist notices@publicsurplus.com. NO PREMIUM STORED: there is no site-wide rate; each seller sets its own, observed 0-10.5% with a $1 minimum on several, so it must be read per listing. NO CALENDAR: this is continuous item-level bidding, not scheduled sale events. Medical is category 23 with an IMAGING subcategory (2304) — the most directly useful category found on any government-surplus site.'
WHERE slug = 'public-surplus';

-- ── AllSurplus ────────────────────────────────────────────────────────────
UPDATE ext_auction_sources SET
  base_url          = 'https://www.allsurplus.com',
  terms_url         = 'https://www.allsurplus.com/content/site-terms',
  terms_reviewed_at = now(),
  terms_position    = 'email_ok',
  calendar_url      = 'https://www.allsurplus.com/events',
  email_alerts_url  = 'https://www.allsurplus.com/account/savedsearches',
  notes             = 'DO NOT CRAWL. Terms reviewed 2026-08-18, User Agreement s.2(m): "use spiders, crawlers, robots or any other similar means to access our Site or substantially download, reproduce or archive any portion of our Site, or otherwise engage in any data-mining activities". Their front end calls an undocumented internal API at maestro.lqdt1.com — do NOT build against it; there is no public contract and using it would collide with s.2(m) anyway. Email is the sanctioned path and the strongest of any source here: saved-search alerts are a first-class feature with "coming soon", "latest online" and "ending soon" cadences. NO PREMIUM STORED: their terms define it only as "the Service fees charged ... as expressly stated in a Seller''s Listing" and publish no rate anywhere, so it is per-listing. CATEGORY TRAP: their /x-ray-inspection-systems category is INDUSTRIAL PCB inspection, not clinical radiology. Live medical inventory could not be confirmed — the site is an SPA that blocks non-browser clients — so its real imaging volume is still unproven.'
WHERE slug = 'allsurplus';

-- ── GSA Auctions ──────────────────────────────────────────────────────────
-- The only source reviewed with a genuinely sanctioned automated path: an
-- official public API, free self-serve key, no partner agreement, and no
-- anti-automation clause in their terms.
UPDATE ext_auction_sources SET
  base_url          = 'https://gsaauctions.gov',
  terms_url         = 'https://gsaauctions.gov/auctions/terms-conditions',
  terms_reviewed_at = now(),
  terms_position    = 'api_ok',
  calendar_url      = 'https://gsaauctions.gov/auctions/home',
  email_alerts_url  = 'https://public.govdelivery.com/accounts/USGSAAUCTIONS/subscriber/new',
  notes             = 'OFFICIAL PUBLIC API — the cleanest ingestion path of any source here. GET https://api.gsa.gov/assets/gsaauctions/v2/auctions?api_key=... ; free self-serve key at api.data.gov/signup, no partner agreement, 5,000 calls/day. Verified 2026-08-18: HTTP 200, 2.6MB, 781 active lots. It is a WHOLE-DATASET DUMP with no query parameters — pull on a schedule and filter locally. v1 is gone (404). Terms reviewed 2026-08-18: no scraping, robot or data-mining clause of any kind, and no robots.txt. PREMIUM UNKNOWN, deliberately not stored: their FAQ asks the buyer''s-premium question and answers only about sales tax, and the word "premium" appears nowhere in their terms. They never state a rate AND never state zero — do not default it to 0 silently; confirm with gsaauctionshelp@gsa.gov before it feeds cost maths. REGISTER AS A COMPANY, not a shared individual account: their terms limit individuals to one account and hold the account holder liable for anything bid under it. The "Subscribe" link in their own header is broken — use the GovDelivery URL. FIT: 38 of 781 active lots are medical by item name, and they are carts, beds, exam tables and endoscopy stacks rather than imaging iron.'
WHERE slug = 'gsa-auctions';

-- ── GovDeals ──────────────────────────────────────────────────────────────
-- Same Liquidity Services terms as AllSurplus: crawling banned, email fine.
UPDATE ext_auction_sources SET
  base_url          = 'https://www.govdeals.com/en/',
  terms_url         = 'https://www.govdeals.com/en/content/site-terms',
  terms_reviewed_at = now(),
  terms_position    = 'email_ok',
  calendar_url      = 'https://www.govdeals.com/en/events',
  email_alerts_url  = 'https://www.govdeals.com/en/account/register',
  notes             = 'DO NOT CRAWL. Terms reviewed 2026-08-18, User Agreement s.2: "use spiders, crawlers, robots or any other similar means to access our Site or substantially download, reproduce or archive any portion of our Site, or otherwise engage in any data-mining activities". Same Liquidity Services terms as AllSurplus. NOTE THE CONFLICT: their robots.txt is permissive (crawl-delay 5, six public sitemaps) — it does NOT override the User Agreement, which also survives termination. Email is clean and consent is explicit at registration; saved searches on the medical and laboratory categories generate the notification mail we ingest. Register with the Company field filled in. NO PREMIUM STORED: their terms define it only as "the Service fees charged ... as expressly stated in a Seller''s Listing", it is shown per lot in the bid box, and ten live listings sampled showed none at all. Third-party sources quoting 7.5-12.5% are not verifiable on their site. SEARCH PARAM TRAP: the keyword parameter is kWord — using keywords= is silently ignored and returns the entire unfiltered corpus (~26,000 results).'
WHERE slug = 'govdeals';

COMMIT;

NOTIFY pgrst, 'reload schema';
