## Fan / public experience — ground-truth fact sheet

All fan-facing pages are wrapped in `PublicRoute`, a pass-through that renders children with **no authentication** (`src/App.tsx:461-463`). Anonymous visitors reach every page below. Each tenant is served on its own subdomain (`<slug>.gleeworld.org`); the tenant is resolved from `window.__TENANT_CONFIG__.tenant` and the `x-tenant-slug` header, so a fan sees only that tenant's events (`src/pages/public/ConcertTicketsPublicPage.tsx:88-91`; `src/lib/boxOffice/api.ts:45-48`).

### Public routes (fan URLs)
| URL | Page | File |
|-----|------|------|
| `/box-office` and `/concert-tickets` | Box Office index (event listing) | `src/App.tsx:2013-2028` |
| `/concert-tickets/:slug` | Single-event ticket-buy page | `src/App.tsx:2005-2012` |
| `/tickets/:token` | Buyer's order + tickets (QR) | `src/App.tsx:2029-2036` |
| `/program/:slug` | Published concert program | `src/App.tsx:1552-1556` |
| `/public-calendar` | Public calendar | `src/App.tsx:1997-2004` (not read in depth) |

### Box Office index — `/box-office` (`src/pages/public/BoxOfficeIndexPage.tsx`)
- Hero titled "GleeWorld Box Office" / "Upcoming concerts and events. Pick a show to buy tickets."; gradient uses the tenant's `primary_color` (`:107-113`, `:79-91`).
- Lists events with `box_office_status = 'published'` whose `start_date` is not more than ~6h past, soonest-first; events without a `box_office_slug` are dropped (`:34-44`).
- Soonest event = large FeaturedCard; the rest under an "Also upcoming" grid (`:76-77`, `:130-145`).
- Cards show date plaque, title, time, venue, description, and "From $X" (cheapest tier) (`:159-231`, `:152-157`).
- Badges: "Sold out" when remaining across tiers = 0; "Only N left" when remaining ≤ 20; remaining = Σ(`quantity_total − quantity_sold`) (`:170-189`, `:60-65`). Free tiers show "Free" (`:152-156`).
- Empty state: "No concerts on sale right now" (`:120-127`). Clicking → `/concert-tickets/<slug>` (`:175`, `:250`).

### Ticket-buy page — `/concert-tickets/:slug` (`src/pages/public/ConcertTicketsPublicPage.tsx`)
- Loads event by `box_office_slug` where `box_office_status='published'`; else "Event not found / Tickets aren't on sale for this event, or the link is wrong." (`:49-67`, `:117-125`).
- Shows image, title, full date/time, venue, full description (`:184-213`).
- "Choose your tickets" lists tiers (name, description, "$X.XX", "N left"/"Sold out"); sold-out tiers disabled; defaults to first available (`:139-147`, `:220-257`).
- Form: **Quantity** (1..remaining), computed **Total**, **Your name**, **Email for your tickets** (`:259-296`). Requires name + valid email + in-range quantity (`:153-157`). Form hidden if selected tier has no availability (`:259`).
- Footer: "Secure checkout via Stripe. You'll receive your tickets by email." (`:293-295`).
- "Continue to payment" calls `box-office-checkout`, then redirects browser to the returned Stripe hosted-checkout URL (`:159-174`).
- Returning from a cancelled checkout (`?cancelled=1`) shows amber "Your checkout was cancelled — no card was charged. Pick a tier below to try again." (`:99`, `:104-112`).

### Checkout backend — `box-office-checkout` (`supabase/functions/box-office-checkout/index.ts`)
- Server re-resolves tenant/event/tier; rejects if tenant lacks a Stripe Connect account or charges disabled ("This tenant is not yet set up to sell tickets"), or remaining < quantity ("Only N ticket(s) left…") (`:130-162`). Quantity clamped 1..20 (`:118`).
- Pre-creates a `gw_ticket_orders` row `status='pending'` with a 256-bit random `access_token` (`:164-183`).
- Stripe **Checkout Session** = **direct charge on the tenant's connected account** (`Stripe-Account` header), `mode=payment`, line-item named "`<Event> — <Tier>`" (`:185-228`).
- **Fee:** paid tickets set `application_fee_amount = max(1, round(amount × 0.01))` — a **1% platform fee** (comment cites pricing page "+1% of ticket sales"); skipped for free/comp orders (`:203-211`). (See verify — memory says 0%.)
- `success_url` → `/tickets/<access_token>`; `cancel_url` → buy page `?cancelled=1` (`:213-216`). Stripe error → order marked `failed` (`:230-236`).

