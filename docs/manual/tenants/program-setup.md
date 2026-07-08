---
title: "Program setup"
audience: tenant
order: 1
summary: "Set up your program's workspace: time zone, locale, contact email, and where the admin settings live."
updated: 2026-07-08
---
# Program setup

Your program's control panel is **Workspace Settings**. This is where you set your program's name, time zone, and other basics before you invite students, publish a public page, or turn on add-ons. Everything a director configures starts here.

GleeWorld is the platform; your choir or school is a *tenant* with its own private workspace. The settings on this page apply only to your program.

**Before you start:** You must be an admin or super-admin in your program. If you are not, every settings tab shows a read-only amber badge ("Read-only — only workspace admins can change settings") and the fields are locked.

## Open Workspace Settings

1. Sign in to GleeWorld and open your **Dashboard** (the Command Center is your program home).
2. Go to **Workspace Settings** at `/dashboard/workspace`.
3. Note the six tabs across the top: **Plan**, **Add-ons**, **Navigation**, **Branding**, **Billing**, and **General**. The tab you are on is stored in the page address, so you can bookmark a specific tab.

> **Note:** Older links like `/admin/site-setup` and `/control-center` still work, but they redirect you to the current screens. Setup is not hidden on a separate page — it all lives in Workspace Settings.

## Set your program basics (General tab)

The **General** tab holds your program's localization settings. These control how dates and times appear across the app.

1. Open **Workspace Settings** and click the **General** tab.
2. Set **Time zone** to your program's IANA time zone (for example, your local region from the shortlist).
3. Set **Default locale** for your program (eight options are available).
4. Set **Week starts on** to either **Sunday** or **Monday**. This affects how your calendar grid is laid out.
5. Enter a **Contact email**. This is the address associated with your program.
6. Save your changes.

> **Tip:** Set the time zone before you create recurring events on the [calendar](../tenants/calendar-and-attendance.md). Event start times are entered against your program's time zone, so getting it right first avoids re-editing every event later.

## Set the sidebar for each role (Navigation tab)

The **Navigation** tab lets you choose which sidebar items each type of user sees.

1. Open the **Navigation** tab.
2. Under **Editing view for:**, pick the role you want to adjust (for example, student).
3. Hide or show individual sidebar items for that role.
4. Use **Preview my sidebar as:** to see a role's menu exactly as that user will see it.

> **Note:** Super-admins always see every navigation item, regardless of these settings. Hiding an item only affects the roles you set it for.

## Exporting your program's data

The **General** tab includes a **Data export** button. When you click it, GleeWorld tells you that a super-admin will receive the export bundle by email within 24 hours.

> **Warning:** The export delivery is not fully wired up yet, so treat the confirmation message as a request rather than a guarantee. [VERIFY: Does clicking Data export actually deliver an export bundle by email, given the gw-tenant-export edge function is noted as not yet wired?]

## See also

- [Branding and landing pages](../tenants/branding-and-landing-pages.md) — set your logo, colors, and public website.
- [Roster and students](../tenants/roster-and-students.md) — invite your students once basics are set.
- [Accounts and roles](../getting-started/accounts-and-roles.md) — who can change what.
- [Billing and plans](../tenants/billing-and-plans.md) — choose or change your plan.
