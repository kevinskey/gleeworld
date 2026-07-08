---
title: "Roster and students"
audience: tenant
order: 3
summary: "Invite students one at a time, in bulk by CSV, or with a self-serve join code, and manage your roster."
updated: 2026-07-08
---
# Roster and students

Your roster is the list of students in your program. Public sign-ups become *fans*, not students — students are always enrolled by you, the director. This page covers the three ways to bring students in and where to manage them afterward.

**Before you start:** You must be an admin or super-admin to invite students and manage the roster.

> **Note:** Say *students* for the people you teach. People who follow your program from the public page are *fans*, and former students are *graduates*.

## View your roster

1. Go to **Students** at `/admin/students`.
2. Search by name or email. Each row shows full name, email, voice part, and phone.
3. Click a row to open that student's detail page, where you can manage parent contacts, notes, uniforms, instruments, and permission slips.

> **Tip:** The **People hub** (`/dashboard/people`) shows your roster grouped by voice section, plus a **Groups** tab for messaging. If the roster is empty, you will see a prompt to invite your students from People settings.

## Invite one student

1. From **Students**, click **Onboard students** to open `/admin/students/onboard`.
2. Open the **Single invite** tab.
3. Enter the student's **email** (required).
4. Optionally add their **full name** and choose a **class**.
5. Send the invite.

The student receives a one-tap magic sign-in link — there is no password to set up.

## Invite a whole roster by CSV

Use this when you have many students to add at once.

1. On the onboarding screen, open the **Upload roster (CSV)** tab.
2. Prepare a CSV file with an `email` column and a `name` column. A header row is optional.
3. Upload the file. GleeWorld sends one invite per row, one after another, and shows progress.
4. Optionally choose **enroll all in class** to place every invited student into the same class.
5. Review the failed-list after the run to catch any addresses that did not send.

> **Tip:** Each row triggers the same magic-link invite as a single invite, so students still sign in with one tap.

## Let students join with a code

A join code lets students enroll themselves into a specific class.

1. On the onboarding screen, open the **Join code** tab.
2. Pick the class you want the code to enroll students into.
3. Generate the code. It is six characters, and confusing characters (I, O, 0, 1) are left out.
4. Share the join URL `/join/<code>`, or copy just the code, using the copy actions.
5. Regenerate the code at any time if you need to retire the old one.

> **Note:** Join codes are tied to a class. If you see "No active classes. Create one in Academy first," create the class in [Glee Academy](../add-ons/glee-academy.md) before generating a code.

## See also

- [Accounts and roles](../getting-started/accounts-and-roles.md) — how student, fan, and graduate roles differ.
- [Joining and first sign-in](../students/joining-and-first-sign-in.md) — the student's side of the invite.
- [Calendar and attendance](../tenants/calendar-and-attendance.md) — take attendance for your roster.
- [Glee Academy](../add-ons/glee-academy.md) — create classes for join codes and enrollment.
