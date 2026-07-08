---
title: "Branding and landing pages"
audience: tenant
order: 2
summary: "Set your program's name, logo, and colors, then build and publish a public website from arrangeable blocks."
updated: 2026-07-08
---
# Branding and landing pages

Give your program a consistent look, then publish a public web page that anyone can visit without signing in. Branding controls the name, logo, and colors used inside the app; the landing-page builder turns those into a public website made of arrangeable blocks.

**Before you start:** You must be an admin or super-admin. Non-admins see branding and settings as read-only.

## Set your branding (Branding tab)

1. Open **Workspace Settings** at `/dashboard/workspace` and click the **Branding** tab.
2. Enter your **Organization name** (the full name of your program).
3. Enter a **Short name** for compact spaces.
4. Choose a **Primary color** using the color picker, or type a hex value.
5. Paste a **Logo URL** into the logo field. A preview appears next to it.
6. Save your changes.

> **Note:** The Branding tab takes a logo **URL**, not a file upload. Host your logo somewhere public first, then paste its address here.

> **Tip:** Localization fields (time zone, locale, week start, contact email) live on the **General** tab, described in [Program setup](../tenants/program-setup.md).

## Create your public page

Your public website is built at `/admin/public-page`. Visitors read only what you **publish** — your working draft stays private until then.

1. Go to `/admin/public-page`.
2. If you have never built a page, click **Create my page**. GleeWorld seeds a starter site from your branding.
3. The starter template gives you **seven blocks**: Header, Hero, Events, About, Music Player, Videos, and Contact & Footer.

> **Note:** Older links such as `/admin/landing-editor` and `/admin/site-setup` redirect to this same public-page builder.

## Arrange and edit blocks

The left panel lists your blocks. You build the page by adding, reordering, and editing them.

1. Drag a block up or down to reorder it.
2. Click a block row to expand its editor and change its content.
3. Click the eye icon to hide or show a block.
4. Click the trash icon to delete a block.
5. To add a block, open the **Add block** dialog. Blocks are grouped as **Your essentials**, **GleeWorld extras**, and **Add-ons**.

> **Note:** The **Header** block is locked to the top and cannot be hidden or deleted. Nothing can be dragged above a locked block.

> **Warning:** Some blocks (for example, ticketing or other revenue blocks) require an active add-on subscription. A gated block shows an **Add-on** lock badge and an **Activate** link instead of adding. See [Activating add-ons](../tenants/activating-add-ons.md).

## Style your page (theme)

Theme changes apply to the live preview instantly and save automatically.

1. Set a **Primary color** and an **Accent color**.
2. Choose a **Font** from the 17 curated options (system Sans/Serif plus faces such as Lato, Montserrat, Playfair Display, and Bebas Neue).
3. Adjust **Letter spacing** if you want tighter or looser text.

## Set your page address (slug)

1. Edit the slug under `/sites/`. Only lowercase letters, numbers, and hyphens are allowed.
2. Click **Check availability** to confirm the address is free.
3. Save to apply the new address.

## Publish, view, and reset

1. Click **Publish** (or **Republish changes** after edits) to make your draft live.
2. Click **View site** to open your live page at `/sites/<slug>`.
3. Click **Unpublish** to take the page offline.
4. Use **Reset to template** only if you want to start over.

> **Warning:** **Reset to template** deletes all your blocks and reseeds the seven-block starter. It keeps your theme, colors, and media, but it cannot be undone.

> **Note:** A separate **fan page** builder lives at `/admin/fan-page` for signed-in fans; its published version appears at `/fan`. That is distinct from your public `/sites/<slug>` page.

## See also

- [Program setup](../tenants/program-setup.md) — set your name and localization first.
- [Activating add-ons](../tenants/activating-add-ons.md) — unlock add-on-gated blocks.
- [Landing pages](../add-ons/landing-pages.md) — more on the public website builder.
- [Following a program](../fans/following-a-program.md) — what fans see on your public page.
