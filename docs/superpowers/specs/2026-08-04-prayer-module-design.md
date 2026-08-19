# GleeWorld Prayer — Add-on Proposal

**Date:** 2026-08-04
**Status:** Proposal for review (no code written)
**Decisions locked with Kevin:** Catholic-first / ecumenical-capable · individual *and* group prayer, any time · public-domain + original content, license later · roster-only membership for v1

---

## 1. Why this belongs in GleeWorld and not as a standalone app

Three things in the codebase already point at it:

1. **`gw_liturgy_masses` (Liturgy Planner, migration `20260629220000`)** stores `observation`, `sunday_cycle`, `liturgical_season`, and five reading fields — and the migration's own comment says *"Readings (free text for v1; v2 hooks up the lectionary lookup)."* Prayer's calendar layer is that lookup.
2. **Music Library / Repertoire search** already holds each tenant's anthems. Readings + repertoire in one database means "today's Gospel is the Bread of Life discourse → here are six communion anthems you already own that fit." **No prayer app can do this. No church-app platform does it well.** This is the moat.
3. **Module gating already exists** — `v_tenant_active_modules` + `useModuleAccess(moduleId)`. Prayer registers as one more add-on; no new infrastructure.

Standalone, this is a me-too Hallow clone. Inside GleeWorld it is the only prayer product that knows what the choir is singing on Sunday.

---

## 2. Competitive research

