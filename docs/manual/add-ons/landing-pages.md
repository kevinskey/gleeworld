---
title: "Landing Pages"
audience: tenant
order: 5
summary: "Build your program's public website from arrangeable blocks — events, story, media, and contact info — then publish it at your own address."
updated: 2026-07-08
---
# Landing Pages

Landing Pages is the block-based builder for your program's public website. You arrange blocks — events, your story, media, contact info, and more — into a page that fans and prospective students can read. Visitors only ever see what you have **published**.

The editor lives at `/admin/public-page`.

> **Note:** The older `/admin/landing-editor` address now redirects here.

**Before you start:**

- Confirm you are a tenant admin — publishing your public site is an admin task.
- Set up your [branding](../tenants/branding-and-landing-pages.md) first. The starter page is seeded from your branding.

## Create your page

If your program doesn't have a public page yet:

1. Open the public-page editor at `/admin/public-page`.
2. Click **Create my page**.

This seeds a **7-block starter template**: Header, Hero, Events, About, Music Player, Videos, and Contact & Footer — filled in from your branding.

## Add and arrange blocks

Your edits save automatically as you work.

1. Open the **block picker**. Blocks are grouped as **Your essentials**, **GleeWorld extras**, and **Add-ons**.
2. Add a block to the page.
3. **Drag** blocks to reorder them. The header stays locked at the top.
4. Toggle a block's **visibility**, or **delete** it.
5. Select a block to **edit its settings**.

Around 21 block types are available, including header, hero, events, about, media gallery, music player, video gallery, ensembles, staff, press, support, fan signup, liturgical calendar, contact, donations, merch, concert tickets, spotlight, scholarship, and appointment booking.

> **Note:** Some blocks are **add-on-gated**. A gated block only appears on your live site if its required add-on is active for your program; otherwise it shows a **Lock / Add-on** badge with an **Activate** link. Free blocks always render. To turn on the underlying add-on, see [Activating add-ons](../tenants/activating-add-ons.md).

## Set your theme

1. Open the theme controls.
2. Choose your **primary** and **accent** colors, **font**, and **letter spacing**.
3. Watch the preview update live; changes save automatically.

## Set your page address

1. Open the page-address (slug) field.
2. Enter a slug for your `/sites/<slug>` address.
3. Confirm the availability check clears before saving.

## Publish and manage the live site

Use the buttons at the top of the editor to:

- **Publish** or **Republish** — takes a snapshot of your current blocks and makes it the live page. Only published blocks are visible to anonymous visitors.
- **Unpublish** — takes the page offline.
- **View site** — opens your live page at `/sites/<slug>`.
- **Reset to template** — returns the page to the starter template.

> **Warning:** Editing blocks does not change your live site on its own. Visitors keep seeing the last published snapshot until you **Publish** or **Republish**.

## See also

- [Branding & landing pages](../tenants/branding-and-landing-pages.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Box Office](box-office.md)
- [Concert Planner](concert-planner.md)
- [Following a program](../fans/following-a-program.md)
