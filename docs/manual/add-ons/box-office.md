---
title: "Box Office"
audience: tenant
order: 1
summary: "Sell general-admission concert tickets with QR check-in, paid straight into your program's own Stripe account."
updated: 2026-07-08
---
# Box Office

Box Office lets your program sell general-admission tickets to concerts and check people in at the door by scanning a QR code. Ticket money goes straight to your program's own Stripe account — GleeWorld takes 0% of ticket revenue.

Box Office is an optional add-on. It is available on plans and entitlements that include it, and it is also listed as "included" with the Institution plan. If you don't see it, activate it first (see below).

**Before you start:**

- Confirm you are a tenant admin or super-admin. Only admins can open the Box Office dashboard; everyone else is sent to your public ticket page.
- Activate the Box Office add-on from **Workspace Settings → Add-ons**. See [Activating add-ons](../tenants/activating-add-ons.md).
- Have your program's Stripe account details ready — Box Office runs on Stripe Connect.

> **Note:** If the add-on is not active, the Box Office page shows a gate with an **Open Modules** link that takes you to the activation screen.

## Connect your Stripe account

Box Office pays out through Stripe Connect, so you must connect (and finish onboarding) a Stripe account before you can sell.

1. Open **Box Office** at `/dashboard/box-office`.
2. Find the **Payments** card.
3. Click **Connect Stripe** and complete the full-page Stripe onboarding.
4. Return to Box Office and confirm the card reads **Ready to sell tickets**.

The Payments card shows one of three states:

- **Connect Stripe** — no account connected yet.
- **Finish onboarding** — account connected, but charges are not enabled yet.
- **Ready to sell tickets** — you are cleared to publish and sell.

> **Warning:** You cannot publish a ticketed event until Stripe charges are enabled. If you're stuck on **Finish onboarding**, complete the remaining steps in Stripe first.

## Create a ticketed event

1. Click **New event**.
2. Enter the **title**, **venue**, **date and time**, **capacity**, and **description**.
3. Save. The event is created as a **draft**.

A new ticketed event is public by default and also appears on your program's calendar. Its public ticket address follows the pattern `/concert-tickets/<slug>`, where the slug is derived from the title.

> **Tip:** Because the event lands on your [calendar](../tenants/calendar-and-attendance.md) automatically, you don't need to add it there separately.

## Add ticket tiers

Each event needs at least one price tier before you can publish.

1. Open the event to reach its detail page.
2. In the **Tiers** card, add a tier with a **name**, **price**, and **quantity** (for example, Student $5, General $15, Patron $50).
3. Repeat for each tier you want to offer.

Each tier tracks how many tickets it has and how many have sold.

## Publish the event

1. On the event detail page, open the **Publish** card.
2. Confirm the event is public and has at least one tier with a quantity.
3. Click to publish.

Publishing requires the event to be public **and** to have at least one tier with a quantity, and it blocks you from going over capacity. The status pill on each event shows **draft**, **published**, or **closed**.

## Run the door

Door tools appear once an event is published.

- Click **Scan** to check people in by QR code at `/dashboard/box-office/event/:id/checkin`.
- Click **Will-call** to handle will-call pickups.

> **Note:** [VERIFY: how buyers receive their ticket / QR code after purchase — the fact sheet does not state the delivery method.]

## Manage requests, orders, comps, and refunds

The event detail page also gives you:

- A **Requests** queue to approve or deny ticket requests.
- An **Orders** list of purchases.
- A **Summary** card, including comp (complimentary) ticket counts.

You can issue comp tickets and refund orders from here.

## See also

- [Activating add-ons](../tenants/activating-add-ons.md)
- [Billing & plans](../tenants/billing-and-plans.md)
- [Calendar & attendance](../tenants/calendar-and-attendance.md)
- [Buying tickets](../fans/buying-tickets.md)
- [Attending events](../fans/attending-events.md)
- [Billing & payments FAQ](../faq/billing-and-payments.md)
