# Retirement Concert Page + Multi-Page Public Sites — Design

Approved by Kevin 2026-08-12 (conversation). Motivating request: a page on
Kevin's World for his retirement concert from Spelman — the flyer, the RSVP,
an "audition to sing with Doc" signup, and a best-wishes wall for past
students. "The RSVP form works now, don't break it, just move the function
to this page." Wall posting requires login (many graduates already
CSV-imported). Header must be able to drop/replace the site name per page.

## The platform feature: pages on public sites

The public-site builder today is single-page: `gw_site_blocks` rows
(tenant-scoped, ordered) snapshot into `gw_public_sites.published_blocks`
on publish; `get_public_site(p_slug)` serves the snapshot anonymously;
`PublicSiteView` renders it at `/sites/:slug` and on tenant domains via
`TenantLanding`.

Change, deliberately minimal:

- `gw_site_blocks.page text NOT NULL DEFAULT 'home'` — one new column.
  Every existing block is a `home` block. Page slugs are `[a-z0-9-]{2,40}`.
- Publish snapshot: each snapshotted block carries its `page`. Blocks
  without a `page` key in old snapshots read as `'home'` (renderer-side
  default) so nothing re-publishes on deploy day.
- `get_public_site` RPC: UNCHANGED (blocks pass through wholesale).
- `PublicSiteView` gains a `page` prop (default `'home'`) and filters.
  Pages other than home render the same theme + header/footer blocks THAT
  BELONG TO THAT PAGE — a page defines its whole block list; nothing is
  implicitly inherited. (Rationale: Kevin's first use case needs a
  different header on the subpage.)
- Routes: `/sites/:slug/:page` (generic), and on tenant hosts a
  LAST-RANKED `/:page` route (static app routes always outrank the dynamic
  segment in React Router v6) that renders the page if the published site
  has one, else the normal NotFound.
- Editor (`PublicPageEditor` + `useBlockPageEditor`): a page-tab strip
  (Home + any page slugs present + "New page"), blocks filtered by the
  active tab, and a per-block "Move to page…" control. Publishing stays
  whole-site (one snapshot).

## Back-compat guard: the printed QR code

Kevin's printed flyer QR points at the RSVP's current home (`/#rsvp`).
After the move, the home page has no rsvp block, so `PublicSiteView`
(home page only): if `location.hash === '#rsvp'` and the current page has
no `concert-rsvp` block but a sibling page does, replace-navigate to
`/<that-page>#rsvp`. Deterministic, no config.

## Header block

`showSiteName: boolean` (default `true`) joins the existing `siteName`
override in the header block config; editor exposes both. Per-page header
instances mean the retirement page's header can read
"Dr. Kevin Phillip Johnson & Friends" or nothing, homepage untouched.

## New block: `audition-signup`

Signed-in form ("Audition to sing with Doc" on this page; block is
tenant-neutral): voice part (select: Soprano 1/2, Alto 1/2, Tenor, Bass),
years/era sung (free text), phone, optional note. Name/email come from the
session. Signed-out visitors see the intro + a sign-in link that returns
to the page. One submission per user per tenant (upsert). Table:

```
gw_audition_signups (
  id uuid pk default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id(),
  user_id uuid not null,
  voice_part text not null,
  era text, phone text, note text,
  created_at timestamptz default now(),
  unique (tenant_id, user_id)
)
```

RLS: INSERT/UPDATE authenticated where `user_id = auth.uid()`; SELECT own
row or tenant admin. Tenant isolation via the platform's default
`current_tenant_id()` column default + trigger pattern.

## New block: `wishes-wall`

Public-readable wall, login to post. Composer at top (message ≤ 1000
chars + optional class year), posts render newest-first with the
poster's display name (profile full/preferred name), class year, message.
Posts appear immediately; tenant admins see a Hide control on every post
(and Unhide on hidden ones, rendered dimmed for admins only); authors can
delete their own. Copy uses "graduates", never "alumnae" (standing rule).

```
gw_wish_wall_posts (
  id uuid pk default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id(),
  user_id uuid not null,
  display_name text not null,
  class_year text,
  message text not null check (length(message) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz default now()
)
```

RLS: SELECT anon+authenticated where `hidden = false`, tenant admins all
rows; INSERT authenticated `user_id = auth.uid()`; UPDATE (hide/unhide)
tenant admin only; DELETE own row or admin. Anonymous reads filter by
tenant through a `gw_tenants!inner(slug)` join (TenantLanding pattern).

## Kevin's World assembly (data, not code)

Page slug `retirement` → yo-doc.com/retirement. Blocks in order:
1. `header` — nav back to home, `showSiteName:false` (or custom text, Kevin's call in the editor later)
2. `hero` — the flyer image full-bleed, no overlay text, CTA "RSVP" → `#rsvp`
3. `concert-rsvp` — THE EXISTING BLOCK ROW, `page` flipped to `retirement`, config untouched
4. `audition-signup` — "Audition to Sing with Doc"
5. `wishes-wall` — "Best Wishes for Doc"

Flyer file: pending from Kevin (pasted image only, not yet a file). Until
then the hero uses the event title styling; when the file arrives it also
becomes `gw_events.image_url` for the retirement-concert row so the RSVP
card shows it.

## Testing

- Block registry: new blocks registered, schema-valid default configs.
- PublicSiteView: page filtering (default home, unknown page → not-found,
  legacy snapshot blocks without `page` treated as home), QR redirect rule.
- wishes-wall: composer hidden when signed out; post renders; hide control
  admin-only (component tests, jsdom, mocked supabase per repo pattern).
- audition-signup: submit path validates voice part; signed-out prompt.
- Migration applied by hand (self-hosted; file is record-only).

## Out of scope

Page-level SEO metadata, per-page themes, page deletion UI (a page with
zero blocks simply disappears from tabs), moderation queue (instant posts
+ hide was the decision), email notifications on signups.
