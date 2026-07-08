---
title: "Template Courses"
audience: tenant
order: 6
summary: "Adopt a pre-built course from the Course Store into your program, then edit everything to fit your students."
updated: 2026-07-08
---
# Template Courses

Template Courses let a teacher adopt a ready-made course into their own program instead of building one from scratch. When you adopt a template, GleeWorld copies it into your program as a normal course — and you can edit everything afterward.

Browse them in the **Course Store** at `/academy/store`. A read-only preview of a template course is at `/academy/templates/:courseId`.

**Before you start:**

- Confirm you are an admin. Adopting a template requires an admin; demo-viewer accounts cannot adopt.

## Adopt a template course

1. Open the **Course Store** at `/academy/store`.
2. Browse the available templates. Each is shown with a **Free** badge and an **Adopt** button.
3. Click **Adopt** on the course you want.
4. On success, GleeWorld routes you into the new course at `/academy/c/<course_code>`.

> **Note:** Templates are maintained on the GleeWorld platform and shared across programs, but adopting one copies it into your program. Your edits never change the original template or anyone else's copy.

> **Warning:** If adoption fails, check your role. The store blocks demo-viewer accounts (`demo_viewer_cannot_adopt`) and requires an admin (`admin_required_to_adopt`).

## Edit an adopted course

An adopted course is a normal course you fully control.

1. Open the course from your Academy.
2. Work through its **Unit → Lesson → Exercise** structure.
3. **Add lessons** as needed.
4. Edit each lesson's **title**, **content**, **objectives**, and **listening**, including attaching audio from your [media library](../tenants/content-management.md).

> **Note:** Edit rights differ by course type. A normal (adopted) course can be edited by an admin or director. A raw **template** itself can only be edited by a super-admin.

## Paid template courses

> **Note:** [VERIFY: two template systems appear to coexist in the code — the wired Course Store shows every template as "Free" and adopts via an RPC, while a parallel layer models purchasable course products (SKU, price, Stripe checkout via `create-course-checkout`) and per-tenant entitlements. Confirm which path is live for tenants and whether any template courses are actually paid.]

## See also

- [Glee Academy](glee-academy.md)
- [Content management](../tenants/content-management.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Billing & plans](../tenants/billing-and-plans.md)
- [Assignments & submissions](../students/assignments-and-submissions.md)
