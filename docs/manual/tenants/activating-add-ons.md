---
title: "Activating add-ons"
audience: tenant
order: 6
summary: "Turn optional add-ons on or off from Workspace Settings, including free toggles and Stripe-checkout activations."
updated: 2026-07-08
---
# Activating add-ons

Add-ons are optional features you turn on for your program. Which ones you can activate depends on your plan and entitlements — nothing here is guaranteed to be present. This page shows how to switch add-ons on and off.

**Before you start:** You must be an admin or super-admin. Non-admins see the add-ons list as read-only.

> **Note:** Some features are always on and are not add-ons. Glee Academy is core to every program, and Concert Planner is a *starter* module that is available to every tenant. You will not find these in the add-ons list because they do not need activating.

## Open the Add-ons list

1. Go to **Workspace Settings** at `/dashboard/workspace` and open the **Add-ons** tab.
2. Browse the catalog. Each card shows an add-on's name, description, and price.
3. Active add-ons are marked as such; the rest show an **Activate** button.

> **Note:** The legacy link `/settings/modules` redirects to this same Add-ons tab.

## Activate an add-on

How activation works depends on the add-on and your program:

1. **Free ($0) or already-included add-on:** Click **Activate**. It turns on immediately at no charge.
2. **Priced add-on:** Click **Activate**. GleeWorld sends you to **Stripe Checkout** to start the subscription. After payment, the add-on turns on automatically.
3. **Demo/sandbox program:** Toggles apply immediately with no Stripe and no billing, and the tab shows a "Sandbox mode" banner.

To turn an add-on off, click **Deactivate** on its card.

> **Tip:** Some public-page blocks (such as ticketing) only render once the matching add-on is active. If a block on your [public page](../tenants/branding-and-landing-pages.md) shows an **Add-on** lock badge, activate the add-on here first.

## What each add-on does

- **Box Office** — sell tickets with QR check-in at the door. Requires connecting your own Stripe account. See [Box Office](../add-ons/box-office.md).
- **Concert Planner** — build and print concert programs and publish them as a page (starter; already on). See [Concert Planner](../add-ons/concert-planner.md).
- **Studio / Part Tracks** — record multi-track sessions and build voice-part practice tracks from a score. See [Studio and Part Tracks](../add-ons/studio-part-tracks.md).
- **Landing Pages** — the block-based public website builder. See [Landing pages](../add-ons/landing-pages.md).
- **Template Courses** — adopt pre-built courses into your program. See [Template courses](../add-ons/template-courses.md).
- **Glee Academy** — the core LMS, always on. See [Glee Academy](../add-ons/glee-academy.md).

## See also

- [Billing and plans](../tenants/billing-and-plans.md) — how add-on charges appear and how to manage payment.
- [Branding and landing pages](../tenants/branding-and-landing-pages.md) — unlock add-on-gated page blocks.
- [Accounts and roles](../getting-started/accounts-and-roles.md) — who can activate add-ons.
