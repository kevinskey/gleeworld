---
title: "Calendar and attendance"
audience: tenant
order: 5
summary: "Create events (including recurring ones), then take attendance with QR check-in, PIN, or manual entry."
updated: 2026-07-08
---
# Calendar and attendance

Schedule rehearsals and concerts on your program calendar, then track who attends using QR check-in, a PIN, or manual entry. This page covers both.

**Before you start:** You must be an admin or super-admin to create events. To take attendance you need permission — see "Who can take attendance" below.

## Create an event

1. Go to **Calendar** at `/dashboard/calendar`.
2. Open the create-event dialog.
3. Enter a **Title** (required).
4. Choose an **Event type** (defaults to *meeting*).
5. Set the **Start date and time**, and add a **Location**.
6. To repeat the event, set **Recurrence**: repeat every N days or weeks, choose which days it repeats on, and set when it ends (after N occurrences).
7. Optionally use the **AI-generated description** action to draft the event description for you.
8. Save the event.

> **Tip:** Confirm your program's time zone in [Program setup](../tenants/program-setup.md) before scheduling. Start times are entered against that time zone.

> **Warning:** The screen at `/admin/events` is a placeholder with hard-coded sample numbers and a button that does nothing. Create and manage real events from the **Calendar** at `/dashboard/calendar`, not there.

> **Note:** A read-only public calendar is available at `/public-calendar` for visitors.

## Who can take attendance

Attendance actions are permission-gated. You can take attendance if you are a **super-admin**, on the **exec board**, or hold the **secretary** role. Reports and excuse approvals additionally require admin rights.

## Take attendance with a QR code

QR check-in lets students scan a code to mark themselves present.

1. Go to **Attendance** at `/attendance` and open the **Check-In** tab.
2. Select the upcoming event you are taking attendance for (only future events appear).
3. Set an **expiration** in minutes (between 5 and 180; the default is 30).
4. Generate the QR code.
5. Display it, or use **Download PNG**, **Copy**, or **Share** to distribute it.

Students scan the code and are taken to the check-in page — no separate sign-in wrapper is required to scan.

> **Tip:** Set a short expiration for a single rehearsal so a screenshot of the code cannot be reused later.

## Other ways to take attendance

- **Manual** tab — mark students present or absent by hand (requires take-attendance permission).
- **PIN entry** — students check in with a PIN at `/attendance/pin`.
- **Overview** and **Schedule** tabs — visible to everyone.
- **Reports** tab — admin only.
- **Excuses** tab — admins approve requests; users with take-attendance permission (but not admin) manage them.

## See also

- [Roster and students](../tenants/roster-and-students.md) — the people you take attendance for.
- [Checking in with QR](../students/checking-in-with-qr.md) — the student's scanning steps.
- [Program setup](../tenants/program-setup.md) — set your time zone and week start.
- [Glee Academy](../add-ons/glee-academy.md) — class schedules and per-course QR attendance.