### Order / tickets page — `/tickets/:token` (`src/pages/public/TicketsOrderPage.tsx`)
- Reached after Stripe success and also emailed to the buyer for re-opening at the door (`:1-10`).
- Reads state via `box-office-order-status` keyed on the `access_token` (never direct RLS) (`:52-73`; `supabase/functions/box-office-order-status/index.ts:1-8`). Polls every 2s while `pending`, then stops (`:56-60`).
- States: **pending** → "Processing your payment" (after 30s notes tickets also arrive by email) (`:119-151`); **paid**/**comp** → "You're in" + one card per ticket; comp reads "Complimentary tickets — show the QR codes below at the door." (`:154-189`); **failed** → "Payment didn't go through / Your card wasn't charged." + "Try again" (`:257-278`); **refunded** → "Refunded" (`:280-294`); no order → "Order not found / That link is wrong or has expired. Check the email we sent you…" (`:95-104`).
- Each ticket renders a **QR code** (canvas, 240px, encodes ticket token) + tier, "N of M", event, buyer name. "Already redeemed" (grayed) / "Voided" states shown (`:191-255`). Canvas QR is long-pressable on iOS to save/share (`:203-212`).

### Comp-ticket requests (signed-in fans only) (`src/pages/public/ConcertTicketsPublicPage.tsx:308-472`)
- "Need comp tickets?" CTA appears only when event `box_office_request_max != null` **and** the visitor is signed in; anon never see it (`:332-336`).
- Dialog: quantity (1..max), tier preference, name, email, optional message (`:367-461`).
- Submits via `box-office-submit-request`, which requires a signed-in session (401 otherwise), event `published` + requests enabled, caps quantity, blocks >1 pending request per user/event (`supabase/functions/box-office-submit-request/index.ts:48-118`).
- Success toast: "Request submitted — we'll email you when it's decided." Organizer approves/denies in admin; approval mints comps (`:410`).

### Public concert program — `/program/:slug` ("following a program") (`src/pages/public/PublicConcertProgramPage.tsx`)
- A published program the audience opens on phones (shared link / QR) to read along; there is **no follow/subscribe account feature** — it is a static published view (`:1-9`).
- Readable only when published: fetched by `published_slug`; anon RLS returns program/pieces/roster only when the parent program is published (`:32-53`).
- Themed card stack matching the organizer's "Audience view," admin-hidden cards dropped, no editor chrome (`:97-99`). Cards: hero cover (title, subtitle, conductor, accompanist, venue, date), timeline of numbered pieces (composer/arranger), per-piece performance notes, roster grid (sections + member names), rights/licensing footer, and a "Share this program" card showing the public URL (`:117-238`). Print-optimized (`:106-114`).
- Unknown/unpublished slug: "Program not found / This program may have been unpublished or moved." + Home link (`:81-95`).
- Organizers generate the QR + copyable URL from the Concert Planner editor; a "QR lobby flyer" print format hides all but hero + QR (`src/pages/dashboard/ConcertPlannerEditorPage.tsx:11,258-259,568`; `src/lib/concertPlanner/cards.ts:29-30,51`).

### Plan / entitlement gating
- Fan-facing pages are **not** plan-gated — `PublicRoute` renders unconditionally (`src/App.tsx:461-463`).
- The `box_office` **module** gate controls only the tenant's authenticated app: the admin "Box Office" nav item (`adminOnly`) and in-app "Tickets" grid item (`src/lib/navigation/navCatalog.ts:82,84`; resolution `:109-110`; `src/lib/navigation/moduleFlags.ts:9,15`).
- Whether a tenant can sell is gated at checkout by Stripe Connect status (`stripe_account_id` + `stripe_charges_enabled`), not plan tier (`supabase/functions/box-office-checkout/index.ts:136-138`).
- "Box Office included" is a feature of the **Institution** plan ($199/mo) (`src/lib/planTiers.ts:100-108`).

### Public-site "Buy tickets" marketing block (`src/components/public-site/blocks/concert-tickets.tsx`)
- Separate from Box Office: a page-builder block rendering a static grid of shows (title, date, venue, "From $X", image) each linking to an arbitrary external `ticketUrl` (new tab). No `gw_events`/tier integration (`:9-84`).