| App | What it does well | What it costs | Lesson for us |
|---|---|---|---|
| **Hallow** | 10,000+ guided audio sessions; 5/10/15-min length options; Gregorian chant beds; offline; "Hallow Family" sharing; Hallow AI grounded in Catechism/Fathers/papal docs. Partners with institutions (St. John's University, Mar 2026). | ~$4/mo consumer | Audio is the moat, and length-choice is the retention trick. Institutional partnerships are the distribution model — that's our channel. |
| **Lectio 365** (24-7 Prayer) | Morning (Lectio Divina) / Midday (Lord's Prayer) / Night (Ignatian Examen). 7-day advance download; 30-day favorites. 50M prayer sessions in 2025; 330k MAU. | Free | The **three-times-daily rhythm** is the proven structure. Copy it. |
| **iBreviary / Universalis / Divine Office** | Full Liturgy of the Hours with proper calendar; licensed official texts. | Universalis $9.99 one-time | LOTH requires ICEL/hierarchy licensing. Out of scope for v1 — say so plainly. |
| **Laudate** | Free all-in-one reference shelf; 8 languages. | Free | Breadth without depth. Don't chase it. |
| **Amen** (Augustine Institute) | Catholic Bible + prayer, institutional backing. | Free | Institutional credibility matters in this category. |
| **Echo Prayer** | Prayer lists, tags, push reminders, **mark as answered**, prayer circles, church feeds. | Free; ECHO+ to *create* feeds | The intention lifecycle (request → prayed → answered) is the emotional core. Steal it wholesale. |
| **PrayerMate** | Secure small-group sharing; church-wide feeds. | Free / platform tier | Confirms the two-tier model: private circles + org-wide feed. |
| **myParish** (Diocesan) | Whole-parish app: readings, prayers, bulletins. | **$199 setup + $49/mo** | Our price ceiling anchor. A *whole parish app* is $49/mo — a prayer module inside GleeWorld must sit well below it. |
| **Subsplash / Tithe.ly** | Full church platforms. | $149–350/mo · $72–119/mo | Confirms churches do pay real SaaS money; prayer alone doesn't justify that. |

### The counter-lesson: no streaks

There is an active backlash in this category. Multiple 2026 reviews criticize "shame-based streak systems that make you feel worse when you miss a day," and competitors now market on *"no streaks, no guilt, no gamification."* The sharpest framing found: *"Does it serve your prayer life, or does your prayer life serve its engagement metrics?"*

For a product sold to churches and schools, shame mechanics are also a liability. **Recommendation: GleeWorld Prayer ships with no streaks, ever.** Instead, a **Rule of Life** — the user declares an intended rhythm (e.g. morning + night, Mon–Fri), and sees a neutral, non-punitive review. Missed days appear without penalty language. This is both the pastorally right call and a marketable differentiator.

---

## 3. Content strategy — the honest part

**The code is the easy half. The content is the product.**

### What is free and safe to use

| Layer | Source | License | Notes |
|---|---|---|---|
| Liturgical calendar | **romcal** (npm) | **MIT** (verified) | GIRM-compliant, perpetual. Gives season, rank, color, Sunday cycle A/B/C, weekday cycle I/II, psalter week. **Does not include reading citations.** |
| Reading citations | **LiturgicalCalendarAPI (LitCal)** | **Apache-2.0** (verified) | Exposes a `readings` field populated for the Roman calendar. Phase 0 must verify coverage and completeness. |
| Scripture text (Catholic) | **World English Bible Catholic Edition (WEBCE)** | **Public domain** (verified) | Modern English, includes deuterocanon in Catholic book order. Best available free Catholic text. |
| Scripture text (alt) | Douay-Rheims (Challoner), KJV, ASV, WEB | Public domain | Douay-Rheims for tenants who want the traditional Catholic register. |
| Concordance — Strong's | STEPBible-Data (CC BY 4.0); Troidl Strong's datasets | CC BY 4.0 / PD | Hebrew/Greek lemma lookup, ~14k entries. |
| Cross-references | Treasury of Scripture Knowledge | Public domain | ~570k cross-refs for chain study. |
| Traditional prayers | Our Father, Hail Mary, Glory Be, Anima Christi, Memorare, St. Michael, Angelus, Rosary mysteries, Divine Mercy Chaplet, Stations, Litanies, Examen | Public domain in traditional English | See trap below. |

### Licensing traps — call these out explicitly

- **USCCB / NABRE.** USCCB's published permissions policy states permission is *not* granted to post the complete daily or Sunday readings, and free RSS display is conditioned on the site not requiring users to give "anything of value." A paid, gated add-on fails that test. **Do not ship NABRE text in v1.**
- **ICEL 2011 Roman Missal translations.** The current English Gloria, Creed, and Mass ordinary texts are copyrighted. Use the older public-domain English forms and label them as such.
- **Liturgy of the Hours.** Copyright sits with the hierarchies of Australia, England & Wales, and Ireland (via AP Watt) plus ICEL sublicenses. **Out of scope for v1.** Do not promise a breviary.
- The lectionary *selection* (Ordo Lectionum Missae) is plausibly a copyrightable compilation even though individual citations are facts. Sourcing citations from Apache-2.0 LitCal is the defensible path; Phase 0 should confirm LitCal's own provenance before we rely on it.

### Where the daily prayers come from

"Chronological daily prayers taken from Catholic daily Mass themes" means ~365 days × 3 moments ≈ **1,095 pieces of original devotional writing**. That is the real cost of this project. Three sources, layered:

1. **Platform baseline** — written once, keyed to the *liturgical* day (season + rank + Sunday cycle), not the civil date, so it is evergreen and reusable annually. This cuts the writing job to roughly 250–300 unique days rather than 1,095 dated pieces.
2. **Tenant overlay** — a parish's priest, or a director like Dr. Pittman, can write today's reflection for their own people. It takes precedence over the baseline for that tenant. **Hallow structurally cannot do this.** It is the single best reason a parish picks us.
3. **AI-assisted drafting** — a tenant-facing tool that drafts from the day's readings using the existing assistant infrastructure. **Never auto-publishes.** Always human-approved, always disclosed in tenant admin.

---

## 4. Architecture

### 4.1 Two classes of table

GleeWorld currently runs `tenant_id` + RESTRICTIVE RLS on 586 of 606 tables. Prayer needs a deliberate exception:

**Platform reference data** — no `tenant_id`, readable by every authenticated user, writable only by `super_admin` (accepting both `'super_admin'` and legacy `'super-admin'` spellings):
- `gw_prayer_calendar_days` — one row per (date, rite). Rites: `roman_catholic`, `rcl`, `devotional`. Pre-generated from romcal for a rolling window (2020–2035) so there is no runtime dependency and it is queryable in SQL.
- `gw_prayer_readings` — citations per calendar day per reading slot.
- `gw_bible_translations`, `gw_bible_verses` — ~31,102 verses per translation; 3–4 translations ≈ 120k rows, well under 100 MB. Postgres `tsvector` for word-concordance search — no external search dependency.
- `gw_strongs_entries`, `gw_verse_strongs`, `gw_tsk_crossrefs`
- `gw_prayer_texts` — the public-domain prayer library.
- `gw_prayer_devotionals` (baseline, `tenant_id IS NULL`).

**Tenant + user data** — `tenant_id NOT NULL DEFAULT current_tenant_id()`, BEFORE INSERT trigger, RESTRICTIVE RLS, per the established multi-tenant pattern:
- `gw_prayer_devotionals` (tenant overlay rows)
- **`gw_prayer_requests`** — the intentions table. **Already exists; extend it, do not create a parallel one.** See the correction below.
- `gw_prayer_journal` — **owner-private by design**, same precedent as Planner notes
- `gw_prayer_sessions` — what was prayed, when, how long
- `gw_prayer_reminders`
- `gw_prayer_circles`, `gw_prayer_circle_members`, `gw_prayer_circle_requests`
- `gw_prayer_prayed_for` — who prayed for which request

> **This mixed model must get a security-auditor pass before merge.** A shared, tenant-less table in a platform whose entire safety story is tenant RLS is exactly where a leak would hide.

> ### CORRECTION (2026-08-04, after Phase 0 shipped): use `gw_prayer_requests`
>
> This spec originally called for a new `gw_prayer_intentions` table. **That was
> wrong, and it was caught only when Phase 0's migrations were applied to
> production.** Two prayer tables already exist:
>
> | Table | Columns | Rows | RLS |
> |---|---|---|---|
> | `gw_prayer_requests` | `user_id`, `content`, `is_anonymous`, `status`, `chaplain_response`, `responded_at`, `tenant_id` | **0** | `tenant_isolation_restrict` (RESTRICTIVE) + `demo_viewer_no_modify` |
> | `gw_prayer_rotations` | `member_id`, `assigned_date`, `assigned_event_id`, `role_type`, `completed`, `tenant_id` | **0** | chaplain-manage, member-view, `anon_tenant_isolation`, demo guards |
>
> Both are **empty**, and grep finds them referenced **only** in the generated
> `src/integrations/supabase/types.ts` — no hook, no page, no edge function.
> They are dormant scaffolding that never shipped.
>
> **Adopt `gw_prayer_requests` as the intentions table anyway.** Creating
> `gw_prayer_intentions` beside it would leave the platform with two
> prayer-request tables, one of them permanently dead — exactly the kind of
> duplication that makes a schema unreadable a year later. The existing table
> already has correct tenant plumbing, and its `chaplain_response` /
> `responded_at` pair encodes a pastoral-care workflow this spec never proposed
> and should have: a named person answers a request, and the answer is recorded.
> That directly serves the duty-of-care risk in the Risks section.
>
> What Phase 2 must add to it, rather than replacing it:
> `answered_at` (distinct from `responded_at` — a chaplain replying is not the
> same as a prayer being answered), `tags`, `visibility`
> (`private` | `circle` | `tenant`), and a `title`. `content` stays the body.
>
> **`gw_prayer_rotations` is a different concept** — who leads prayer at which
> event — and maps onto the Prayer Room idea in Phase 4. Leave it alone for now;
> do not fold it into intentions.
>
> Whoever picks up Phase 2: read this block before writing a migration.

### 4.2 The user-facing surfaces

1. **Today** — the liturgical day (name, season, color, rank), the day's readings in full, and the devotional for this moment (morning / midday / night, chosen by clock). One tap to pray.
2. **Bible** — full reader, translation switcher, search, verse tap → Strong's lemma + TSK cross-references. Highlight and save to journal.
3. **Concordance** — both senses: English-word occurrence search (Postgres FTS) *and* Hebrew/Greek lemma lookup (Strong's).
4. **Prayers** — the traditional library, browsable by need (grief, healing, before performance, thanksgiving) and by form (rosary, chaplet, litany, examen).
5. **My Prayers** — intentions list with tags, reminders, and the request → prayed → **answered** lifecycle. Answered prayers get their own view; that view is the retention engine.
6. **Circles** — user-created groups drawn from the tenant roster. Post an intention; members see "9 people prayed for this" without names unless a prayer chooses to be named.
7. **Prayer Room** (Phase 4) — a synchronous shared session. A leader advances; everyone follows the same text in real time, optionally with JaaS audio. This is what "group prayer at any time" actually means, and nothing in the competitive set does it well.

### 4.3 Platform constraints to respect

- **No service worker** — `/sw.js` is a self-uninstall stub and must stay that way. Offline caching goes through the iOS app shell or IndexedDB, never SW caching.
- **CSP is a meta tag in `index.html`** — self-hosting scripture in Postgres avoids adding any new `connect-src` host. Another argument for importing rather than proxying a third-party Bible API.
- **Realtime** — circles and Prayer Room need their tables added to the realtime publication; that is a per-feature step, not automatic.
- **Tenant-neutral copy** — the rite is a tenant setting. Shared chrome must never assume Catholic.
- **Branding tiers** — a tenant should be able to rename the module ("Chapel", "Upper Room", "Daily Office").
- **iOS** — push reminders and offline ride on the existing app shell; a new build is required for anything native.

---

## 5. Phasing

| Phase | Scope | Deliverable |
|---|---|---|
| **0 — Spike** (~1 week) | Verify LitCal reading coverage + provenance; generate romcal data; import WEBCE. | A SQL query that answers "what is today, and what is read?" |
| **1 — MVP** | Today screen, Bible reader + search, prayer library, personal intentions. Roster-only, module-gated. | Shippable, useful, zero licensing exposure. |
| **2 — Community** | Circles, "I prayed for this", journal, push reminders, Rule of Life. | The retention layer. |
| **3 — Depth** | Strong's + TSK concordance; authored morning/midday/night cycle; tenant overlay + AI-assisted drafting with approval gate. | The content differentiator. |
| **4 — Integration** | Liturgy Planner autofill; repertoire suggestions from the day's readings; audio (assistant voice + tenant-recorded); live Prayer Room. | **The moat.** |
| **5 — Optional** | RCL track for Protestant tenants; pursue NABRE/NRSVue licensing if revenue justifies. | Market expansion. |

**Non-goals, stated up front:** no public prayer wall in v1; no outside-the-roster invites in v1; no Liturgy of the Hours (licensing); no streaks ever; no separate app.

---

## 6. Pricing (preliminary)

**Existing GleeWorld add-on ladder** (repo `src/lib/planTiers.ts`, as of 2026-07-02): Sight Reading $15 · Concert Planner $19 · Contracts & Finance $25 · Tour Manager $25 · Part Tracks $29 · Practice Studio $29 · Box Office $39 + 1% · all-modules bundle $129/mo.

**External anchors** (checked 2026-08-04): myParish $199 setup + $49/mo for a *whole parish app* · Subsplash $149–350/mo · Tithe.ly $72–119/mo · Hallow ~$4/mo consumer · Universalis $9.99 one-time.

**Recommendation: $19/mo per tenant, unlimited users on the roster.**

Rationale: myParish delivers an entire parish app for $49/mo, which caps what a single prayer module can command. $19 places Prayer beside Concert Planner in the existing ladder — a content module, not an infrastructure module. Per-user pricing is wrong here: it taxes exactly the behavior we want (a director getting the whole ensemble praying), and it competes with Hallow's $4 consumer price in a comparison we lose.

**Margin check:** marginal cost is near zero — reference data is shared across all tenants, user rows are small text. Stripe takes ~$0.85 on $19. Comfortably above the ~$1–2/tenant/mo infra floor.

**Cheaper alternative:** bundle Prayer free into Conservatory/University tiers as a differentiator against Chorus Connection, and sell it at $19 only to Ensemble/Studio. Trades revenue for competitive positioning in the segment Kevin has confirmed as primary.

**Premium alternative:** $29 with tenant-authored devotionals and AI drafting as the justification, positioning it as a content-production tool rather than a content-consumption one.

**To validate with real customers:** (a) will a parish pay for prayer when Hallow is $4 and myParish bundles it? (b) does the tenant-authored overlay actually get used, or does everyone stay on the baseline? (c) is the choir the right wedge into a parish, or does this need to be sold to the pastor?

*Business analysis, not financial or legal advice. Nonprofit discount policy and sales-tax treatment need professional review.*

---

## 7. Risks

1. **Content production is the real cost.** 250–300 evergreen devotional days is a writing project measured in months, not a sprint. If that writing does not happen, the module is a Bible reader with a calendar. **This is the risk most likely to kill the project.**
2. **Doctrinal and pastoral exposure.** A platform shipping prayer content to Catholic parishes will be judged on orthodoxy. Mitigation: position baseline content explicitly as *devotional reflection, not liturgical text*; pursue clergy review (and possibly an imprimatur) for the baseline library; lean hard on the tenant overlay so the local pastor owns what his people read.
3. **AI-generated devotional content is a reputational landmine if undisclosed.** Never auto-publish; always human-approved; disclose in tenant admin. A leaked "our parish's prayers were written by a robot" story would damage GleeWorld well beyond this module.
4. **Pastoral duty of care.** Prayer requests will surface real crises — suicidal ideation, abuse, illness. For school tenants this is acute. The competitive set handles it poorly. We need a flagging path to a named tenant contact and a documented policy before circles ship in Phase 2. **This is not optional.**
5. **The shared-reference-table exception** is a genuine deviation from the tenant-RLS invariant. Security review required.
6. **Scope.** This is the largest add-on since Academy. Phases 0–2 are a coherent product on their own; do not start Phase 3 content work until Phase 1 is in real users' hands.

---

## 8. Recommendation

Build Phase 0 and Phase 1. Ship a Catholic-first daily prayer, Bible, and intentions module on entirely public-domain content, gated behind `useModuleAccess('prayer')`, at $19/mo. Prove that choirs use it before committing to the devotional writing program in Phase 3 — and before spending a dollar on licensing.

Start the clergy-review conversation and the pastoral-care policy in parallel with Phase 1, not after.
