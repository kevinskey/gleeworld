import{j as c,M as de,r as ce}from"./markdown-DhDeT_t5.js";import{hg as le,ak as ue,bm as he,I as pe,C as me,t as ge,dq as T,fq as ye,aR as fe,F as be}from"./index-BkAbyT1F.js";import{r as we}from"./pdf-viewer-CZwrHNNw.js";import"./osmd-K0Ks1scK.js";import"./charts-C_bkZeXw.js";import"./pdf-tools-BvBK5V-z.js";import"./tone-CYbv91c3.js";import"./pdfjs-rTpe4PAn.js";import"./date-locale-UHVDO-p8.js";const ke=`---
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

1. Open **Box Office** at \`/dashboard/box-office\`.
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

A new ticketed event is public by default and also appears on your program's calendar. Its public ticket address follows the pattern \`/concert-tickets/<slug>\`, where the slug is derived from the title.

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

- Click **Scan** to check people in by QR code at \`/dashboard/box-office/event/:id/checkin\`.
- Click **Will-call** to handle will-call pickups.

> **Note:**

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
`,ve=`---
title: "Concert Planner"
audience: tenant
order: 3
summary: "Build a concert program from your library once, then print it and publish it as a web page from the same data."
updated: 2026-07-08
---
# Concert Planner

Concert Planner lets you build a concert program from your music library, print it, and publish it as a public web page — all from one data set. One set of program data drives both the printout and the published page, so you only enter the details once. Advanced designers can also export to Canva.

> **Note:** Concert Planner is a **starter** feature — it's available to every tenant and is not billed separately. It may still be toggled on or off per program. If you don't see it in your navigation, ask an admin to enable it from **Workspace Settings**.

**Before you start:**

- Make sure the pieces you want to program are in your music library. Program pieces can link to your [library scores](../tenants/content-management.md).

## Create a program from a template

1. Open **Concert Planner** at \`/dashboard/concert-planner\`.
2. Click **New program**.
3. Pick a template: **Choral Concert**, **Classical Recital**, **Multi-Section Festival**, or **Student Recital**.
4. GleeWorld creates the program and opens it in the editor.

## Edit the program

In the editor you can:

1. Fill in the **header** fields — title, subtitle, event date, venue, conductor, and performing group.
2. **Add pieces** to the program, linking each to a library score where you can.
3. **Reorder** pieces into performance order.
4. Update or **delete** pieces as the program changes.
5. Manage the **roster** — add sections and the students in each.

> **Tip:** Enter every detail once. Because the same data feeds the print version and the web page, edits you make here flow to both.

## Print, publish, or export to Canva

A program stores its own visual theme, print format, and card layout, and tracks whether and when it was published.

- **Print** the program using its stored print format.
- **Publish** the program as a public web page.
- **Export to Canva** for advanced design work.

## Delete a program

1. On the Concert Planner list, find the program's card.
2. Click its **trash** button.
3. Confirm the deletion.

## See also

- [Content management](../tenants/content-management.md)
- [Branding & landing pages](../tenants/branding-and-landing-pages.md)
- [Landing Pages](landing-pages.md)
- [Box Office](box-office.md)
- [Calendar & attendance](../tenants/calendar-and-attendance.md)
`,Se=`---
title: "Glee Academy"
audience: tenant
order: 2
summary: "The learning-management system for your program — classes, lessons, assignments, and attendance — with per-course feature toggles."
updated: 2026-07-08
---
# Glee Academy

Glee Academy is the learning-management system (LMS) built into your program. It handles classes, lessons, assignments, and attendance. The public Academy page shows a grid of course badges; selecting a badge opens that course, and signed-in students see their own enrollments.

> **Note:** Although this manual lists Glee Academy under add-ons, Academy is a **core** part of GleeWorld — its features are always available and it is not gated or billed as a separate add-on. What you actually turn on and off are its sub-features: [Template Courses](template-courses.md) (the Course Store) and the per-course add-ons described below.

**Before you start:**

- Confirm you are the instructor or creator of the course you want to configure. Only the course instructor/creator can change a course's add-ons.

## Open a course's add-ons

Inside a course you can switch individual feature tabs on or off.

1. Open the course you teach.
2. Go to the course add-ons screen at \`/academy/c/:code/addons\`.
3. Toggle the features you want.

Enabled features appear as tabs inside the course. Disabled ones are hidden.

## Per-course add-on catalog

You can enable any of these features per course:

- **Tour Manager**
- **QR Attendance**
- **Polls**
- **Sight Reading**
- **Practice**
- **Wardrobe**
- **AI Grading Assist**
- **AI Hub**

> **Tip:** These per-course add-ons are separate from your program-wide (tenant) add-ons. Turning one on here affects only that one course.

> **Note:** Only the course instructor or creator can change these toggles. Co-teachers and students see the enabled tabs but cannot change which features are on.

## Add courses to your program

To bring a ready-made course into your program rather than building one from scratch, adopt one from the Course Store. See [Template Courses](template-courses.md).

## See also

- [Template Courses](template-courses.md)
- [Content management](../tenants/content-management.md)
- [Calendar & attendance](../tenants/calendar-and-attendance.md)
- [Roster & students](../tenants/roster-and-students.md)
- [Assignments & submissions](../students/assignments-and-submissions.md)
- [Checking in with QR](../students/checking-in-with-qr.md)
`,_e=`---
title: "Landing Pages"
audience: tenant
order: 5
summary: "Build your program's public website from arrangeable blocks — events, story, media, and contact info — then publish it at your own address."
updated: 2026-07-08
---
# Landing Pages

Landing Pages is the block-based builder for your program's public website. You arrange blocks — events, your story, media, contact info, and more — into a page that fans and prospective students can read. Visitors only ever see what you have **published**.

The editor lives at \`/admin/public-page\`.

> **Note:** The older \`/admin/landing-editor\` address now redirects here.

**Before you start:**

- Confirm you are a tenant admin — publishing your public site is an admin task.
- Set up your [branding](../tenants/branding-and-landing-pages.md) first. The starter page is seeded from your branding.

## Create your page

If your program doesn't have a public page yet:

1. Open the public-page editor at \`/admin/public-page\`.
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
2. Enter a slug for your \`/sites/<slug>\` address.
3. Confirm the availability check clears before saving.

## Publish and manage the live site

Use the buttons at the top of the editor to:

- **Publish** or **Republish** — takes a snapshot of your current blocks and makes it the live page. Only published blocks are visible to anonymous visitors.
- **Unpublish** — takes the page offline.
- **View site** — opens your live page at \`/sites/<slug>\`.
- **Reset to template** — returns the page to the starter template.

> **Warning:** Editing blocks does not change your live site on its own. Visitors keep seeing the last published snapshot until you **Publish** or **Republish**.

## See also

- [Branding & landing pages](../tenants/branding-and-landing-pages.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Box Office](box-office.md)
- [Concert Planner](concert-planner.md)
- [Following a program](../fans/following-a-program.md)
`,xe=`---
title: "Studio & Part Tracks"
audience: all
order: 4
summary: "Two recording tools — Part Tracks builds voice-part practice recordings tied to a score, and Studio is a multi-track DAW that syncs across devices."
updated: 2026-07-08
---
# Studio & Part Tracks

GleeWorld has two related but **separate** recording tools, each with its own module and its own route:

- **Part Tracks** builds accompaniment and voice-part practice recordings that are always tied to a score in your music library.
- **Studio** is a general multi-track recording and composition workspace (a DAW) that is not tied to any score and syncs sessions across your devices.

Both are optional, module-gated features. If a tool doesn't appear in your navigation, it isn't active for your program.

> **Note:**

## Part Tracks

Part Tracks lets you build practice recordings — accompaniment and per-voice-part tracks — for a specific piece. Every project starts from a score in your music library; there is no way to create a Part Tracks recording that isn't linked to a score.

**Before you start:**

- Make sure the piece is in your [music library](../tenants/content-management.md) as a score.

### Create a Part Tracks project

1. Open **Part Tracks** at \`/dashboard/part-tracks\`.
2. Click to start a **new project**.
3. Pick the **score** from your music library.
4. Set the **title** and the **voicing**.

The voicing you choose seeds the track list automatically — for example, SATB creates Soprano, Alto, Tenor, and Bass tracks; SSA creates Soprano 1, Soprano 2, and Alto.

### Find and manage projects

- Browse the project list, which shows each project's score title, composer, voicing, tempo, and key.
- Use the **search** box to find a project.
- Use a card's **delete** control to remove a project.

### Record and edit in the Studio editor

1. Open a project to load the Part Tracks Studio editor.
2. Use the editor to record takes, manage tracks, and work against the score.

> **Tip:** Students practice with these tracks from their own devices. See [Part tracks & practice](../students/part-tracks-and-practice.md).

## Studio

Studio is a multi-track composition and recording workspace. Sessions sync across your devices, and unlike Part Tracks it is not tied to a score.

### Work with sessions

1. Open **Studio** at \`/studio\`.
2. Review **My sessions**.
3. Click to **create a session**, give it a title, and Studio opens it for editing.
4. Delete a session from its controls when you no longer need it.

> **Note:** Studio sessions are owner-scoped — you can only see and edit sessions you created. Audio and session data are stored privately per session.

## See also

- [Part tracks & practice](../students/part-tracks-and-practice.md)
- [Studio basics](../students/studio-basics.md)
- [Finding your music](../students/finding-your-music.md)
- [Content management](../tenants/content-management.md)
- [The mobile app](../getting-started/the-mobile-app.md)
- [iOS mobile app FAQ](../faq/ios-mobile-app.md)
`,Te=`---
title: "Template Courses"
audience: tenant
order: 6
summary: "Adopt a pre-built course from the Course Store into your program, then edit everything to fit your students."
updated: 2026-07-08
---
# Template Courses

Template Courses let a teacher adopt a ready-made course into their own program instead of building one from scratch. When you adopt a template, GleeWorld copies it into your program as a normal course — and you can edit everything afterward.

Browse them in the **Course Store** at \`/academy/store\`. A read-only preview of a template course is at \`/academy/templates/:courseId\`.

**Before you start:**

- Confirm you are an admin. Adopting a template requires an admin; demo-viewer accounts cannot adopt.

## Adopt a template course

1. Open the **Course Store** at \`/academy/store\`.
2. Browse the available templates. Each is shown with a **Free** badge and an **Adopt** button.
3. Click **Adopt** on the course you want.
4. On success, GleeWorld routes you into the new course at \`/academy/c/<course_code>\`.

> **Note:** Templates are maintained on the GleeWorld platform and shared across programs, but adopting one copies it into your program. Your edits never change the original template or anyone else's copy.

> **Warning:** If adoption fails, check your role. The store blocks demo-viewer accounts (\`demo_viewer_cannot_adopt\`) and requires an admin (\`admin_required_to_adopt\`).

## Edit an adopted course

An adopted course is a normal course you fully control.

1. Open the course from your Academy.
2. Work through its **Unit → Lesson → Exercise** structure.
3. **Add lessons** as needed.
4. Edit each lesson's **title**, **content**, **objectives**, and **listening**, including attaching audio from your [media library](../tenants/content-management.md).

> **Note:** Edit rights differ by course type. A normal (adopted) course can be edited by an admin or director. A raw **template** itself can only be edited by a super-admin.

## Paid template courses

> **Note:**

## See also

- [Glee Academy](glee-academy.md)
- [Content management](../tenants/content-management.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Billing & plans](../tenants/billing-and-plans.md)
- [Assignments & submissions](../students/assignments-and-submissions.md)
`,Ae=`---
title: "Get in with your tickets"
audience: fan
order: 3
summary: "Open your tickets page, save your QR codes, and check in at the door for a concert."
updated: 2026-07-08
---
# Get in with your tickets

After you buy or are granted tickets, they live on a private tickets page. That same page is emailed to you so you can reopen it at the door. Each ticket shows a QR code that the door team scans to check you in.

**Before you start:** Have the tickets link — either the page your browser opened after payment, or the email you received. No account or sign-in is needed to open your tickets.

## Open your tickets

1. Reopen your tickets from the link in your confirmation email, **or** return to the page shown right after you paid.
2. Let the page load. It updates on its own while your payment is still processing.

Your tickets page shows one of these states:

- **Processing your payment** — payment is still confirming. The page checks again every couple of seconds. After about 30 seconds it reminds you that your tickets also arrive by email.
- **You're in** — your payment succeeded. Each ticket appears as its own card with a QR code.
- **Complimentary tickets** — free tickets that were approved for you: "show the QR codes below at the door."
- **Payment didn't go through** — your card wasn't charged; use **Try again** to restart.
- **Refunded** — this order was refunded.

> **Note:** If you see "Order not found" with "That link is wrong or has expired," open the link straight from the email the program sent you rather than an old or copied one.

## Check in at the door

1. Open your tickets page before you reach the entrance.
2. Find the ticket card you want to use. Each shows its tier, its number in your order ("N of M"), the concert, and your name.
3. Hold the QR code up for the door team to scan.
4. Repeat for each person in your party if your order has more than one ticket.

Once a ticket is scanned, it shows **Already redeemed** and appears grayed out, so it can't be reused. A ticket the organizer has cancelled shows **Voided**.

> **Tip:** Screens can be slow or dim in a busy lobby. Have your tickets page open and your brightness up before you reach the door.

## Save a QR code ahead of time

If you're worried about signal at the venue, save your QR codes in advance.

1. Open your tickets page.
2. On an iPhone, press and hold a QR code to save or share the image.
3. Keep the saved image handy to show at the door.

## Complimentary tickets

If you were approved for complimentary tickets, they appear on this same page under **You're in** / **Complimentary tickets**. Show each QR code at the door exactly as you would a purchased ticket.

## Find upcoming events

Your program may publish a public calendar of events (its address ends in **/public-calendar**).

## Ticket states at a glance

| You see | What it means |
|---|---|
| Processing your payment | Payment is still confirming; the page refreshes itself. |
| You're in | Paid and ready — show the QR codes at the door. |
| Complimentary tickets | Free tickets approved for you — show the QR codes. |
| Already redeemed | This ticket was already scanned and can't be reused. |
| Voided | The organizer cancelled this ticket. |
| Payment didn't go through | Your card wasn't charged; try again. |
| Refunded | This order was refunded. |

## See also

- [Buy tickets to a concert](buying-tickets.md)
- [Follow along with a concert program](following-a-program.md)
- [Common issues](../faq/common-issues.md)
- [Box Office](../add-ons/box-office.md) — how organizers run door check-in
`,Ce=`---
title: "Buy tickets to a concert"
audience: fan
order: 2
summary: "Browse a program's upcoming concerts, pick your tickets, and pay securely by card — no account needed."
updated: 2026-07-08
---
# Buy tickets to a concert

You can buy general-admission tickets to your program's concerts right from your browser. You do not need an account, and you do not need the mobile app. Payment is handled securely through Stripe, and your tickets arrive by email.

Each program has its own ticket site. The concerts you see belong to that program only.

**Before you start:** Get the link to the concert or to the program's Box Office page. Have a payment card and an email address ready — your tickets are sent to the email you enter.

## Browse upcoming concerts

1. Open the program's Box Office page (its address ends in **/box-office**).
2. Review the concerts on sale. The soonest show appears as a large featured card; others appear below under **Also upcoming**.
3. Read each card's date, title, time, venue, description, and starting price (**From $X**).
4. Tap a concert to open its ticket page.

Watch the badges on each card:

- **Sold out** — no tickets remain in any price tier.
- **Only N left** — fewer than about 20 tickets remain.
- **Free** — that concert has a no-cost ticket tier.

> **Note:** If you see "No concerts on sale right now," that program has nothing available at the moment. Check back later or ask the organizer.

## Choose and buy tickets

On a concert's ticket page (its address contains **/concert-tickets/**):

1. Review the concert image, title, full date and time, venue, and description.
2. Under **Choose your tickets**, select a price tier. Each tier shows its name, description, price, and how many are left. Sold-out tiers can't be selected.
3. Set the **Quantity**. You can buy from 1 up to the number remaining, to a maximum of 20 per order.
4. Check the **Total**, which updates as you change the quantity.
5. Enter **Your name**.
6. Enter your address in **Email for your tickets**. Double-check it — this is where your tickets are sent.
7. Click **Continue to payment**.
8. Complete payment on the secure Stripe checkout page that opens.

After a successful payment, your browser returns to your tickets page, and your tickets are also emailed to you.

> **Tip:** The footer confirms the setup: "Secure checkout via Stripe. You'll receive your tickets by email."

## If your checkout is cancelled

If you back out of the Stripe page, you return to the concert with an amber message: "Your checkout was cancelled — no card was charged. Pick a tier below to try again." No money leaves your account. Choose a tier and start again when you're ready.

## If a concert is sold out

When every tier is sold out, the purchase form is hidden and there's no way to complete an order. Contact the organizer to ask whether more tickets or a waitlist may open up.

## Request complimentary tickets

Some concerts let approved guests request free (complimentary) tickets. This option is only available when the organizer has turned it on **and** you are signed in to your account. Anonymous visitors won't see it.

1. [Sign in](../getting-started/signing-in-and-getting-help.md) to your account.
2. Open the concert's ticket page.
3. Click **Need comp tickets?**
4. In the dialog, enter the quantity, your tier preference, your name, email, and an optional message.
5. Submit the request.

You'll see "Request submitted — we'll email you when it's decided." The organizer approves or denies each request, and you're notified by email. You can have only one pending request per concert.

## What happens after you pay

Your tickets appear on your order page and are emailed to you. Each ticket carries a QR code you show at the door. For how to open, save, and use them, see [Get in with your tickets](attending-events.md).

## Refunds

Refunds are handled by the organizer, not from your tickets page. If you need one, contact the program that sold you the tickets.

## See also

- [Get in with your tickets](attending-events.md)
- [Follow along with a concert program](following-a-program.md)
- [Box Office](../add-ons/box-office.md) — how organizers sell and manage tickets
- [Billing and payments FAQ](../faq/billing-and-payments.md)
`,Ie=`---
title: "Follow along with a concert program"
audience: fan
order: 1
summary: "Open a published concert program on your phone to read the running order, piece notes, and performer roster during a show."
updated: 2026-07-08
---
# Follow along with a concert program

A concert program is a web page you open on your phone before or during a performance. It shows the running order, notes about each piece, and the list of performers, so you can read along instead of holding a paper program.

Despite the word "follow," there is nothing to subscribe to and no account to create. A program is a published, read-only page. You reach it from a link the organizer shares or a QR code printed on a lobby flyer or program insert.

**Before you start:** Get the program's web link from your program, or find the QR code posted in the lobby or on the printed program. You do not need to sign in.

## Open a program

1. Tap the program link the organizer shared, **or** point your phone camera at the QR code and open the link that appears.
2. Wait for the page to load in your browser.
3. Scroll down to move through the program.

> **Tip:** The page is designed for phones. Turn your screen brightness down and silence your phone before the performance begins.

## What you'll see

A program is a stack of cards you scroll through top to bottom:

- A **cover** with the concert title, subtitle, conductor, accompanist, venue, and date.
- A **timeline** of the numbered pieces, each with its composer or arranger.
- **Performance notes** for individual pieces, when the organizer has added them.
- A **roster** grid listing the performing sections and the students in each.
- A **rights and licensing** footer.
- A **Share this program** card with the page's web address.

Organizers can hide some cards from the audience view, so a given program may show only part of this list.

## Share a program with someone

1. Scroll to the **Share this program** card.
2. Copy the web address shown there.
3. Send it to a friend by text, email, or your usual app.

Anyone with the link can open the program while it stays published. No sign-in is required on their end either.

## Print a program

The program page is formatted for printing.

1. Open the program in your phone or computer browser.
2. Use your browser's **Print** command.
3. Print or save as PDF.

## If the program won't open

If you see **Program not found** with the message "This program may have been unpublished or moved," the organizer has either taken the program offline or changed its address. Use the **Home** link on that page, and ask the organizer for the current link.

> **Note:** A program is only readable while the organizer keeps it published. A link that worked during one concert may stop working afterward.

## See also

- [Buy tickets to a concert](buying-tickets.md)
- [Get in with your tickets](attending-events.md)
- [Concert Planner](../add-ons/concert-planner.md) — how organizers build and publish these programs
`,We=`---
title: "Accounts and Sign-in"
audience: all
order: 1
summary: "How to sign in, create an account, reset your password, change it, and delete your account in GleeWorld."
updated: 2026-07-08
---
# Accounts and Sign-in

This page answers the most common questions about getting into GleeWorld: signing in, creating an account, recovering a forgotten password, and managing your account. GleeWorld is a shared platform used by many programs (choirs, bands, and music classrooms). Each program has its own web address, so always start from the link your program gave you, or open the mobile app.

## Sign in to your account

**Before you start:** Use the web address for your program (for example, your program's GleeWorld subdomain) or open the GleeWorld app.

1. Go to the sign-in page at **/auth**.
2. Enter your **Email**.
3. Enter your **Password**. Click the eye icon to show or hide what you type.
4. Click **Sign in**.

After you sign in, GleeWorld sends you to the home screen for your role automatically.

> **Tip:** If your program emailed you a one-tap sign-in link instead of a password, just open that link on your device. Magic links are single-use and expire one hour after they are sent.

## Create an account

Anyone can create a free account to follow a program as a fan. Students do not sign themselves up as students.

1. On the **/auth** page, switch to **Create account**.
2. Enter your **Full name**.
3. Enter your **Email**.
4. Enter a **Password**.
5. Click **Create account**.
6. If your program requires email confirmation, open the confirmation link in the email you receive. Otherwise your fan account is ready right away.

> **Note:** Public sign-ups create fan accounts. Students are enrolled separately by the program director, so if you are joining as a student, use the invite or join link your director sends you. See [Joining and your first sign-in](../students/joining-and-first-sign-in.md).

> **Note:** Some programs run a read-only demo. On a demo workspace, public sign-up is turned off and the option becomes **Request your workspace**.

## Reset a forgotten password

1. On the **/auth** page, click **Forgot your password?**
2. Enter the **Email** for your account.
3. Submit the form. GleeWorld sends a reset link to that address, using your program's own web address.
4. Open the link. It takes you to the **/reset-password** page.
5. Enter your new password (at least 6 characters) and enter it again to confirm.
6. Save. You are redirected to the home page after a few seconds.

> **Warning:** Reset links are time-limited. If the page reports that the link is expired or invalid, request a new one from **Forgot your password?**

## Change your password while signed in

Use this when you already know your password and just want to update it.

1. Open your account **Settings**.
2. Open the **Change password** dialog.
3. Enter your new password. It must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and one special character.
4. Save.

> **Note:** If your program provisioned your admin account for you, you may be asked to set a new password the first time you sign in before you can continue.

## Delete your account

You can delete your own account at any time.

1. Open your account **Settings**.
2. Open the **Delete account** dialog.
3. Type **DELETE** to confirm.
4. Confirm the deletion. GleeWorld removes your account, signs you out, and returns you to the home page.

> **Warning:** Deleting your account cannot be undone.

## Why do I keep getting signed out on a different address?

Each program lives on its own web address. If you sign in on the wrong program's address, GleeWorld signs you out and sends you to the correct one. Always use the address for your own program. The one exception is the platform owner, who can sign in on any program's address.

## Understand your role

What you can see and do in GleeWorld depends on your role (for example, fan, student, graduate, instructor, or admin). Your director sets your role. For a full breakdown, see [Accounts and roles](../getting-started/accounts-and-roles.md).

## See also

- [Signing in and getting help](../getting-started/signing-in-and-getting-help.md)
- [Accounts and roles](../getting-started/accounts-and-roles.md)
- [Joining and your first sign-in](../students/joining-and-first-sign-in.md)
- [Common issues](../faq/common-issues.md)
`,Pe=`---
title: "Billing and Payments"
audience: all
order: 2
summary: "How GleeWorld plans and add-ons are billed, how to activate and manage them, and how ticket payments work."
updated: 2026-07-08
---
# Billing and Payments

This page explains how GleeWorld charges for plans and optional add-ons, how a director activates and manages billing, and how payments work when a fan buys a ticket. Plans and add-ons are managed by program admins; ticket payments apply to anyone buying a ticket.

## Plans at a glance

GleeWorld offers four monthly plans. Every plan includes hosting, SSL, automatic backups, and ongoing platform updates.

| Plan | Price | Students | Storage |
|---|---|---|---|
| Personal | $8.99/mo (annual $79) | 1 | 25 GB |
| Director (most popular) | $39/mo (annual $390) | Up to 60 | 50 GB |
| Director+ | $69/mo (annual $690) | Up to 150 | 150 GB |
| Institution | From $199/mo (annual $1,990) | Unlimited | 1 TB |

The Institution plan is quote-based and includes multi-ensemble support, single sign-on, Canvas integration, broadcast texts, and Box Office. Educational institutions receive 20% off all tiers.

> **Note:** Choosing the annual cycle is labeled "save 2 months" compared with paying monthly.

## Can I check out and pay online right now?

Self-serve plan checkout on the public marketing site is not available yet. Non-quote plans show **Coming soon — talk to us**, and the Institution plan shows **Talk to us**. To start or change a plan today, contact the GleeWorld team.

Inside your workspace, a director may be able to switch plans directly if a payment price has been configured:

1. Open **Workspace Settings** at **/dashboard/workspace**.
2. Open the **Plan** tab.
3. Toggle **Monthly** or **Annual**.
4. Click **Choose plan** or **Switch to this plan** on the plan you want. GleeWorld redirects you to secure Stripe checkout.

> **Note:** The button is disabled if no payment price is configured for that plan. If it is disabled, contact the GleeWorld team to complete the change.

## Add-ons

Add-ons are optional modules you activate on top of your plan. They are billed separately and are only available when your program activates them. Prices are the same at every plan level:

- Concert Planner — $19/mo
- Part Tracks — $29/mo
- Practice Studio — $29/mo
- Sight Reading — $15/mo
- Tour Manager — $25/mo
- Box Office — $39/mo
- Contracts & Finance — $25/mo
- All-Access Bundle — $129/mo (all seven add-on modules; saves about $52/mo versus buying separately)

> **Note:** Some features are always included with your plan, while others are add-ons. If a screen shows an "add-on" upgrade panel, that feature is not active for your program yet.

## Activate an add-on

**Before you start:** You must be a workspace admin. Non-admins see a read-only badge and cannot change settings.

1. Open **Workspace Settings** at **/dashboard/workspace**.
2. Open the **Add-ons** tab.
3. Find the add-on you want.
4. Click **Activate**.
5. For a priced add-on, complete secure Stripe checkout. Free ($0) add-ons activate directly without checkout.

To turn an add-on off, click **Deactivate** on that add-on.

> **Note:** On a demo workspace, add-ons toggle on and off instantly as a free sandbox, with no payment involved.

For step-by-step guidance, see [Activating add-ons](../tenants/activating-add-ons.md).

## Manage billing, invoices, and cards

1. Open **Workspace Settings** at **/dashboard/workspace**.
2. Open the **Billing** tab. This lists your active paid add-ons and a monthly total.
3. Click **Open customer portal**. GleeWorld sends you to the Stripe customer portal, where you can update your card, view invoices, and cancel.

> **Note:** If you have not activated any paid add-on yet, the portal is not available and you will see "No Stripe customer yet — activate an add-on first."

## How ticket payments work (for fans and buyers)

If a program uses the Box Office add-on to sell tickets, buyers pay by card through secure Stripe checkout. Ticket money is collected into the program's own connected Stripe account, and buyers receive their tickets by email. GleeWorld's marketing describes ticket sales as "you keep 100% of ticket sales," but the ticket-checkout code applies a 1% platform fee on paid tickets.

For the buyer's experience, see [Buying tickets](../fans/buying-tickets.md). For selling setup, see [Box Office](../add-ons/box-office.md).

## See also

- [Billing and plans](../tenants/billing-and-plans.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Box Office](../add-ons/box-office.md)
- [Buying tickets](../fans/buying-tickets.md)
`,Oe=`---
title: "Common Issues and Troubleshooting"
audience: all
order: 5
summary: "Fixes for the most common GleeWorld problems: sign-in, expired links, stale versions, locked features, playback, and recording."
updated: 2026-07-08
---
# Common Issues and Troubleshooting

Use this page to solve the problems people run into most often. If your issue is not here, contact your program director, or email the GleeWorld team at kevin@gleeworld.org.

## I can't sign in

1. Confirm you are on your program's own web address, or open the GleeWorld app.
2. Check that your email is spelled correctly.
3. Use the eye icon to confirm your password is typed correctly.
4. If you still cannot sign in, use **Forgot your password?** on the **/auth** page to reset it.

See [Accounts and sign-in](../faq/accounts-and-sign-in.md).

## I keep getting signed out or sent to a different address

Each program lives on its own web address. If you sign in on another program's address, GleeWorld signs you out and redirects you to the correct one. Always start from your own program's link. If you use more than one program, sign in to each on its own address.

## My password reset link or magic link says it's expired

Reset links and one-tap sign-in links are time-limited, and magic links can be used only once and expire one hour after they are sent.

1. Return to the **/auth** page.
2. Request a fresh link with **Forgot your password?** (for a reset) or ask your director to resend your invite (for a sign-in link).
3. Open the new link promptly.

## I'm seeing an old version of the page

GleeWorld does not cache the app in a way that traps you on an old build.

1. Reload the page, or fully close and reopen the app.
2. Sign in again if prompted.

The latest version loads on the next open.

## A feature shows an "add-on" upgrade panel

Some features are optional add-ons that a program activates. If you see a panel that says the feature is an add-on and offers **View available add-ons**, that feature is not active for your program.

- If you are a student or fan, ask your director to activate it.
- If you are an admin, activate it in **Workspace Settings → Add-ons**. See [Activating add-ons](../tenants/activating-add-ons.md).

## An Apple Music backing track won't play

Playing Apple Music tracks requires an active Apple Music subscription. If you are not subscribed, GleeWorld prompts you to subscribe when you press play. Use a downloaded or uploaded audio track instead if you do not have a subscription.

## My recording has problems (no sound, echo, or bleed)

1. Wear headphones so the backing track does not bleed into your microphone.
2. Grant microphone permission when your browser or the app asks.
3. Choose the correct microphone and output device in the recorder's device pickers.
4. Keep recordings under the 10-minute limit in the per-part recorder.

> **Note:** On Safari, output routing falls back to your system's default device. If routing sounds wrong, set your default output in your operating system, or use the GleeWorld app on iPhone for native audio.

See [Part Tracks and practice](../students/part-tracks-and-practice.md) and [Studio basics](../students/studio-basics.md).

## A QR check-in says "Login Required"

Attendance check-in requires you to be signed in.

1. Sign in to your account.
2. Re-open the QR link or scan again. GleeWorld returns you to the check-in after sign-in.

If you see "Invalid QR Code," the code has expired; ask your instructor to display a new one. See [Checking in with QR](../students/checking-in-with-qr.md).

## I can't take attendance as a leader

Taking attendance is limited to super-admins, exec-board officers, and users with the secretary role. If you should have this permission, ask your director to grant it. See [Calendar and attendance](../tenants/calendar-and-attendance.md).

## My changes won't save in the demo

Demo sessions are read-only. If you try to save in a demo, GleeWorld shows a friendly message instead of saving. To make real changes, sign in to your own program's workspace.

## See also

- [Accounts and sign-in](../faq/accounts-and-sign-in.md)
- [iOS and the mobile app](../faq/ios-mobile-app.md)
- [Activating add-ons](../tenants/activating-add-ons.md)
- [Checking in with QR](../students/checking-in-with-qr.md)
`,Ge=`---
title: "iOS and the Mobile App"
audience: all
order: 4
summary: "What the GleeWorld iOS app is, how to install it, choose your organization, grant permissions, and get notifications."
updated: 2026-07-08
---
# iOS and the Mobile App

This page covers the GleeWorld mobile app: what it is, how to install it, how to pick your organization on first launch, and which permissions it asks for.

## What is the GleeWorld app?

The GleeWorld app is a native wrapper around the same GleeWorld you use on the web, so your account, program, and features are the same in both places. On iPhone it adds native audio for the Studio and Part Tracks tools and native push notifications.

## Install the app

1. Open the **App Store** on your iPhone.
2. Search for **GleeWorld** (App Store ID 6779189993).
3. Tap **Get** to install.
4. Open the app.

> **Note:** The current app version is 1.0.3.

## Choose your organization on first launch

Because the app is not tied to a single program's web address, you pick your program the first time you open it.

1. Open the app.
2. On the organization picker, choose your program from the list of active organizations.
3. Sign in with your account.

GleeWorld remembers your choice and corrects it automatically after you sign in, based on your account.

> **Tip:** To explore without an account, choose the Demo organization for a read-only Director demo session.

## Sign in

Signing in works the same as on the web. See [Accounts and sign-in](../faq/accounts-and-sign-in.md). If you were emailed a one-tap link, open it on your phone with the app installed.

## Permissions the app asks for

The app requests these permissions only when a feature needs them:

- **Apple Music** — to play backing tracks during sight-singing and rehearsals.
- **Camera** — for video meetings and profile photos.
- **Microphone** — for the instrument tuner and music practice tools.

> **Note:** Playing Apple Music backing tracks requires an active Apple Music subscription. Without one, GleeWorld prompts you to subscribe when you press play.

## Notifications

The app supports push notifications on iPhone. Allow notifications when prompted so your program can reach you about rehearsals, events, and updates.

## Recording and the Studio on iPhone

The app includes a native audio engine for the Studio and Part Tracks recording tools, which gives more reliable capture than a browser. Wear headphones while recording so the backing track does not bleed into your microphone. For how the tools work, see [Studio basics](../students/studio-basics.md) and [Part Tracks and practice](../students/part-tracks-and-practice.md).

## Why does the app sometimes need to reload?

After you sign in, the app may reload once to load your program's branding and settings. This is expected.

## See also

- [The mobile app](../getting-started/the-mobile-app.md)
- [Accounts and sign-in](../faq/accounts-and-sign-in.md)
- [Studio basics](../students/studio-basics.md)
- [Common issues](../faq/common-issues.md)
`,Ne=`---
title: "Privacy and Data"
audience: all
order: 3
summary: "How your program's data is kept separate, how to export it, how to delete your account, and where to find GleeWorld's privacy and school agreements."
updated: 2026-07-08
---
# Privacy and Data

This page answers common questions about how your information is handled in GleeWorld: how programs are kept separate, how to export data, how to delete your account, and where to read GleeWorld's privacy documents.

## Is my program's data kept separate from other programs?

Yes. GleeWorld is a shared platform, but each program's data is isolated. Every program is served on its own web address and its data is scoped to that program at the database level, so people in one program cannot read another program's records. If you sign in on the wrong program's address, GleeWorld signs you out and sends you to the correct one.

## What personal information does GleeWorld store?

GleeWorld stores the account and program information needed to run your program, such as your name, email, and role, plus program content like rosters, music, recordings, attendance, and events. For the authoritative description of what is collected and how it is used, read GleeWorld's Privacy Policy at **/privacy**.

## Export your program's data

**Before you start:** You must be a workspace admin.

1. Open **Workspace Settings** at **/dashboard/workspace**.
2. Open the **General** tab.
3. Click **Data export**.

The screen confirms that a super-admin will receive the export bundle by email.

## Delete your account

You can delete your own account at any time from your account **Settings** using the **Delete account** dialog. You type **DELETE** to confirm, and GleeWorld removes your account and signs you out. Deletion cannot be undone. For steps, see [Accounts and sign-in](../faq/accounts-and-sign-in.md).

> **Warning:** Deleting your account is different from a director removing you from a roster. If you only want to leave a program, contact your director.

## Privacy documents and school agreements

GleeWorld publishes the following, linked from the footer of the marketing site:

- **Privacy Policy** — **/privacy**
- **Terms** — **/terms**
- **Trust Center / Security** — **/security**
- **Data Processing Agreement (Schools)** — **/dpa**
- **Copyright Policy** — **/copyright-policy**

> **Tip:** If you represent a school or district and need a signed data processing agreement, start with the DPA page at **/dpa**, then email the GleeWorld team at kevin@gleeworld.org.

## Who can see recordings and grades?

Student practice recordings and released grades are private to each student. Students see only their own takes and only the grades a teacher has released; teachers and admins see the full roster. For details, see [Part Tracks and practice](../students/part-tracks-and-practice.md) and [Assignments and submissions](../students/assignments-and-submissions.md).

## See also

- [Accounts and sign-in](../faq/accounts-and-sign-in.md)
- [Program setup](../tenants/program-setup.md)
- [Part Tracks and practice](../students/part-tracks-and-practice.md)
`,Fe=`---
title: "Accounts and Roles"
audience: all
order: 2
summary: "Explains the kinds of GleeWorld accounts, how public sign-ups differ from enrolled students, and which role sees which home screen."
updated: 2026-07-08
---
# Accounts and Roles

Everything you can see and do in GleeWorld depends on your **role**. Your role is set on your profile within a program, and it decides which home screen you land on after signing in and which features you can open. This page explains the account types and what each one can do.

## How you get an account

There are two common ways to end up with a GleeWorld account:

1. **You sign up yourself.** When you create an account from a program's sign-in page, you become a **fan** account. As the sign-up screen states, "Students are enrolled separately by the program director."
2. **A director enrolls you.** Students, instructors, and administrators are added to a program by its director or admin, which sets the correct role for you.

> **Note:** Signing up on your own does not make you a student. If you are joining a program as a student, follow your director's enrollment steps instead. See [Joining and first sign-in](../students/joining-and-first-sign-in.md).

> **Note:** On a program running in demo mode, public sign-up is turned off — the page offers login only and a **Request your workspace** option.

## The roles

GleeWorld recognizes these primary roles, listed roughly from most access to least:

- **Super-admin** — full control of a program. Super-admins can manage users and settings and can open any add-on module without extra activation. (The term *director* is treated as a super-admin.)
- **Admin** — can manage users and most program features.
- **Executive / instructor** — teaching and leadership access (for example, running classes and rehearsals).
- **Student** — the enrolled participant role: find music, practice, and submit assignments.
- **Graduate** — a former student who keeps a graduate-level view of the program.
- **Auditioner** — someone in the audition process.
- **Fan** — a supporter or family member following the program publicly.
- **Visitor** — not signed in.

> **Note:** Throughout GleeWorld, the people enrolled in a program are called **students**, and those who have completed the program are called **graduates**.

## Where each role lands after sign-in

After you sign in, GleeWorld sends you to the home screen for your role:

- **Super-admin, admin, instructor, and student** → the **Command Center** dashboard (**/dashboard**).
- **Graduate** → the graduates area.
- **Auditioner** → the auditioner area (**/auditioner**).
- **Fan** → the fan area (**/fan**).

The platform owner (a super-admin on the main GleeWorld tenant) has an additional platform view.

> **Tip:** If you have an account but haven't completed your profile yet, GleeWorld routes you to onboarding to finish setting it up before you reach your dashboard.

## Extra "app roles" for helpers

Beyond the primary role, a program can assign secondary helper roles independently — for example **secretary**, **librarian**, or **wardrobe manager**. These grant specific capabilities (such as a librarian's music-library editing) without changing your main role.

## What admins and super-admins can do that others cannot

A few capabilities are reserved:

- **Manage users** — admins and super-admins.
- **Delete users** and **change system settings** — super-admins only.
- **Edit the music library** — admins, super-admins, and librarians.

> **Warning:** Because super-admins can bypass add-on gating and manage users and settings, grant the super-admin role sparingly.

## See also

- [Signing in and getting help](../getting-started/signing-in-and-getting-help.md)
- [What is GleeWorld?](../getting-started/what-is-gleeworld.md)
- [Joining and first sign-in](../students/joining-and-first-sign-in.md)
- [Roster and students](../tenants/roster-and-students.md)
- [Following a program](../fans/following-a-program.md)
`,Re=`---
title: "Signing In and Getting Help"
audience: all
order: 4
summary: "Step-by-step sign-in, account creation, and password recovery, plus where to go for help."
updated: 2026-07-08
---
# Signing In and Getting Help

This page walks through signing in to GleeWorld, creating an account, recovering a forgotten password, and finding help.

## Sign in

**Before you start:** Go to your program's web address (its GleeWorld subdomain) or open the mobile app and select your organization.

1. Open the sign-in page (**/auth**), or select **Sign in** from your program's landing page.
2. Make sure the card is set to **Sign in**.
3. Enter your **email**.
4. Enter your **password**. Use the eye toggle to show or hide it.
5. Select **Sign in**.

On success you'll see a **Welcome back!** message and GleeWorld takes you to the home screen for your role (see [Accounts and roles](../getting-started/accounts-and-roles.md)).

> **Tip:** If you were trying to reach a specific page before signing in, GleeWorld returns you there after you sign in.

## Create an account

Public sign-ups create a **fan** account. Students are enrolled by their director, not through this form.

1. On the sign-in page, switch the card to **Create account**.
2. Enter your **full name**.
3. Enter your **email**.
4. Enter a **password**.
5. Select the button to create your account.
6. If prompted, open the confirmation link GleeWorld emails you to finish activating your account.

> **Note:** On a program in demo mode, public sign-up is disabled. Instead you'll see a **Request your workspace** option.

> **Note:**

## Reset a forgotten password

1. On the sign-in page, select **Forgot your password?**
2. Enter your **email**.
3. Submit the request, then check your email for the reset link.
4. Open the link to reach the **reset password** page.
5. Enter a **new password** (at least 6 characters) and confirm it.
6. Save. GleeWorld signs you in and returns you to the home page shortly after.

> **Note:** The reset link is sent for the program you requested it from and returns you to that program's site. If the link has expired or is invalid, request a new one.

## First sign-in after a director creates your account

If a director provisioned your account, you may be asked to change your password on first sign-in. On that screen, choose a password with **at least 8 characters, including an uppercase letter, a lowercase letter, and a number**. Once saved, you continue to your dashboard.

## Change your password or delete your account later

From your account settings you can change your password without re-entering the old one; the in-app rule is at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character. You can also delete your account: type **DELETE** to confirm, and GleeWorld removes your account and signs you out.

> **Warning:** Deleting your account is permanent and cannot be undone.

## Getting help

If you get stuck:

- Check the relevant FAQ: [Accounts and sign-in](../faq/accounts-and-sign-in.md), [Common issues](../faq/common-issues.md), [Billing and payments](../faq/billing-and-payments.md), [Privacy and data](../faq/privacy-and-data.md), or [iOS mobile app](../faq/ios-mobile-app.md).
- Reach the GleeWorld team by email at **kevin@gleeworld.org**.
- For questions specific to your program (enrollment, your role, your music), contact your program's director or admin.

> **Note:**

## See also

- [Accounts and roles](../getting-started/accounts-and-roles.md)
- [The mobile app](../getting-started/the-mobile-app.md)
- [What is GleeWorld?](../getting-started/what-is-gleeworld.md)
- [Accounts and sign-in FAQ](../faq/accounts-and-sign-in.md)
- [Common issues](../faq/common-issues.md)
`,Me=`---
title: "The GleeWorld Mobile App"
audience: all
order: 3
summary: "How to install and set up the GleeWorld iOS app, choose your organization, and grant the permissions it needs."
updated: 2026-07-08
---
# The GleeWorld Mobile App

GleeWorld has a native iOS app that wraps the same GleeWorld experience you use on the web, with added mobile features like push notifications, an on-device practice audio engine, and Apple Music playback for backing tracks. This page covers installing it, choosing your organization, and granting permissions.

> **Note:** This section documents the iOS app.

## Install the app

**Before you start:** Use an iPhone or iPad signed in to your Apple ID.

1. Open the **App Store**.
2. Search for **GleeWorld** (the app is published by GleeWorld; App Store id 6779189993).
3. Tap **Get** to install.
4. Open **GleeWorld**.

> **Tip:** If you visit GleeWorld in Safari on an iPhone, a Smart App Banner offers to open or install the app for you.

## Choose your organization on first launch

Unlike the web, the app has no program-specific address, so on first launch you pick which organization to use.

1. On the organization screen, review the list of active programs.
2. Tap **your program** to select it.
3. To look around without an account first, tap the **Demo** organization for a read-only Director demo.

The app remembers your choice. After you sign in, GleeWorld confirms your program from your account and corrects the selection automatically if needed. Signing out returns you to the organization picker.

## Sign in

Signing in works the same as on the web. Use the email and password for your account in the program you selected. See [Signing in and getting help](../getting-started/signing-in-and-getting-help.md) for the full steps, including password reset.

## Grant permissions

The app asks for permissions only when a feature needs them. Grant them so those features work:

- **Apple Music** — to play backing tracks during sight-singing and rehearsals.
- **Microphone** — for the instrument tuner and music practice tools.
- **Camera** — for video meetings and profile photos.
- **Notifications** — to receive push alerts from your program.

> **Tip:** You can change any of these later in the iOS **Settings** app under GleeWorld.

> **Note:** Apple Music playback requires an active Apple Music subscription on your device.

## Notifications

When you are signed in, the app can receive push notifications from your program. If you decline notifications during setup, turn them back on in the iOS **Settings** app under GleeWorld.

## Keeping the app up to date

Update GleeWorld through the App Store like any other app. The app bundles its own copy of the experience, so installing updates is how you receive the latest mobile features and fixes.

## See also

- [Signing in and getting help](../getting-started/signing-in-and-getting-help.md)
- [What is GleeWorld?](../getting-started/what-is-gleeworld.md)
- [Part tracks and practice](../students/part-tracks-and-practice.md)
- [Studio basics](../students/studio-basics.md)
- [iOS mobile app](../faq/ios-mobile-app.md)
`,Be=`---
title: "What Is GleeWorld?"
audience: all
order: 1
summary: "An overview of GleeWorld: what the platform does, how tenant programs work, and what plans and add-ons are available."
updated: 2026-07-08
---
# What Is GleeWorld?

GleeWorld is an all-in-one platform for choirs, bands, and music classrooms. Its promise is simple: **Run your music program. Beautifully.** In one place you get a branded website, a roster and attendance system, a music library, scheduling, practice tools, and more — set up quickly and hosted for you.

> **Note:** Throughout this manual, GleeWorld is the *platform*. Each individual choir, band, or school that runs on it is a *tenant* — referred to here as "your program." Your program has its own web address, its own branding, and its own private data.

## What you can do with GleeWorld

Depending on your plan and on any add-ons your program has activated, GleeWorld brings together:

- **A branded public site and landing page** for your program, with your name, logo, and colors.
- **A roster** of students, plus attendance and scheduling.
- **A music library** with a score viewer, so students can find and read their music.
- **Practice tools**, including Part Tracks and the Practice Studio, for rehearsing between meetings.
- **A calendar** and "Tonight" mode for what is happening now.
- **Optional add-ons** such as Box Office ticketing, Glee Academy courses, Concert Planner, and more.

## How programs are kept separate

GleeWorld is a multi-tenant service: a single platform powers many programs at once, but each program's people and data are isolated. On the web, every program has its own address (a subdomain), which loads that program's branding and connects to its own private database. When you sign in, you sign in *to your program*.

What a first-time visitor sees depends on where they land:

- The main GleeWorld marketing site shows the product overview, pricing, and a **Get started** button that opens a **Request Workspace** dialog.
- A specific program's address shows *that program's* public landing page instead.
- Once you sign in, GleeWorld takes you to the home screen that matches your role (see [Accounts and roles](../getting-started/accounts-and-roles.md)).

## Plans and add-ons at a glance

GleeWorld offers four plan tiers, from a single-user **Personal** plan up through **Director**, **Director+**, and **Institution** for larger programs. Every plan includes hosting, SSL, automatic backups, and ongoing updates. Optional add-on modules (for example, Part Tracks, Practice Studio, Concert Planner, and Box Office) plug in on top of a base plan.

> **Note:** Add-ons are optional and depend on your plan and entitlements. A feature you read about in this manual may not appear in your program until a director activates it.

> **Note:** Self-serve online checkout is not available yet. Paid plans and add-ons are arranged directly with GleeWorld ("Talk to us"). See [Billing and plans](../tenants/billing-and-plans.md) for details.

## Try it first

You can explore a read-only Director demo without an account. Visit **/try** on the web to open a demo session, or choose the **Demo** organization when you first open the mobile app. In demo mode you can look around freely; any changes you attempt are blocked and show a friendly message.

## See also

- [Accounts and roles](../getting-started/accounts-and-roles.md)
- [The mobile app](../getting-started/the-mobile-app.md)
- [Signing in and getting help](../getting-started/signing-in-and-getting-help.md)
- [Program setup](../tenants/program-setup.md)
- [Billing and plans](../tenants/billing-and-plans.md)
`,Ee=`---
title: Glossary
audience: all
order: 1
summary: Plain-language definitions of the terms used throughout the GleeWorld manual.
updated: 2026-07-08
---

# Glossary

Plain-language definitions of the terms you will meet across this manual.

**Add-on** — An optional module a program turns on in addition to its base plan
(for example, Box Office or Concert Planner). Availability depends on your plan
and on what your director has activated. See [Activating add-ons](tenants/activating-add-ons.md).

**All-Access Bundle** — A single monthly package that includes all of GleeWorld's
add-on modules together, instead of buying them one at a time.

**Attendance** — The record of who was present at a rehearsal, class, or event.
Students can check in with a QR code; staff can also mark attendance manually.
See [Calendar and attendance](tenants/calendar-and-attendance.md).

**Auditioner** — A person going through a program's audition process, with access
to the audition area but not full student features.

**Box Office** — The add-on for selling event tickets. A program keeps its ticket
revenue. See [Box Office](add-ons/box-office.md).

**Command Center** — The main dashboard you reach after signing in (at
\`/dashboard\`), with a sidebar of tools grouped by task. Also called the dashboard.

**Concert Planner** — The add-on for building concert programs: repertoire,
running order, personnel, and a published program. See [Concert Planner](add-ons/concert-planner.md).

**Director** — The most common role that runs a program day to day, and also the
name of GleeWorld's most popular plan tier. In this manual, "director" usually
means an admin who manages a tenant.

**Entitlement** — Permission for a program to use a particular paid module. If a
program is not entitled to an add-on, its features stay locked until activated.

**Fan** — A public supporter of a program who can follow it and buy tickets, but
is not enrolled as a student. See [For Fans](fans/following-a-program.md).

**Glee Academy** — The add-on for courses and structured learning (also called
Academy), with lessons, resources, and assignments. See [Glee Academy](add-ons/glee-academy.md).

**Graduate** — A former student who keeps a graduate-level view of the program.
GleeWorld uses "graduates" for those who have completed a program.

**Landing page** — A program's branded public web page. See
[Branding and landing pages](tenants/branding-and-landing-pages.md).

**Module** — A named feature area that can be gated by entitlement (for example
\`part_tracks\`, \`studio\`, \`box_office\`). Add-ons are delivered as modules.

**Part Tracks** — Practice recordings for individual voice parts, so students can
rehearse their line. See [Part Tracks and practice](students/part-tracks-and-practice.md).

**Plan tier** — The base subscription level for a program: Personal, Director,
Director+, or Institution. Each tier sets student limits, storage, and included
features. See [Billing and plans](tenants/billing-and-plans.md).

**Practice Studio (Studio)** — The in-browser tool for recording and practicing.
See [Studio basics](students/studio-basics.md).

**Program** — Tenant-neutral term for the choir, band, or class that runs on
GleeWorld. "Your program" is your tenant.

**QR check-in** — Scanning a QR code to mark yourself present at a rehearsal or
class. See [Checking in with QR](students/checking-in-with-qr.md).

**Role** — What a person can do in a program: super-admin, admin, instructor,
student, graduate, auditioner, or fan. See [Accounts and roles](getting-started/accounts-and-roles.md).

**Roster** — The list of students in a program, often grouped by voice section.

**Sub-account** — A student's individual login within a tenant. Students sign in
to their own account under their program.

**Super-admin** — The highest administrative role. A super-admin on the main
GleeWorld tenant is the platform owner; a super-admin on a regular tenant runs
that one program.

**Template course** — A ready-made course a program can adopt into its Academy.
See [Template courses](add-ons/template-courses.md).

**Tenant** — One program (choir, band, or school) running on GleeWorld, with its
own address, branding, and private data. GleeWorld is the platform; each tenant
is a separate program on it.

**Tonight mode** — A focused view of what is happening now — the current or next
event and what you need for it.

**Visitor** — Someone who is not signed in.
`,ze=`---
title: "Assignments and Submissions"
audience: student
order: 5
summary: "Find your course assignments, submit a video or written response, check grades and feedback, and handle revisions."
updated: 2026-07-08
---
# Assignments and Submissions

If your program uses courses, this page shows you how to find assignments, submit your work, and check your grades and feedback.

**Before you start:** Sign in. Courses and grading are part of your program's academy setup, so what you see here depends on the courses you are enrolled in.

> **Note:** Courses are typically part of an optional add-on. If you do not see **Courses**, **Academy**, or **My Grades** in the **Academy** navigation group, ask your director whether it is enabled for your program.

## See what is due

You have two quick ways to find work:

- Open **My Grades** in the **Academy** group to review your own submissions.
- Open the **Practice Studio** and use its **assignments** view, which shows each assignment's status (not started, in progress, submitted, completed) along with **overdue** and **next-7-days** lists.

## Open a course

When you open a course, the header shows a combined **Grade & Attendance** area. For a normal course this is your letter grade and percentage; for an attendance-only course it reads **Attendance-based**.

The course has these tabs:

- **Grades** — your grade breakdown.
- **Work** — your assignments. (This tab is hidden for attendance-only courses.)
- **Polls** — any class polls.

> **Note:** The **Work** tab shows only **published** assignments. It refreshes about every 30 seconds, so new assignments and status changes from your instructor appear without reloading.

## Submit an assignment

1. On the **Work** tab, find the assignment. Its card shows the title, due date, points, and — once graded — your awarded points and any instructor feedback.
2. Click **View** to open the assignment.
3. Submit based on the assignment type:
   - **Video/recording assignments** (for example, exercises or anything about conducting or video): record and submit a video. Your recording, along with any notes, is saved as your submission.
   - **Written assignments**: type your response in the text box and click **Submit**. GleeWorld records your word count.
4. Confirm your submission. Its status changes to **submitted**.

> **Tip:** You can edit a written submission with **Edit → Update Notes** — unless it has already moved to an AI-graded or revision-submitted state.

## Understand your submission status

Each submission shows one of these badges:

- **Submitted** — turned in, not yet graded.
- **Graded** — scored by your instructor.
- **Graded — Revision Available** — you received AI feedback and may revise.
- **Revision Submitted** — you have sent your revised work.

When AI feedback is available, a revision card appears so you can respond and resubmit.

> **Note:** Your grade shows on the assignment only after your instructor releases it. Released grades appear in the **Grades** tab.

## Sight-reading assignments

Sight-reading assignments use their own submission window. Open the assignment and follow the sight-reading submission steps shown there.

## Attendance and excuses in a course

Inside a course you also see your attendance for that course's sessions. If you were marked absent, you can request an **Excuse** on that session using the excuse form.

## See also

- [Part Tracks and practice](../students/part-tracks-and-practice.md)
- [Checking in with QR](../students/checking-in-with-qr.md)
- [Glee Academy add-on](../add-ons/glee-academy.md)
`,je=`---
title: "Checking In With QR"
audience: student
order: 6
summary: "Mark your attendance by scanning a QR code, entering a PIN, and review your own attendance history."
updated: 2026-07-08
---
# Checking In With QR

GleeWorld records your attendance when you check in at rehearsal or class. This page covers the three ways to check in and how to review your own attendance.

**Before you start:** You must be **signed in** to check in. If you are not, GleeWorld saves where you were headed and returns you there after you sign in.

> **Note:** Attendance is part of your program's calendar and academy setup. If you do not have a way to check in, ask your director how your program takes attendance.

## Check in by scanning the instructor's QR code

Your instructor displays a QR code. Scanning it either from a link or with the camera scanner records your attendance.

1. Open the QR link your instructor shares, or open the **camera QR scanner** and point it at the code.
2. Wait for GleeWorld to process the scan.
3. On success you see a confirmation such as **Attendance Recorded!** and are taken to your course home automatically.

> **Note:** Some sessions use a **two-scan** model — you scan once to check in and again to check out. If your check-in shows **Checked In — In Rehearsal**, scan the checkout QR at the end of class to complete your attendance.

> **Warning:** If a code shows **Invalid QR Code**, it has expired or is incomplete. Ask your instructor to show the current code and try again.

## Check in with a PIN

If your instructor reads out or displays a 6-digit code instead of a QR code:

1. Open the **PIN entry** screen. (You can also switch to it from the QR scanner.)
2. Type the **6-digit code** into the boxes — they advance automatically, and you can paste the whole code at once.
3. The screen submits on its own once all six digits are entered.
4. GleeWorld may briefly ask for your location to confirm you are on-site. Allow it if prompted.
5. On success you see **Attendance Recorded!** with the event details.

> **Tip:** If it fails, use **Try Again** and re-enter the code. Double-check you have the current code from your instructor.

## Review your attendance

You can see your own attendance record at any time.

1. Open your attendance history.
2. Use the period selector to view **This Month**, **Last Month**, **This Semester**, or **All Time**.
3. Review your attendance-percentage donut, the Present / Absent / Excused / Late tiles, the month heatmap, and your recent records.

Attendance is tracked with these statuses: **present**, **absent**, **excused**, **late**, and **left early**.

## Request an excuse

If you were marked absent, you can request an excuse from your attendance history or from within the course. Fill out the excuse request form for that session and submit it for your instructor to review.

## See also

- [Assignments and submissions](../students/assignments-and-submissions.md)
- [Calendar and attendance](../tenants/calendar-and-attendance.md)
- [Glee Academy add-on](../add-ons/glee-academy.md)
`,De=`---
title: "Finding Your Music"
audience: student
order: 2
summary: "Browse scores in the Music Library, search and filter, open the annotated PDF viewer, and play attached audio."
updated: 2026-07-08
---
# Finding Your Music

The **Music Library** is where you find the scores your program has posted. This page shows you how to browse, search, read, and annotate your music, and how to play any audio attached to a score.

**Before you start:** Sign in to your program's GleeWorld site. See [Joining and your first sign-in](../students/joining-and-first-sign-in.md) if you have not signed in yet.

## Open the Music Library

1. In the app navigation, open the **Music** group.
2. Click **Music Library**.

The library opens with three tabs across the top: **Scores**, **Setlists**, and **Public Domain**.

> **Note:** For students the Music Library is **read-only** for browsing and playback. Uploading scores, importing by URL, attaching audio, and editing scores are reserved for librarians and admins, so you will not see those actions.

## Browse and search scores

1. Stay on the **Scores** tab.
2. Use the **Scope** filter chips to narrow the list.
3. Type in the search box to filter by **title**, **composer**, or **voicing**.

Each score appears as a card showing its title, composer, a rights badge, voicing and difficulty badges, a course code or a **Platform** badge, an **Audio** badge if a recording is attached, and how many physical copies exist and where they are kept.

## Read and annotate a score

1. Click a score card that has a PDF, then choose **Annotate**.
2. The score opens in a near-fullscreen PDF viewer.
3. Mark up the page as you rehearse — your annotations are saved to that score.

> **Tip:** Your annotations persist, so notes you make in one rehearsal are still there the next time you open the same score.

## Play attached audio

A score can have one or more audio tracks — an uploaded file, a media-library clip, a YouTube link, or an Apple Music track. One track is marked as the default and loads automatically.

1. Open a score that shows the **Audio** badge.
2. Play the default track, or pick another attached track if more than one exists.

> **Note:** Apple Music tracks need an active Apple Music subscription. If you do not have one, GleeWorld shows a subscription prompt when you try to play that track.

## Setlists and public-domain music

- **Setlists** tab: view and play performance orderings your program has built for a concert or rehearsal.
- **Public Domain** tab: search public-domain choral music (from CPDL) to find additional repertoire.

## See also

- [Part Tracks and practice](../students/part-tracks-and-practice.md)
- [Studio basics](../students/studio-basics.md)
- [Assignments and submissions](../students/assignments-and-submissions.md)
`,qe=`---
title: "Joining and Your First Sign-In"
audience: student
order: 1
summary: "How students get a GleeWorld account, sign in for the first time, set a password, and finish their profile."
updated: 2026-07-08
---
# Joining and Your First Sign-In

Welcome to GleeWorld. GleeWorld is the platform your program uses for music, practice recording, assignments, and attendance. Your individual choir or school is called a **tenant**, and it lives at its own web address (for example, \`yourprogram.gleeworld.org\`).

This page walks you through getting into GleeWorld for the first time.

## How students get an account

Students do **not** create their own student accounts. Your program director enrolls you, so your account already carries the right role and is connected to your program.

> **Note:** If you sign up on your own from the public sign-up form, you get a **fan** account, not a student account. The sign-up screen says so directly: "Students are enrolled separately by the program director." If you accidentally created a fan account, ask your director to enroll you as a student rather than making a second account.

## Sign in for the first time

**Before you start:** Use the web address your program gave you. Signing in on the wrong tenant's address will sign you back out automatically.

1. Go to your program's GleeWorld address and open the sign-in page at **/auth**.
2. Make sure the card is set to **Sign in** (not **Create account**).
3. Enter your **email** and **password**.
4. Click the **eye** icon in the password field if you want to check what you typed.
5. Click **Sign in**. On success you see "Welcome back!" and land on your dashboard.

> **Tip:** If a link sent you here, you return to that page after signing in. Otherwise GleeWorld sends you to the home area that matches your role.

## If you are asked to change your password

Some accounts are set up so that you must choose a new password before you can continue. If that applies to you, GleeWorld sends you to the **Force password change** screen and keeps you there until you set a new one.

1. Enter a new password that has **at least 8 characters**, **one uppercase letter**, **one lowercase letter**, and **one number**.
2. Confirm the password.
3. Click to save. GleeWorld clears the requirement and lets you continue.

> **Note:** If you already changed your password elsewhere, use the **I already changed my password** button to continue.

## Finish your profile

The first time you sign in, GleeWorld may guide you through onboarding or ask you to complete your profile. A profile counts as complete once it has your **full name** (or both a first and last name). Until then, GleeWorld sends you to the profile setup step.

1. Follow the onboarding steps in order — GleeWorld auto-advances to the first step you have not finished.
2. Fill in your name and any details your program requests.
3. Finish onboarding to reach your dashboard.

## Forgot your password

1. On the **/auth** page, click **Forgot your password?**
2. Enter your email and submit.
3. Open the reset email and click the link. It lands you on the **Reset password** page.
4. Enter a new password of **at least 6 characters** and confirm it.
5. Save. GleeWorld signs you in and returns you to the home page after a few seconds.

> **Warning:** The reset link is tied to your program's address. Always request the reset from your program's own GleeWorld site, not a different one.

## See also

- [Signing in and getting help](../getting-started/signing-in-and-getting-help.md)
- [Accounts and roles](../getting-started/accounts-and-roles.md)
- [The mobile app](../getting-started/the-mobile-app.md)
- [Accounts and sign-in FAQ](../faq/accounts-and-sign-in.md)
`,Le=`---
title: "Part Tracks and Practice"
audience: student
order: 3
summary: "Record your voice part with Part Tracks, use the click track and monitor mix, and practice assignments in the Practice Studio."
updated: 2026-07-08
---
# Part Tracks and Practice

GleeWorld gives you tools to record your voice part, practice along with backing tracks, and hear the other parts while you sing. This page covers **Part Tracks** and the **Practice Studio**.

**Before you start:** Sign in, wear headphones, and allow microphone access when your browser asks. Recording without headphones lets the backing track bleed into your microphone.

> **Note:** Which of these tools appears depends on what your program has turned on. Part Tracks may be an optional add-on, so if you do not see it in the **Music** navigation group, ask your director whether it is enabled for your program.

## Two ways your program may offer Part Tracks

GleeWorld has two Part Tracks surfaces, and your program may use either one:

- **Part Tracks Studio** — a full multitrack recording environment reached from **Part Tracks** in the **Music** group.
- **Part Tracks per-piece grid** — a simpler dashboard tile for uploading or recording one MP3 per voice part on a piece.

The recording basics below apply to both.

## Record a part in Part Tracks Studio

**Before you start:** Every Part Tracks Studio project must be linked to a score in the Music Library — there is no way to record without a score first.

1. Open **Part Tracks** and click **New Project**.
2. In step 1, search for and pick a score from the Music Library.
3. In step 2, set a project **title** and a **voicing** (such as SATB or SSA). The voicing seeds your track list — for example, SATB creates Soprano, Alto, Tenor, and Bass tracks.
4. Open your project. On desktop you see three columns: **Accompaniment** and the voice-part roster on the left, the **Multitrack** timeline in the center, and **Tools** (Devices, Recording, Audio tools, Practice tracks) on the right. On a phone these stack vertically.
5. In **Accompaniment**, choose a backing track — a file, an Apple Music song or album, or a YouTube video.
6. On the row for your part, click the **mic** icon to **arm** that track.
7. Press the transport **Record** button. (It stays disabled until a track is armed.)
8. Sing your part, then press **Stop**.

> **Note:** External backing tracks (Apple Music or YouTube) play alongside the mix, but only your microphone is captured into the recording.

> **Tip:** Use the extra recording controls to sing cleaner takes — turn on a **count-in** (0, 2, 4, or 8 clicks) and set **punch-in** \`[I]\` and **punch-out** \`[O]\` markers to re-record just one section.

### Clean up a take with Audio tools

After a take, open **Audio tools** on that take to:

- **Trim silence** from the ends.
- **Even volume** to normalize the level.
- **Cut hum + hiss** to reduce background noise.
- Nudge the take **0.1s earlier** or **later** to line it up with the beat.
- **Clear** the take to start over.

## Record in the per-piece Part Tracks grid

If your program uses the simpler grid, each piece shows a row per voice part that you can solo, mute, and play together with **Play all**. To add your part, open the record window:

1. Start a recording for your part. The flow moves through **count-in**, **recording**, **encoding**, and **preview**.
2. Pick your **microphone** input and your **output** device. (In Safari, output falls back to the system default.)
3. Turn on **Hear other parts while recording** to monitor the existing parts through your chosen output, and adjust the **monitor-volume** slider.
4. Set the **click track**: tempo in BPM (40-240), time signature (2/4, 3/4, 4/4, or 6/8), count-in measures (None, 1, or 2), and whether the click keeps going while you sing. These settings are remembered for next time.
5. Record your part. Recordings can be up to **10 minutes** long.
6. Review the take in the preview player, then choose **Re-record** or **Save MP3**. Saved takes are encoded to a 128 kbps MP3.

> **Note:** For a flat, musical recording, GleeWorld deliberately turns off echo cancellation, noise suppression, and automatic gain control while you record. Headphones are strongly recommended so the other parts do not bleed into your microphone.

## Practice assignments in the Practice Studio

The **Practice Studio** brings your practice work together in one place, with three views: **assignments**, **practice**, and **record**.

1. In the **Music** group, open **Practice Studio**.
2. On the **assignments** view, see your assignments with a status of not started, in progress, submitted, or completed, plus **overdue** and **next-7-days** lists.
3. Switch to **practice** to work through material, or **record** to capture a practice take.

Inside a course, your practice recordings appear on the course's practice tab. You see only your own takes; your teacher can see the whole roster and leave feedback.

> **Tip:** If your course practice tab is empty, new recordings are created from **Music Tools → Metronome → Record practice**.

## See also

- [Finding your music](../students/finding-your-music.md)
- [Studio basics](../students/studio-basics.md)
- [Assignments and submissions](../students/assignments-and-submissions.md)
- [Studio & Part Tracks add-on](../add-ons/studio-part-tracks.md)
`,Ye=`---
title: "Studio Basics"
audience: student
order: 4
summary: "Create a Studio session, record and edit multitrack audio, and export a mix or stems to Download or your Media Library."
updated: 2026-07-08
---
# Studio Basics

The **Studio** is GleeWorld's full multitrack editor (a DAW). It is more capable than Part Tracks: you can record several tracks, edit clips on a timeline, and export a finished mix. Your Studio sessions sync across your devices.

**Before you start:** Sign in and connect headphones. Studio may be part of an optional add-on, so if you do not see **Studio** in the **Music** navigation group, ask your director whether it is enabled.

## Create a session

1. In the **Music** group, open **Studio**. The home screen lists your existing sessions with their track count, duration, and last-updated date.
2. Click **New session**.
3. Enter an optional **title**.
4. Confirm to create the session. GleeWorld opens it in the editor.

> **Tip:** To remove a session, use the **delete** button on its card and confirm.

## Record and edit

Inside the editor you have a fuller set of DAW controls:

1. On the track you want to record, click **Arm for recording**.
2. Set the **Tempo (BPM)**, **Time signature**, and **Count-in bars**, and turn on the **click / metronome** if you want it.
3. Record your take, then press stop.
4. Edit clips on the timeline — select, resize, and move them. Use **Snap to beat** or **Snap to bar** to keep edits aligned, and **Time stretch** to fit timing.
5. Add **markers** at the playhead (press **K**) to label sections.
6. Adjust each track's **Volume** and **Track color**, and open **Smart Controls** or the **Inspector** for finer control.
7. Use **Undo** to step back from any change.

> **Tip:** To bring in existing audio, use the **Import audio** dialog. You can also save a **session JSON** file as a backup of the session's structure.

## Set up your audio devices

Open **Audio settings** to:

1. Choose your **output device**.
2. Run **Test output** to confirm you can hear it.
3. Set **Recording latency compensation** so recorded takes line up with what you were hearing.

> **Note:** Latency compensation matters when you record along to existing tracks. If new takes sound slightly late, adjust this setting.

## Export your work

1. Open the **Export** / **Download** dialog.
2. Choose a format: **Stereo mix**, **Mono stems**, or **Individual files**.
3. Choose a **Destination**: **Download** to save to your device, or **Media Library** to save into GleeWorld.
4. Export.

## See also

- [Part Tracks and practice](../students/part-tracks-and-practice.md)
- [Finding your music](../students/finding-your-music.md)
- [Studio & Part Tracks add-on](../add-ons/studio-part-tracks.md)
`,Ve=`---
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

1. Go to **Workspace Settings** at \`/dashboard/workspace\` and open the **Add-ons** tab.
2. Browse the catalog. Each card shows an add-on's name, description, and price.
3. Active add-ons are marked as such; the rest show an **Activate** button.

> **Note:** The legacy link \`/settings/modules\` redirects to this same Add-ons tab.

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
`,Qe=`---
title: "Billing and plans"
audience: tenant
order: 7
summary: "Choose or switch your program's plan, track your student cap, and manage payment through the Stripe customer portal."
updated: 2026-07-08
---
# Billing and plans

Your plan sets how many students your program can hold and which features are included. This page covers choosing a plan, watching your student cap, and managing payment. Add-ons are billed separately — see [Activating add-ons](../tenants/activating-add-ons.md).

**Before you start:** You must be an admin or super-admin to change your plan or open billing. Non-admins see these tabs as read-only.

## Choose or switch your plan (Plan tab)

1. Go to **Workspace Settings** at \`/dashboard/workspace\` and open the **Plan** tab.
2. Review the available plans. Each shows a name, tagline, student cap, price, and included features.
3. Check your current plan at the top. If you have none, you will see "No paid plan yet — running on free tier."
4. Toggle between **Monthly** and **Annual** billing. Annual is labeled "save 2 months."
5. Click **Choose plan** or **Switch to this plan**. GleeWorld sends you to **Stripe** to complete checkout.

> **Note:** If a plan's button is disabled, that plan has no Stripe price configured yet and cannot be selected.

## Watch your student cap

Each plan includes a maximum number of students. The Plan tab shows your current student count against your cap.

1. On the **Plan** tab, find your usage (current students vs cap).
2. When you reach the limit, you will see "At cap — upgrade to add more."
3. Switch to a higher plan to raise the cap before inviting more students.

> **Tip:** If invites in [Roster and students](../tenants/roster-and-students.md) stop working, check whether you have hit your student cap here.

## Manage payment and invoices (Billing tab)

The **Billing** tab lists your active paid add-ons with a per-item monthly price and a monthly total.

1. Open the **Billing** tab.
2. Review your active add-ons and the total.
3. Click **Open customer portal** to reach the Stripe portal, where you can update your card, view invoices, and cancel.

> **Note:** If you see "No Stripe customer yet — activate an add-on first," your program has no billing account yet. Activate a paid add-on or choose a paid plan to create one, then return here.

## See also

- [Activating add-ons](../tenants/activating-add-ons.md) — turn add-ons on and off.
- [Program setup](../tenants/program-setup.md) — configure your workspace basics.
- [Billing and payments](../faq/billing-and-payments.md) — common billing questions.
- [Roster and students](../tenants/roster-and-students.md) — the student count that fills your cap.
`,Ue=`---
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

1. Open **Workspace Settings** at \`/dashboard/workspace\` and click the **Branding** tab.
2. Enter your **Organization name** (the full name of your program).
3. Enter a **Short name** for compact spaces.
4. Choose a **Primary color** using the color picker, or type a hex value.
5. Paste a **Logo URL** into the logo field. A preview appears next to it.
6. Save your changes.

> **Note:** The Branding tab takes a logo **URL**, not a file upload. Host your logo somewhere public first, then paste its address here.

> **Tip:** Localization fields (time zone, locale, week start, contact email) live on the **General** tab, described in [Program setup](../tenants/program-setup.md).

## Create your public page

Your public website is built at \`/admin/public-page\`. Visitors read only what you **publish** — your working draft stays private until then.

1. Go to \`/admin/public-page\`.
2. If you have never built a page, click **Create my page**. GleeWorld seeds a starter site from your branding.
3. The starter template gives you **seven blocks**: Header, Hero, Events, About, Music Player, Videos, and Contact & Footer.

> **Note:** Older links such as \`/admin/landing-editor\` and \`/admin/site-setup\` redirect to this same public-page builder.

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

1. Edit the slug under \`/sites/\`. Only lowercase letters, numbers, and hyphens are allowed.
2. Click **Check availability** to confirm the address is free.
3. Save to apply the new address.

## Publish, view, and reset

1. Click **Publish** (or **Republish changes** after edits) to make your draft live.
2. Click **View site** to open your live page at \`/sites/<slug>\`.
3. Click **Unpublish** to take the page offline.
4. Use **Reset to template** only if you want to start over.

> **Warning:** **Reset to template** deletes all your blocks and reseeds the seven-block starter. It keeps your theme, colors, and media, but it cannot be undone.

> **Note:** A separate **fan page** builder lives at \`/admin/fan-page\` for signed-in fans; its published version appears at \`/fan\`. That is distinct from your public \`/sites/<slug>\` page.

## See also

- [Program setup](../tenants/program-setup.md) — set your name and localization first.
- [Activating add-ons](../tenants/activating-add-ons.md) — unlock add-on-gated blocks.
- [Landing pages](../add-ons/landing-pages.md) — more on the public website builder.
- [Following a program](../fans/following-a-program.md) — what fans see on your public page.
`,$e=`---
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

1. Go to **Calendar** at \`/dashboard/calendar\`.
2. Open the create-event dialog.
3. Enter a **Title** (required).
4. Choose an **Event type** (defaults to *meeting*).
5. Set the **Start date and time**, and add a **Location**.
6. To repeat the event, set **Recurrence**: repeat every N days or weeks, choose which days it repeats on, and set when it ends (after N occurrences).
7. Optionally use the **AI-generated description** action to draft the event description for you.
8. Save the event.

> **Tip:** Confirm your program's time zone in [Program setup](../tenants/program-setup.md) before scheduling. Start times are entered against that time zone.

> **Warning:** The screen at \`/admin/events\` is a placeholder with hard-coded sample numbers and a button that does nothing. Create and manage real events from the **Calendar** at \`/dashboard/calendar\`, not there.

> **Note:** A read-only public calendar is available at \`/public-calendar\` for visitors.

## Who can take attendance

Attendance actions are permission-gated. You can take attendance if you are a **super-admin**, on the **exec board**, or hold the **secretary** role. Reports and excuse approvals additionally require admin rights.

## Take attendance with a QR code

QR check-in lets students scan a code to mark themselves present.

1. Go to **Attendance** at \`/attendance\` and open the **Check-In** tab.
2. Select the upcoming event you are taking attendance for (only future events appear).
3. Set an **expiration** in minutes (between 5 and 180; the default is 30).
4. Generate the QR code.
5. Display it, or use **Download PNG**, **Copy**, or **Share** to distribute it.

Students scan the code and are taken to the check-in page — no separate sign-in wrapper is required to scan.

> **Tip:** Set a short expiration for a single rehearsal so a screenshot of the code cannot be reused later.

## Other ways to take attendance

- **Manual** tab — mark students present or absent by hand (requires take-attendance permission).
- **PIN entry** — students check in with a PIN at \`/attendance/pin\`.
- **Overview** and **Schedule** tabs — visible to everyone.
- **Reports** tab — admin only.
- **Excuses** tab — admins approve requests; users with take-attendance permission (but not admin) manage them.

## See also

- [Roster and students](../tenants/roster-and-students.md) — the people you take attendance for.
- [Checking in with QR](../students/checking-in-with-qr.md) — the student's scanning steps.
- [Program setup](../tenants/program-setup.md) — set your time zone and week start.
- [Glee Academy](../add-ons/glee-academy.md) — class schedules and per-course QR attendance.
`,He=`---
title: "Content management"
audience: tenant
order: 4
summary: "Upload and organize your program's images, audio, video, and PDFs in the Media Library."
updated: 2026-07-08
---
# Content management

Your program's files — images for the public page, audio, video, and PDF scores — live in the **Media Library**. This page covers uploading and organizing that content.

**Before you start:** You must be an admin or super-admin to upload and manage media.

## Open the Media Library

1. Go to **Media Library** at \`/admin/media\`.
2. Use the filter tabs to narrow the view: **All**, **Images**, **Audio**, **Video**, or **PDF**.
3. Use the breadcrumbs to move between folders.

> **Note:** A newer Media Library also exists at \`/dashboard/media-library\`.

## Upload files

1. Open the folder where you want the files to live.
2. Drag files from your computer onto the upload area, or click to browse and select them.
3. Wait for each upload to finish before navigating away.

> **Tip:** Organize with folders from the start. A tidy library makes it far easier to attach the right image to a public-page block or the right audio to a lesson later.

## Where your media is used

- Images and video feed the blocks on your public page — see [Branding and landing pages](../tenants/branding-and-landing-pages.md).
- Audio can be attached to Academy lessons from the Media Library.
- Sheet music and scores are managed in your Music Library and drive tools such as Part Tracks and Concert Planner.

> **Note:** Music/sheet-music tools (Music Library and Music Toolkit) are separate pages under \`/dashboard\`.

## See also

- [Branding and landing pages](../tenants/branding-and-landing-pages.md) — use your media on the public site.
- [Studio and Part Tracks](../add-ons/studio-part-tracks.md) — build practice tracks from your scores.
- [Concert Planner](../add-ons/concert-planner.md) — build programs from your library.
- [Finding your music](../students/finding-your-music.md) — the student's view of your content.
`,Je=`---
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
2. Go to **Workspace Settings** at \`/dashboard/workspace\`.
3. Note the six tabs across the top: **Plan**, **Add-ons**, **Navigation**, **Branding**, **Billing**, and **General**. The tab you are on is stored in the page address, so you can bookmark a specific tab.

> **Note:** Older links like \`/admin/site-setup\` and \`/control-center\` still work, but they redirect you to the current screens. Setup is not hidden on a separate page — it all lives in Workspace Settings.

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

> **Warning:** The export delivery is not fully wired up yet, so treat the confirmation message as a request rather than a guarantee.

## See also

- [Branding and landing pages](../tenants/branding-and-landing-pages.md) — set your logo, colors, and public website.
- [Roster and students](../tenants/roster-and-students.md) — invite your students once basics are set.
- [Accounts and roles](../getting-started/accounts-and-roles.md) — who can change what.
- [Billing and plans](../tenants/billing-and-plans.md) — choose or change your plan.
`,Ke=`---
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

1. Go to **Students** at \`/admin/students\`.
2. Search by name or email. Each row shows full name, email, voice part, and phone.
3. Click a row to open that student's detail page, where you can manage parent contacts, notes, uniforms, instruments, and permission slips.

> **Tip:** The **People hub** (\`/dashboard/people\`) shows your roster grouped by voice section, plus a **Groups** tab for messaging. If the roster is empty, you will see a prompt to invite your students from People settings.

## Invite one student

1. From **Students**, click **Onboard students** to open \`/admin/students/onboard\`.
2. Open the **Single invite** tab.
3. Enter the student's **email** (required).
4. Optionally add their **full name** and choose a **class**.
5. Send the invite.

The student receives a one-tap magic sign-in link — there is no password to set up.

## Invite a whole roster by CSV

Use this when you have many students to add at once.

1. On the onboarding screen, open the **Upload roster (CSV)** tab.
2. Prepare a CSV file with an \`email\` column and a \`name\` column. A header row is optional.
3. Upload the file. GleeWorld sends one invite per row, one after another, and shows progress.
4. Optionally choose **enroll all in class** to place every invited student into the same class.
5. Review the failed-list after the run to catch any addresses that did not send.

> **Tip:** Each row triggers the same magic-link invite as a single invite, so students still sign in with one tap.

## Let students join with a code

A join code lets students enroll themselves into a specific class.

1. On the onboarding screen, open the **Join code** tab.
2. Pick the class you want the code to enroll students into.
3. Generate the code. It is six characters, and confusing characters (I, O, 0, 1) are left out.
4. Share the join URL \`/join/<code>\`, or copy just the code, using the copy actions.
5. Regenerate the code at any time if you need to retire the old one.

> **Note:** Join codes are tied to a class. If you see "No active classes. Create one in Academy first," create the class in [Glee Academy](../add-ons/glee-academy.md) before generating a code.

## See also

- [Accounts and roles](../getting-started/accounts-and-roles.md) — how student, fan, and graduate roles differ.
- [Joining and first sign-in](../students/joining-and-first-sign-in.md) — the student's side of the invite.
- [Calendar and attendance](../tenants/calendar-and-attendance.md) — take attendance for your roster.
- [Glee Academy](../add-ons/glee-academy.md) — create classes for join codes and enrollment.
`,Xe="GleeWorld User Manual",Ze=[{title:"Getting Started",children:[{title:"What Is GleeWorld?",path:"getting-started/what-is-gleeworld.md"},{title:"Accounts and Roles",path:"getting-started/accounts-and-roles.md"},{title:"The GleeWorld Mobile App",path:"getting-started/the-mobile-app.md"},{title:"Signing In and Getting Help",path:"getting-started/signing-in-and-getting-help.md"}]},{title:"For Tenants (Directors & Admins)",children:[{title:"Program setup",path:"tenants/program-setup.md"},{title:"Branding and landing pages",path:"tenants/branding-and-landing-pages.md"},{title:"Roster and students",path:"tenants/roster-and-students.md"},{title:"Content management",path:"tenants/content-management.md"},{title:"Calendar and attendance",path:"tenants/calendar-and-attendance.md"},{title:"Activating add-ons",path:"tenants/activating-add-ons.md"},{title:"Billing and plans",path:"tenants/billing-and-plans.md"}]},{title:"For Students",children:[{title:"Joining and Your First Sign-In",path:"students/joining-and-first-sign-in.md"},{title:"Finding Your Music",path:"students/finding-your-music.md"},{title:"Part Tracks and Practice",path:"students/part-tracks-and-practice.md"},{title:"Studio Basics",path:"students/studio-basics.md"},{title:"Assignments and Submissions",path:"students/assignments-and-submissions.md"},{title:"Checking In With QR",path:"students/checking-in-with-qr.md"}]},{title:"For Fans",children:[{title:"Follow along with a concert program",path:"fans/following-a-program.md"},{title:"Buy tickets to a concert",path:"fans/buying-tickets.md"},{title:"Get in with your tickets",path:"fans/attending-events.md"}]},{title:"Add-ons Reference",children:[{title:"Box Office",path:"add-ons/box-office.md"},{title:"Glee Academy",path:"add-ons/glee-academy.md"},{title:"Concert Planner",path:"add-ons/concert-planner.md"},{title:"Studio & Part Tracks",path:"add-ons/studio-part-tracks.md"},{title:"Landing Pages",path:"add-ons/landing-pages.md"},{title:"Template Courses",path:"add-ons/template-courses.md"}]},{title:"FAQ & Troubleshooting",children:[{title:"Accounts and Sign-in",path:"faq/accounts-and-sign-in.md"},{title:"Billing and Payments",path:"faq/billing-and-payments.md"},{title:"Privacy and Data",path:"faq/privacy-and-data.md"},{title:"iOS and the Mobile App",path:"faq/ios-mobile-app.md"},{title:"Common Issues and Troubleshooting",path:"faq/common-issues.md"}]},{title:"Glossary",children:[{title:"Glossary",path:"glossary.md"}]}],K={title:Xe,nav:Ze};function en(a){if(!a.startsWith("---"))return{fm:{},body:a};const e=a.indexOf(`
---`,3);if(e===-1)return{fm:{},body:a};const n={};for(const t of a.slice(3,e).trim().split(`
`)){const o=t.indexOf(":");o!==-1&&(n[t.slice(0,o).trim()]=t.slice(o+1).trim().replace(/^["']|["']$/g,""))}return{fm:n,body:a.slice(e+4).replace(/^\n+/,"")}}function X(a){return"/docs/"+a.replace(/\.md$/,"")}function nn(a,e){if(!e||/^(https?:|mailto:|#|\/)/i.test(e))return{external:e};if(!e.endsWith(".md"))return{external:e};const n=a.includes("/")?a.slice(0,a.lastIndexOf("/")):"",t=n?n.split("/"):[];for(const o of e.split("/"))o==="."||o===""||(o===".."?t.pop():t.push(o));return{internal:X(t.join("/"))}}function tn(a){return a.replace(/```[\s\S]*?```/g," ").replace(/`[^`]*`/g," ").replace(/!\[[^\]]*\]\([^)]*\)/g," ").replace(/\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/[#>*_~-]/g," ").replace(/\s+/g," ").trim()}const an=Object.assign({"../../../docs/manual/add-ons/box-office.md":ke,"../../../docs/manual/add-ons/concert-planner.md":ve,"../../../docs/manual/add-ons/glee-academy.md":Se,"../../../docs/manual/add-ons/landing-pages.md":_e,"../../../docs/manual/add-ons/studio-part-tracks.md":xe,"../../../docs/manual/add-ons/template-courses.md":Te,"../../../docs/manual/fans/attending-events.md":Ae,"../../../docs/manual/fans/buying-tickets.md":Ce,"../../../docs/manual/fans/following-a-program.md":Ie,"../../../docs/manual/faq/accounts-and-sign-in.md":We,"../../../docs/manual/faq/billing-and-payments.md":Pe,"../../../docs/manual/faq/common-issues.md":Oe,"../../../docs/manual/faq/ios-mobile-app.md":Ge,"../../../docs/manual/faq/privacy-and-data.md":Ne,"../../../docs/manual/getting-started/accounts-and-roles.md":Fe,"../../../docs/manual/getting-started/signing-in-and-getting-help.md":Re,"../../../docs/manual/getting-started/the-mobile-app.md":Me,"../../../docs/manual/getting-started/what-is-gleeworld.md":Be,"../../../docs/manual/glossary.md":Ee,"../../../docs/manual/students/assignments-and-submissions.md":ze,"../../../docs/manual/students/checking-in-with-qr.md":je,"../../../docs/manual/students/finding-your-music.md":De,"../../../docs/manual/students/joining-and-first-sign-in.md":qe,"../../../docs/manual/students/part-tracks-and-practice.md":Le,"../../../docs/manual/students/studio-basics.md":Ye,"../../../docs/manual/tenants/activating-add-ons.md":Ve,"../../../docs/manual/tenants/billing-and-plans.md":Qe,"../../../docs/manual/tenants/branding-and-landing-pages.md":Ue,"../../../docs/manual/tenants/calendar-and-attendance.md":$e,"../../../docs/manual/tenants/content-management.md":He,"../../../docs/manual/tenants/program-setup.md":Je,"../../../docs/manual/tenants/roster-and-students.md":Ke}),Z=new Map;for(const[a,e]of Object.entries(an)){const n=a.match(/docs\/manual\/(.+\.md)$/);n&&(n[1].startsWith("_factsheets/")||n[1]==="STYLE.md"||Z.set(n[1],e))}const L=[],x=[],ee=new Map;for(const a of K.nav){const e=[];for(const n of a.children||[]){const t=Z.get(n.path);if(!t)continue;const{fm:o,body:s}=en(t),r=s.replace(/!\[VERIFY[^\]]*\]\([^)]*\)/g,"").replace(/[ \t]*\[VERIFY[^\]]*\]/g,"").replace(/[ \t]+$/gm,""),i=X(n.path),d={path:n.path,route:i,title:o.title||n.title,audience:o.audience||"all",summary:o.summary||"",section:a.title,body:r};x.push(d),ee.set(i,d),e.push({title:d.title,path:n.path,route:i})}L.push({title:a.title,children:e})}const on=K.title;function sn({onNavigate:a}){return c.jsx("nav",{className:"space-y-6 text-sm",children:L.map(e=>c.jsxs("div",{children:[c.jsx("div",{className:"mb-2 font-semibold text-foreground",children:e.title}),c.jsx("ul",{className:"space-y-1 border-l border-border",children:e.children.map(n=>c.jsx("li",{children:c.jsx(le,{to:n.route,onClick:a,className:({isActive:t})=>`-ml-px block border-l-2 pl-3 py-1 ${t?"border-primary text-primary font-medium":"border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`,children:n.title})},n.route))})]},e.title))})}const rn="ENTRIES",ne="KEYS",te="VALUES",b="";class R{constructor(e,n){const t=e._tree,o=Array.from(t.keys());this.set=e,this._type=n,this._path=o.length>0?[{node:t,keys:o}]:[]}next(){const e=this.dive();return this.backtrack(),e}dive(){if(this._path.length===0)return{done:!0,value:void 0};const{node:e,keys:n}=_(this._path);if(_(n)===b)return{done:!1,value:this.result()};const t=e.get(_(n));return this._path.push({node:t,keys:Array.from(t.keys())}),this.dive()}backtrack(){if(this._path.length===0)return;const e=_(this._path).keys;e.pop(),!(e.length>0)&&(this._path.pop(),this.backtrack())}key(){return this.set._prefix+this._path.map(({keys:e})=>_(e)).filter(e=>e!==b).join("")}value(){return _(this._path).node.get(b)}result(){switch(this._type){case te:return this.value();case ne:return this.key();default:return[this.key(),this.value()]}}[Symbol.iterator](){return this}}const _=a=>a[a.length-1],dn=(a,e,n)=>{const t=new Map;if(e===void 0)return t;const o=e.length+1,s=o+n,r=new Uint8Array(s*o).fill(n+1);for(let i=0;i<o;++i)r[i]=i;for(let i=1;i<s;++i)r[i*o]=i;return ae(a,e,n,t,r,1,o,""),t},ae=(a,e,n,t,o,s,r,i)=>{const d=s*r;e:for(const l of a.keys())if(l===b){const u=o[d-1];u<=n&&t.set(i,[a.get(l),u])}else{let u=s;for(let p=0;p<l.length;++p,++u){const h=l[p],m=r*u,f=m-r;let y=o[m];const g=Math.max(0,u-n-1),w=Math.min(r-1,u+n);for(let k=g;k<w;++k){const N=h!==e[k],F=o[f+k]+ +N,I=o[f+k+1]+1,S=o[m+k]+1,C=o[m+k+1]=Math.min(F,I,S);C<y&&(y=C)}if(y>n)continue e}ae(a.get(l),e,n,t,o,u,r,i+l)}};class v{constructor(e=new Map,n=""){this._size=void 0,this._tree=e,this._prefix=n}atPrefix(e){if(!e.startsWith(this._prefix))throw new Error("Mismatched prefix");const[n,t]=G(this._tree,e.slice(this._prefix.length));if(n===void 0){const[o,s]=Y(t);for(const r of o.keys())if(r!==b&&r.startsWith(s)){const i=new Map;return i.set(r.slice(s.length),o.get(r)),new v(i,e)}}return new v(n,e)}clear(){this._size=void 0,this._tree.clear()}delete(e){return this._size=void 0,cn(this._tree,e)}entries(){return new R(this,rn)}forEach(e){for(const[n,t]of this)e(n,t,this)}fuzzyGet(e,n){return dn(this._tree,e,n)}get(e){const n=j(this._tree,e);return n!==void 0?n.get(b):void 0}has(e){const n=j(this._tree,e);return n!==void 0&&n.has(b)}keys(){return new R(this,ne)}set(e,n){if(typeof e!="string")throw new Error("key must be a string");return this._size=void 0,M(this._tree,e).set(b,n),this}get size(){if(this._size)return this._size;this._size=0;const e=this.entries();for(;!e.next().done;)this._size+=1;return this._size}update(e,n){if(typeof e!="string")throw new Error("key must be a string");this._size=void 0;const t=M(this._tree,e);return t.set(b,n(t.get(b))),this}fetch(e,n){if(typeof e!="string")throw new Error("key must be a string");this._size=void 0;const t=M(this._tree,e);let o=t.get(b);return o===void 0&&t.set(b,o=n()),o}values(){return new R(this,te)}[Symbol.iterator](){return this.entries()}static from(e){const n=new v;for(const[t,o]of e)n.set(t,o);return n}static fromObject(e){return v.from(Object.entries(e))}}const G=(a,e,n=[])=>{if(e.length===0||a==null)return[a,n];for(const t of a.keys())if(t!==b&&e.startsWith(t))return n.push([a,t]),G(a.get(t),e.slice(t.length),n);return n.push([a,e]),G(void 0,"",n)},j=(a,e)=>{if(e.length===0||a==null)return a;for(const n of a.keys())if(n!==b&&e.startsWith(n))return j(a.get(n),e.slice(n.length))},M=(a,e)=>{const n=e.length;e:for(let t=0;a&&t<n;){for(const s of a.keys())if(s!==b&&e[t]===s[0]){const r=Math.min(n-t,s.length);let i=1;for(;i<r&&e[t+i]===s[i];)++i;const d=a.get(s);if(i===s.length)a=d;else{const l=new Map;l.set(s.slice(i),d),a.set(e.slice(t,t+i),l),a.delete(s),a=l}t+=i;continue e}const o=new Map;return a.set(e.slice(t),o),o}return a},cn=(a,e)=>{const[n,t]=G(a,e);if(n!==void 0){if(n.delete(b),n.size===0)oe(t);else if(n.size===1){const[o,s]=n.entries().next().value;se(t,o,s)}}},oe=a=>{if(a.length===0)return;const[e,n]=Y(a);if(e.delete(n),e.size===0)oe(a.slice(0,-1));else if(e.size===1){const[t,o]=e.entries().next().value;t!==b&&se(a.slice(0,-1),t,o)}},se=(a,e,n)=>{if(a.length===0)return;const[t,o]=Y(a);t.set(o+e,n),t.delete(o)},Y=a=>a[a.length-1],V="or",re="and",ln="and_not";class A{constructor(e){if((e==null?void 0:e.fields)==null)throw new Error('MiniSearch: option "fields" must be provided');const n=e.autoVacuum==null||e.autoVacuum===!0?z:e.autoVacuum;this._options={...E,...e,autoVacuum:n,searchOptions:{...Q,...e.searchOptions||{}},autoSuggestOptions:{...gn,...e.autoSuggestOptions||{}}},this._index=new v,this._documentCount=0,this._documentIds=new Map,this._idToShortId=new Map,this._fieldIds={},this._fieldLength=new Map,this._avgFieldLength=[],this._nextId=0,this._storedFields=new Map,this._dirtCount=0,this._currentVacuum=null,this._enqueuedVacuum=null,this._enqueuedVacuumConditions=q,this.addFields(this._options.fields)}add(e){const{extractField:n,stringifyField:t,tokenize:o,processTerm:s,fields:r,idField:i}=this._options,d=n(e,i);if(d==null)throw new Error(`MiniSearch: document does not have ID field "${i}"`);if(this._idToShortId.has(d))throw new Error(`MiniSearch: duplicate ID ${d}`);const l=this.addDocumentId(d);this.saveStoredFields(l,e);for(const u of r){const p=n(e,u);if(p==null)continue;const h=o(t(p,u),u),m=this._fieldIds[u],f=new Set(h).size;this.addFieldLength(l,m,this._documentCount-1,f);for(const y of h){const g=s(y,u);if(Array.isArray(g))for(const w of g)this.addTerm(m,l,w);else g&&this.addTerm(m,l,g)}}}addAll(e){for(const n of e)this.add(n)}addAllAsync(e,n={}){const{chunkSize:t=10}=n,o={chunk:[],promise:Promise.resolve()},{chunk:s,promise:r}=e.reduce(({chunk:i,promise:d},l,u)=>(i.push(l),(u+1)%t===0?{chunk:[],promise:d.then(()=>new Promise(p=>setTimeout(p,0))).then(()=>this.addAll(i))}:{chunk:i,promise:d}),o);return r.then(()=>this.addAll(s))}remove(e){const{tokenize:n,processTerm:t,extractField:o,stringifyField:s,fields:r,idField:i}=this._options,d=o(e,i);if(d==null)throw new Error(`MiniSearch: document does not have ID field "${i}"`);const l=this._idToShortId.get(d);if(l==null)throw new Error(`MiniSearch: cannot remove document with ID ${d}: it is not in the index`);for(const u of r){const p=o(e,u);if(p==null)continue;const h=n(s(p,u),u),m=this._fieldIds[u],f=new Set(h).size;this.removeFieldLength(l,m,this._documentCount,f);for(const y of h){const g=t(y,u);if(Array.isArray(g))for(const w of g)this.removeTerm(m,l,w);else g&&this.removeTerm(m,l,g)}}this._storedFields.delete(l),this._documentIds.delete(l),this._idToShortId.delete(d),this._fieldLength.delete(l),this._documentCount-=1}removeAll(e){if(e)for(const n of e)this.remove(n);else{if(arguments.length>0)throw new Error("Expected documents to be present. Omit the argument to remove all documents.");this._index=new v,this._documentCount=0,this._documentIds=new Map,this._idToShortId=new Map,this._fieldLength=new Map,this._avgFieldLength=[],this._storedFields=new Map,this._nextId=0}}discard(e){const n=this._idToShortId.get(e);if(n==null)throw new Error(`MiniSearch: cannot discard document with ID ${e}: it is not in the index`);this._idToShortId.delete(e),this._documentIds.delete(n),this._storedFields.delete(n),(this._fieldLength.get(n)||[]).forEach((t,o)=>{this.removeFieldLength(n,o,this._documentCount,t)}),this._fieldLength.delete(n),this._documentCount-=1,this._dirtCount+=1,this.maybeAutoVacuum()}maybeAutoVacuum(){if(this._options.autoVacuum===!1)return;const{minDirtFactor:e,minDirtCount:n,batchSize:t,batchWait:o}=this._options.autoVacuum;this.conditionalVacuum({batchSize:t,batchWait:o},{minDirtCount:n,minDirtFactor:e})}discardAll(e){const n=this._options.autoVacuum;try{this._options.autoVacuum=!1;for(const t of e)this.discard(t)}finally{this._options.autoVacuum=n}this.maybeAutoVacuum()}replace(e){const{idField:n,extractField:t}=this._options,o=t(e,n);this.discard(o),this.add(e)}vacuum(e={}){return this.conditionalVacuum(e)}conditionalVacuum(e,n){return this._currentVacuum?(this._enqueuedVacuumConditions=this._enqueuedVacuumConditions&&n,this._enqueuedVacuum!=null?this._enqueuedVacuum:(this._enqueuedVacuum=this._currentVacuum.then(()=>{const t=this._enqueuedVacuumConditions;return this._enqueuedVacuumConditions=q,this.performVacuuming(e,t)}),this._enqueuedVacuum)):this.vacuumConditionsMet(n)===!1?Promise.resolve():(this._currentVacuum=this.performVacuuming(e),this._currentVacuum)}async performVacuuming(e,n){const t=this._dirtCount;if(this.vacuumConditionsMet(n)){const o=e.batchSize||D.batchSize,s=e.batchWait||D.batchWait;let r=1;for(const[i,d]of this._index){for(const[l,u]of d)for(const[p]of u)this._documentIds.has(p)||(u.size<=1?d.delete(l):u.delete(p));this._index.get(i).size===0&&this._index.delete(i),r%o===0&&await new Promise(l=>setTimeout(l,s)),r+=1}this._dirtCount-=t}await null,this._currentVacuum=this._enqueuedVacuum,this._enqueuedVacuum=null}vacuumConditionsMet(e){if(e==null)return!0;let{minDirtCount:n,minDirtFactor:t}=e;return n=n||z.minDirtCount,t=t||z.minDirtFactor,this.dirtCount>=n&&this.dirtFactor>=t}get isVacuuming(){return this._currentVacuum!=null}get dirtCount(){return this._dirtCount}get dirtFactor(){return this._dirtCount/(1+this._documentCount+this._dirtCount)}has(e){return this._idToShortId.has(e)}getStoredFields(e){const n=this._idToShortId.get(e);if(n!=null)return this._storedFields.get(n)}search(e,n={}){const{searchOptions:t}=this._options,o={...t,...n},s=this.executeQuery(e,n),r=[];for(const[i,{score:d,terms:l,match:u}]of s){const p=l.length||1,h={id:this._documentIds.get(i),score:d*p,terms:Object.keys(u),queryTerms:l,match:u};Object.assign(h,this._storedFields.get(i)),(o.filter==null||o.filter(h))&&r.push(h)}return e===A.wildcard&&o.boostDocument==null||r.sort($),r}autoSuggest(e,n={}){n={...this._options.autoSuggestOptions,...n};const t=new Map;for(const{score:s,terms:r}of this.search(e,n)){const i=r.join(" "),d=t.get(i);d!=null?(d.score+=s,d.count+=1):t.set(i,{score:s,terms:r,count:1})}const o=[];for(const[s,{score:r,terms:i,count:d}]of t)o.push({suggestion:s,terms:i,score:r/d});return o.sort($),o}get documentCount(){return this._documentCount}get termCount(){return this._index.size}static loadJSON(e,n){if(n==null)throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");return this.loadJS(JSON.parse(e),n)}static async loadJSONAsync(e,n){if(n==null)throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");return this.loadJSAsync(JSON.parse(e),n)}static getDefault(e){if(E.hasOwnProperty(e))return B(E,e);throw new Error(`MiniSearch: unknown option "${e}"`)}static loadJS(e,n){const{index:t,documentIds:o,fieldLength:s,storedFields:r,serializationVersion:i}=e,d=this.instantiateMiniSearch(e,n);d._documentIds=W(o),d._fieldLength=W(s),d._storedFields=W(r);for(const[l,u]of d._documentIds)d._idToShortId.set(u,l);for(const[l,u]of t){const p=new Map;for(const h of Object.keys(u)){let m=u[h];i===1&&(m=m.ds),p.set(parseInt(h,10),W(m))}d._index.set(l,p)}return d}static async loadJSAsync(e,n){const{index:t,documentIds:o,fieldLength:s,storedFields:r,serializationVersion:i}=e,d=this.instantiateMiniSearch(e,n);d._documentIds=await P(o),d._fieldLength=await P(s),d._storedFields=await P(r);for(const[u,p]of d._documentIds)d._idToShortId.set(p,u);let l=0;for(const[u,p]of t){const h=new Map;for(const m of Object.keys(p)){let f=p[m];i===1&&(f=f.ds),h.set(parseInt(m,10),await P(f))}++l%1e3===0&&await ie(0),d._index.set(u,h)}return d}static instantiateMiniSearch(e,n){const{documentCount:t,nextId:o,fieldIds:s,averageFieldLength:r,dirtCount:i,serializationVersion:d}=e;if(d!==1&&d!==2)throw new Error("MiniSearch: cannot deserialize an index created with an incompatible version");const l=new A(n);return l._documentCount=t,l._nextId=o,l._idToShortId=new Map,l._fieldIds=s,l._avgFieldLength=r,l._dirtCount=i||0,l._index=new v,l}executeQuery(e,n={}){if(e===A.wildcard)return this.executeWildcardQuery(n);if(typeof e!="string"){const h={...n,...e,queries:void 0},m=e.queries.map(f=>this.executeQuery(f,h));return this.combineResults(m,h.combineWith)}const{tokenize:t,processTerm:o,searchOptions:s}=this._options,r={tokenize:t,processTerm:o,...s,...n},{tokenize:i,processTerm:d}=r,p=i(e).flatMap(h=>d(h)).filter(h=>!!h).map(mn(r)).map(h=>this.executeQuerySpec(h,r));return this.combineResults(p,r.combineWith)}executeQuerySpec(e,n){const t={...this._options.searchOptions,...n},o=(t.fields||this._options.fields).reduce((y,g)=>({...y,[g]:B(t.boost,g)||1}),{}),{boostDocument:s,weights:r,maxFuzzy:i,bm25:d}=t,{fuzzy:l,prefix:u}={...Q.weights,...r},p=this._index.get(e.term),h=this.termResults(e.term,e.term,1,e.termBoost,p,o,s,d);let m,f;if(e.prefix&&(m=this._index.atPrefix(e.term)),e.fuzzy){const y=e.fuzzy===!0?.2:e.fuzzy,g=y<1?Math.min(i,Math.round(e.term.length*y)):y;g&&(f=this._index.fuzzyGet(e.term,g))}if(m)for(const[y,g]of m){const w=y.length-e.term.length;if(!w)continue;f==null||f.delete(y);const k=u*y.length/(y.length+.3*w);this.termResults(e.term,y,k,e.termBoost,g,o,s,d,h)}if(f)for(const y of f.keys()){const[g,w]=f.get(y);if(!w)continue;const k=l*y.length/(y.length+w);this.termResults(e.term,y,k,e.termBoost,g,o,s,d,h)}return h}executeWildcardQuery(e){const n=new Map,t={...this._options.searchOptions,...e};for(const[o,s]of this._documentIds){const r=t.boostDocument?t.boostDocument(s,"",this._storedFields.get(o)):1;n.set(o,{score:r,terms:[],match:{}})}return n}combineResults(e,n=V){if(e.length===0)return new Map;const t=n.toLowerCase(),o=un[t];if(!o)throw new Error(`Invalid combination operator: ${n}`);return e.reduce(o)||new Map}toJSON(){const e=[];for(const[n,t]of this._index){const o={};for(const[s,r]of t)o[s]=Object.fromEntries(r);e.push([n,o])}return{documentCount:this._documentCount,nextId:this._nextId,documentIds:Object.fromEntries(this._documentIds),fieldIds:this._fieldIds,fieldLength:Object.fromEntries(this._fieldLength),averageFieldLength:this._avgFieldLength,storedFields:Object.fromEntries(this._storedFields),dirtCount:this._dirtCount,index:e,serializationVersion:2}}termResults(e,n,t,o,s,r,i,d,l=new Map){if(s==null)return l;for(const u of Object.keys(r)){const p=r[u],h=this._fieldIds[u],m=s.get(h);if(m==null)continue;let f=m.size;const y=this._avgFieldLength[h];for(const g of m.keys()){if(!this._documentIds.has(g)){this.removeTerm(h,g,n),f-=1;continue}const w=i?i(this._documentIds.get(g),n,this._storedFields.get(g)):1;if(!w)continue;const k=m.get(g),N=this._fieldLength.get(g)[h],F=pn(k,f,this._documentCount,N,y,d),I=t*o*p*w*F,S=l.get(g);if(S){S.score+=I,yn(S.terms,e);const C=B(S.match,n);C?C.push(u):S.match[n]=[u]}else l.set(g,{score:I,terms:[e],match:{[n]:[u]}})}}return l}addTerm(e,n,t){const o=this._index.fetch(t,H);let s=o.get(e);if(s==null)s=new Map,s.set(n,1),o.set(e,s);else{const r=s.get(n);s.set(n,(r||0)+1)}}removeTerm(e,n,t){if(!this._index.has(t)){this.warnDocumentChanged(n,e,t);return}const o=this._index.fetch(t,H),s=o.get(e);s==null||s.get(n)==null?this.warnDocumentChanged(n,e,t):s.get(n)<=1?s.size<=1?o.delete(e):s.delete(n):s.set(n,s.get(n)-1),this._index.get(t).size===0&&this._index.delete(t)}warnDocumentChanged(e,n,t){for(const o of Object.keys(this._fieldIds))if(this._fieldIds[o]===n){this._options.logger("warn",`MiniSearch: document with ID ${this._documentIds.get(e)} has changed before removal: term "${t}" was not present in field "${o}". Removing a document after it has changed can corrupt the index!`,"version_conflict");return}}addDocumentId(e){const n=this._nextId;return this._idToShortId.set(e,n),this._documentIds.set(n,e),this._documentCount+=1,this._nextId+=1,n}addFields(e){for(let n=0;n<e.length;n++)this._fieldIds[e[n]]=n}addFieldLength(e,n,t,o){let s=this._fieldLength.get(e);s==null&&this._fieldLength.set(e,s=[]),s[n]=o;const i=(this._avgFieldLength[n]||0)*t+o;this._avgFieldLength[n]=i/(t+1)}removeFieldLength(e,n,t,o){if(t===1){this._avgFieldLength[n]=0;return}const s=this._avgFieldLength[n]*t-o;this._avgFieldLength[n]=s/(t-1)}saveStoredFields(e,n){const{storeFields:t,extractField:o}=this._options;if(t==null||t.length===0)return;let s=this._storedFields.get(e);s==null&&this._storedFields.set(e,s={});for(const r of t){const i=o(n,r);i!==void 0&&(s[r]=i)}}}A.wildcard=Symbol("*");const B=(a,e)=>Object.prototype.hasOwnProperty.call(a,e)?a[e]:void 0,un={[V]:(a,e)=>{for(const n of e.keys()){const t=a.get(n);if(t==null)a.set(n,e.get(n));else{const{score:o,terms:s,match:r}=e.get(n);t.score=t.score+o,t.match=Object.assign(t.match,r),U(t.terms,s)}}return a},[re]:(a,e)=>{const n=new Map;for(const t of e.keys()){const o=a.get(t);if(o==null)continue;const{score:s,terms:r,match:i}=e.get(t);U(o.terms,r),n.set(t,{score:o.score+s,terms:o.terms,match:Object.assign(o.match,i)})}return n},[ln]:(a,e)=>{for(const n of e.keys())a.delete(n);return a}},hn={k:1.2,b:.7,d:.5},pn=(a,e,n,t,o,s)=>{const{k:r,b:i,d}=s;return Math.log(1+(n-e+.5)/(e+.5))*(d+a*(r+1)/(a+r*(1-i+i*t/o)))},mn=a=>(e,n,t)=>{const o=typeof a.fuzzy=="function"?a.fuzzy(e,n,t):a.fuzzy||!1,s=typeof a.prefix=="function"?a.prefix(e,n,t):a.prefix===!0,r=typeof a.boostTerm=="function"?a.boostTerm(e,n,t):1;return{term:e,fuzzy:o,prefix:s,termBoost:r}},E={idField:"id",extractField:(a,e)=>a[e],stringifyField:(a,e)=>a.toString(),tokenize:a=>a.split(fn),processTerm:a=>a.toLowerCase(),fields:void 0,searchOptions:void 0,storeFields:[],logger:(a,e)=>{typeof(console==null?void 0:console[a])=="function"&&console[a](e)},autoVacuum:!0},Q={combineWith:V,prefix:!1,fuzzy:!1,maxFuzzy:6,boost:{},weights:{fuzzy:.45,prefix:.375},bm25:hn},gn={combineWith:re,prefix:(a,e,n)=>e===n.length-1},D={batchSize:1e3,batchWait:10},q={minDirtFactor:.1,minDirtCount:20},z={...D,...q},yn=(a,e)=>{a.includes(e)||a.push(e)},U=(a,e)=>{for(const n of e)a.includes(n)||a.push(n)},$=({score:a},{score:e})=>e-a,H=()=>new Map,W=a=>{const e=new Map;for(const n of Object.keys(a))e.set(parseInt(n,10),a[n]);return e},P=async a=>{const e=new Map;let n=0;for(const t of Object.keys(a))e.set(parseInt(t,10),a[t]),++n%1e3===0&&await ie(0);return e},ie=a=>new Promise(e=>setTimeout(e,a)),fn=/[\n\r\p{Z}\p{P}]+/u;function bn(a){const e=new A({fields:["title","summary","text"],storeFields:["path","route","title","audience","summary","section","body"],idField:"path",searchOptions:{boost:{title:3,summary:2},prefix:!0,fuzzy:.2}});return e.addAll(a.map(n=>({...n,text:tn(n.body)}))),e}let O=null;function wn(a,e){return a.trim()?((!O||O.pages!==e)&&(O={pages:e,mini:bn(e)}),O.mini.search(a).map(n=>n)):[]}function J(){const[a,e]=we.useState(""),n=ue(),t=wn(a,x).slice(0,8);return c.jsxs("div",{className:"relative",children:[c.jsxs("div",{className:"relative",children:[c.jsx(he,{className:"pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"}),c.jsx(pe,{value:a,onChange:o=>e(o.target.value),placeholder:"Search the manual…",className:"pl-9","aria-label":"Search the manual"})]}),a&&t.length>0&&c.jsx("ul",{className:"absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md",children:t.map(o=>c.jsx("li",{children:c.jsxs("button",{className:"block w-full px-3 py-2 text-left hover:bg-accent",onMouseDown:()=>{n(o.route),e("")},children:[c.jsx("div",{className:"text-sm font-medium",children:o.title}),c.jsxs("div",{className:"text-xs text-muted-foreground",children:[o.section," — ",o.summary]})]})},o.route))}),a&&t.length===0&&c.jsxs("div",{className:"absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md",children:["No results for “",a,"”."]})]})}function kn(){return c.jsxs("div",{children:[c.jsx("h1",{className:"text-3xl font-bold",children:on}),c.jsx("p",{className:"mt-2 text-muted-foreground",children:"Everything you need to run and use your program on GleeWorld. Choose a section, or search above."}),c.jsx("div",{className:"mt-8 grid gap-4 sm:grid-cols-2",children:L.map(a=>c.jsx(me,{children:c.jsxs(ge,{className:"pt-6",children:[c.jsx("h2",{className:"font-semibold",children:a.title}),c.jsx("ul",{className:"mt-2 space-y-1 text-sm",children:a.children.slice(0,5).map(e=>c.jsx("li",{children:c.jsx(T,{to:e.route,className:"text-primary hover:underline",children:e.title})},e.route))})]})},a.title))})]})}function vn({body:a,currentPath:e}){return c.jsx("div",{className:"prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary",children:c.jsx(de,{remarkPlugins:[ce],components:{a:({href:n,children:t,...o})=>{const s=nn(e,n||"");if("internal"in s)return c.jsx(T,{to:s.internal,children:t});const r=s.external,i=/^https?:/i.test(r);return c.jsx("a",{href:r,...i?{target:"_blank",rel:"noreferrer"}:{},...o,children:t})}},children:a})})}function Sn({route:a}){const e=ee.get(a);if(!e)return c.jsxs("div",{children:[c.jsx("h1",{className:"text-2xl font-bold",children:"Page not found"}),c.jsxs("p",{className:"mt-2 text-muted-foreground",children:["That page doesn’t exist. ",c.jsx(T,{to:"/docs",className:"text-primary hover:underline",children:"Back to the manual home"}),"."]})]});const n=x.findIndex(s=>s.route===a),t=n>0?x[n-1]:null,o=n<x.length-1?x[n+1]:null;return c.jsxs("article",{children:[c.jsx("div",{className:"mb-4 text-sm text-muted-foreground",children:e.section}),c.jsx(vn,{body:e.body,currentPath:e.path}),c.jsxs("div",{className:"mt-12 flex justify-between border-t border-border pt-6 text-sm",children:[t?c.jsxs(T,{to:t.route,className:"text-primary hover:underline",children:["← ",t.title]}):c.jsx("span",{}),o?c.jsxs(T,{to:o.route,className:"text-primary hover:underline",children:[o.title," →"]}):c.jsx("span",{})]})]})}function Gn(){const{pathname:a}=ye(),e=a==="/docs"||a==="/docs/";return c.jsxs("div",{className:"min-h-screen bg-background",children:[c.jsx("header",{className:"sticky top-0 z-50 border-b bg-background/95 backdrop-blur",style:{paddingTop:"var(--gw-safe-top)"},children:c.jsxs("div",{className:"container flex h-16 items-center justify-between gap-4 px-4",children:[c.jsxs(T,{to:"/docs",className:"flex items-center gap-2 font-bold",children:[c.jsx(fe,{className:"h-5 w-5 text-primary"})," GleeWorld Help"]}),c.jsx("div",{className:"hidden w-full max-w-sm md:block",children:c.jsx(J,{})}),c.jsx("a",{href:"/",className:"whitespace-nowrap text-sm text-muted-foreground hover:text-primary",children:"← GleeWorld"})]})}),c.jsxs("div",{className:"container flex gap-8 px-4 py-8",children:[c.jsx("aside",{className:"hidden w-64 shrink-0 lg:block",children:c.jsx(be,{className:"h-[calc(100dvh-8rem)] pr-4",children:c.jsx(sn,{})})}),c.jsxs("main",{className:"min-w-0 flex-1",children:[c.jsx("div",{className:"mb-6 md:hidden",children:c.jsx(J,{})}),e?c.jsx(kn,{}):c.jsx(Sn,{route:a.replace(/\/$/,"")})]})]})]})}export{Gn as default};
