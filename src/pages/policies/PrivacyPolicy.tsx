// Public Privacy Policy page.
//
// Lives at /privacy and /privacy-policy. Tailored to GleeWorld's
// actual data-handling model rather than generic SaaS boilerplate:
// multi-tenant SaaS with controller/processor split (Tenant = data
// controller for Member/Fan data; we are the processor), self-hosted
// Supabase on DigitalOcean infrastructure, optional third-party AI
// inference (DeepSeek), Stripe-billed payments, fan/member email + SMS
// communications, and storage of education records including minors.
//
// VET STATUS (current law as of June 2026):
//  - CCPA / CPRA + state-law rights (Virginia, Colorado, Connecticut,
//    Utah, etc.) all addressed via a single "U.S. state privacy rights"
//    section using the broadest set of rights.
//  - GDPR / UK GDPR addressed in a dedicated EEA/UK section. SCCs
//    flagged for cross-border transfer; DPA offered on request.
//  - COPPA explicitly addressed: minors-under-13 require verifiable
//    parental consent, schools can substitute via School Official
//    Exception (FERPA-aligned).
//  - FERPA-friendly language for school deployments without claiming
//    blanket FERPA compliance, which is the school's posture, not ours.
//  - TCPA / CAN-SPAM disclosed for SMS / email communications.
//  - AI processor disclosure (DeepSeek) flagged because (a) DeepSeek's
//    default API retention may use input for training unless opted out,
//    and (b) Chinese AI providers are under elevated regulatory scrutiny.
//
// === OPERATOR-CONFIGURABLE CONSTANTS — confirm before publishing ===

import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAST_UPDATED = 'June 2026';
const COMPANY_NAME = 'GleeWorld';
// Single confirmed inbox for privacy requests until dedicated mailboxes
// (privacy@, dpo@, dsar@) exist. Update here when they do.
const PRIVACY_EMAIL = 'support@gleeworld.org';
const SECURITY_EMAIL = 'support@gleeworld.org';
// Where Tenant-uploaded files physically reside. DigitalOcean Spaces is
// S3-compatible object storage. TODO: confirm the active region in the
// DO control panel and replace [REGION TO BE CONFIRMED] below.
const STORAGE_PROVIDER = 'DigitalOcean Spaces (United States — region [TO BE CONFIRMED])';
const PAYMENTS_PROVIDER = 'Stripe, Inc. (United States)';
const EMAIL_PROVIDER = 'Resend (United States)';
const AI_PROVIDER = 'DeepSeek (People\'s Republic of China) — used only when a user invokes an AI-assisted feature';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileText className="w-4 h-4 mr-1.5" /> Print
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-foreground">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-sm text-emerald-950">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>In plain English:</strong> {COMPANY_NAME} runs a music-program
            platform for organizations ("Tenants"). Your school, choir, or
            ensemble — not us — decides what to collect about its Members
            and Fans. We host that information on their behalf, never sell
            it, never use it to serve advertising, and only share it with
            the third-party services listed in section 4 (storage,
            payments, email, and optional AI features the user explicitly
            triggers).
          </div>
        </section>

        <Section number="1" title="Who's the controller and who's the processor">
          <p>
            {COMPANY_NAME} is a multi-tenant platform. Most of the personal
            information on the Service is collected and managed by the
            Tenant (a school, ensemble, ministry, studio, or program) about
            its Members (students, singers, parents, staff) and Fans
            (anyone who signs up via a Tenant's public site).
          </p>
          <List>
            <li><strong>For Member / Fan / student data:</strong> the Tenant is the data controller. They decide what to collect, who can see it, how long to keep it, and how to respond to data-subject requests. {COMPANY_NAME} is the data processor — we hold the data on their behalf, secured by our infrastructure, and we act on the Tenant's instructions.</li>
            <li><strong>For Tenant-admin account data + billing:</strong> {COMPANY_NAME} is the controller. We collect the admin's contact info, billing info (via Stripe), and operational logs needed to run the Service.</li>
            <li><strong>For the public marketing site / inquiries / sign-ups to {COMPANY_NAME} itself:</strong> {COMPANY_NAME} is the controller.</li>
          </List>
          <p>
            If you are a Member or Fan of a Tenant and want to access or
            delete data about you, contact your Tenant first — they have
            direct control. We will assist them with any request that
            requires platform support.
          </p>
        </Section>

        <Section number="2" title="What we collect">
          <p>
            The categories below are the maximum we may collect — many
            Tenants enable only a subset.
          </p>
          <List>
            <li><strong>Account information.</strong> Name, email, phone number, voice part, role, password hash, authentication tokens, profile photo.</li>
            <li><strong>Roster &amp; education records.</strong> Class enrollment, attendance, grades, audition results, rehearsal participation, assignment submissions, and similar information schools and ensembles maintain about their members.</li>
            <li><strong>Communications.</strong> Email and SMS sent to you through the platform; messages you post in discussions, comments, or messenger; recordings you save (e.g. practice takes with metronome).</li>
            <li><strong>Uploaded content.</strong> Sheet music, audio, video, photos, documents, and metadata about them.</li>
            <li><strong>Payment information.</strong> When a Tenant pays for a subscription or a Member buys tickets / merchandise, payment instruments are collected by Stripe — we receive a tokenized reference, not the card number.</li>
            <li><strong>Usage logs.</strong> IP address, device/browser characteristics, page views, feature interactions, error reports. Used to operate, debug, and secure the Service.</li>
            <li><strong>Cookies &amp; local storage.</strong> Strictly-necessary cookies for sign-in and session management; preference storage in your browser. We do not use advertising cookies or cross-site tracking pixels.</li>
          </List>
          <p>
            We do not store biometric identifiers. Optional hands-free
            controls in the score viewer may process face-tracking data
            locally on your device for page-turn gestures without
            transmitting or storing it. We do not knowingly collect
            precise geolocation (street-level) or government-issued ID
            numbers (passport, driver's license, SSN).
          </p>
        </Section>

        <Section number="3" title="How we use it">
          <List>
            <li>To provide the Service — let Members sign in, see their classes, submit assignments, communicate, etc.</li>
            <li>To process payments and reconcile billing.</li>
            <li>To send transactional emails / SMS (sign-in links, attendance reminders, ticket confirmations, password resets) and — only when you opt in — marketing or community emails from your Tenant.</li>
            <li>To secure the Service (rate-limiting, abuse detection, incident response).</li>
            <li>To improve the Service via aggregated, de-identified analytics. We do not build advertising profiles.</li>
            <li>To comply with law and respond to lawful requests.</li>
          </List>
          <p>
            We do not use Tenant content to train our own AI models.
            Third-party AI processors are addressed in the next section.
          </p>
        </Section>

        <Section number="4" title="Third-party processors we share with">
          <p>
            We use vendors to run the Service. Each processor receives
            only the data needed for its function, under a written
            agreement that limits use.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left bg-muted/50">
                  <th className="p-2 font-semibold border-b border-border">Vendor</th>
                  <th className="p-2 font-semibold border-b border-border">Purpose</th>
                  <th className="p-2 font-semibold border-b border-border">Data they receive</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b border-border align-top">{STORAGE_PROVIDER}</td><td className="p-2 border-b border-border align-top">Object storage for uploaded files</td><td className="p-2 border-b border-border align-top">Uploaded files, file metadata</td></tr>
                <tr><td className="p-2 border-b border-border align-top">DigitalOcean (Droplet hosting)</td><td className="p-2 border-b border-border align-top">Compute + database hosting</td><td className="p-2 border-b border-border align-top">All platform data at rest in our managed Postgres</td></tr>
                <tr><td className="p-2 border-b border-border align-top">{PAYMENTS_PROVIDER}</td><td className="p-2 border-b border-border align-top">Payment processing, subscription billing</td><td className="p-2 border-b border-border align-top">Payer name, email, address, card data (Stripe holds this, not us)</td></tr>
                <tr><td className="p-2 border-b border-border align-top">{EMAIL_PROVIDER}</td><td className="p-2 border-b border-border align-top">Transactional + invited-list email delivery</td><td className="p-2 border-b border-border align-top">Recipient email, sender identity, message body</td></tr>
                <tr><td className="p-2 border-b border-border align-top">Apple Push Notification service</td><td className="p-2 border-b border-border align-top">Mobile push delivery for the iOS app</td><td className="p-2 border-b border-border align-top">Device tokens, notification payloads</td></tr>
                <tr><td className="p-2 border-b border-border align-top">{AI_PROVIDER}</td><td className="p-2 border-b border-border align-top">Optional AI-assisted text generation (e.g. concert-program notes regenerator)</td><td className="p-2 border-b border-border align-top">Only the prompt content the user invokes the feature on — typically piece title, composer, voicing</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>About the AI processor.</strong> When a Tenant
            administrator uses an AI-assisted feature, the prompt content
            is sent to the AI provider for inference, governed by that
            provider's then-current API terms. We have not negotiated a
            no-training side agreement with the AI provider; their default
            data-handling terms apply. If a Tenant cannot accept that
            risk profile, the AI-assisted features can be disabled
            per-tenant on request. We do not transmit Member personal
            information to the AI provider — only the editorial fields
            the user is authoring (e.g. piece title and composer).
          </p>
          <p>
            We do not sell personal information. We do not "share"
            personal information for cross-context behavioral advertising
            as defined by the California Privacy Rights Act.
          </p>
        </Section>

        <Section number="5" title="Where your data lives + international transfers">
          <p>
            Primary storage is in the United States (DigitalOcean NYC3
            region). Email and payments providers are also U.S.-based.
            The AI provider listed above is located in the People's
            Republic of China; its access is limited to prompt content
            you explicitly send to AI features.
          </p>
          <p>
            <strong>EEA / UK / Swiss data subjects.</strong> Transfers
            outside your jurisdiction are governed by the European
            Commission's Standard Contractual Clauses (SCCs) and, where
            applicable, the UK International Data Transfer Addendum.
            Qualifying Tenants may request a Data Processing Agreement
            (DPA) covering these transfer mechanisms at{' '}
            <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>;
            substantive requests trigger DPA drafting where one is not
            already on file. Tenants serving EEA/UK data subjects are
            responsible for their own lawful basis for collection and
            for performing a transfer impact assessment if required.
          </p>
        </Section>

        <Section number="6" title="Children &amp; education records">
          <p>
            The Service is used by schools, youth choirs, and other
            programs that serve minors. Two regimes apply:
          </p>
          <List>
            <li><strong>Children under 13 (U.S. — COPPA).</strong> We do not knowingly collect personal information from a child under 13 without verifiable parental consent or a substitute permitted by COPPA. For school deployments, we operate under the School Official Exception — the school provides consent on behalf of the parent for the educational service we deliver, and consents to the limited data flows described in this policy. Parents can review, correct, or request deletion of their child's information by contacting the school; we will support the school in any such request.</li>
            <li><strong>Student education records (U.S. — FERPA).</strong> When a Tenant is a school subject to FERPA, the data we process about students is "education record" data and we act as a School Official with a legitimate educational interest under the school's direct control. We do not redisclose education records except as the school directs or as required by law. Schools may request a FERPA-aligned data addendum at <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>; substantive requests trigger drafting where one is not already on file.</li>
          </List>
          <p>
            We never sell, share, or otherwise disclose information from
            minors for advertising purposes.
          </p>
        </Section>

        <Section number="7" title="Communications: email &amp; SMS">
          <p>
            <strong>Email.</strong> Sign-in links, password resets,
            attendance reminders, and other transactional messages are
            sent without prior marketing opt-in because they are required
            to operate the Service you joined. Marketing / community
            emails from your Tenant are sent only when you opted in via
            the fan-signup or membership flow; every such email includes
            a one-click unsubscribe link. We honor opt-outs within 10
            business days as required by CAN-SPAM.
          </p>
          <p>
            <strong>SMS.</strong> Tenants who enable SMS communications
            must collect prior express written consent from each Member
            before sending marketing texts (as required by the U.S.
            Telephone Consumer Protection Act) and must include the
            sender's identification and an opt-out mechanism (e.g.
            "Reply STOP to unsubscribe") in every marketing message.
            When opt-out functionality is enabled in the platform, the
            Tenant remains responsible for honoring opt-outs across
            their roster and any external systems they use.
          </p>
        </Section>

        <Section number="8" title="How long we keep data">
          <List>
            <li><strong>Active account data:</strong> for as long as the account exists.</li>
            <li><strong>After a Tenant terminates:</strong> 30 days to allow admin-requested export, then deletion from active systems. Backups age out over the following 60 days.</li>
            <li><strong>After a Member deletes their account:</strong> immediate removal from rosters and member-facing surfaces. Backup retention follows the 60-day cycle above.</li>
            <li><strong>Email delivery logs (Resend):</strong> retained by the email provider per its standard retention policy.</li>
            <li><strong>Payment records:</strong> Stripe retains payment-method and transaction data per its retention policy; we keep transaction references for accounting and tax purposes for at least seven years where required.</li>
            <li><strong>Security &amp; usage logs:</strong> retained for as long as needed to operate, debug, and secure the Service, and to satisfy legal or contractual obligations.</li>
          </List>
        </Section>

        <Section number="9" title="Security">
          <p>
            We use industry-standard safeguards: TLS in transit, encryption
            at rest, role-based access controls, audit logging on
            sensitive operations, multi-tenant Row-Level Security on the
            database, and least-privilege service-account credentials. No
            system is perfectly secure; if you believe an incident has
            occurred, report it to <a className="underline" href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a>.
          </p>
          <p>
            If we become aware of a personal-data breach affecting a
            Tenant, we notify the Tenant administrator promptly (and in
            no event later than 72 hours after we become aware where
            GDPR-style notification is required) with the information
            currently available, and continue to update them as the
            investigation progresses.
          </p>
        </Section>

        <Section number="10" title="Your rights">
          <p>
            Depending on where you live, you may have some or all of the
            rights listed below. We honor them all globally as far as
            operationally possible.
          </p>
          <List>
            <li><strong>Access:</strong> request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> ask us to fix inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> ask us to delete your personal information (subject to retention obligations).</li>
            <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
            <li><strong>Opt-out of "sale" or "share":</strong> we do not sell or share personal information for cross-context behavioral advertising — there is nothing to opt out of in that category, but if our practices ever change we will update this section first.</li>
            <li><strong>Restriction / objection (GDPR):</strong> ask us to pause certain processing or object to processing based on legitimate interest.</li>
            <li><strong>Withdraw consent (GDPR / state laws):</strong> if processing relies on consent, withdraw it at any time without affecting prior lawful processing.</li>
            <li><strong>Lodge a complaint:</strong> with your local data protection authority. EEA residents may complain to their national DPA; California residents may contact the California Privacy Protection Agency.</li>
          </List>
          <p>
            <strong>How to exercise rights.</strong> If you are a Member
            or Fan of a Tenant, contact your Tenant first; they control
            most of the data. For data {COMPANY_NAME} controls directly,
            or if your Tenant has not responded, email{' '}
            <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{' '}
            from the email associated with your account. We respond
            within 45 days (extendable by 45 more for complex requests
            per California rules).
          </p>
        </Section>

        <Section number="11" title="U.S. state-specific privacy rights">
          <p>
            If you are a resident of California, Virginia, Colorado,
            Connecticut, Utah, or another U.S. state with a comprehensive
            privacy law, the rights in section 10 apply to you, plus the
            following:
          </p>
          <List>
            <li><strong>Right to know categories.</strong> The categories of personal information we collect, our purposes, our sources, and the categories of third parties we share with are listed in sections 2, 3, and 4 above. We have not sold or shared personal information in the past 12 months.</li>
            <li><strong>Right of non-retaliation.</strong> We will not deny service, charge different prices, or provide a different level of service because you exercised a privacy right.</li>
            <li><strong>Sensitive Personal Information.</strong> We minimize collection of Sensitive Personal Information as defined by the CPRA. To the extent we process SPI incidentally (for example, the contents of messages users send through the Service), we do so only as necessary to deliver the requested communication, never for the purpose of inferring characteristics about a consumer, and never for cross-context behavioral advertising. You may request limitation of any further use of SPI as described in section 10.</li>
            <li><strong>Authorized agents.</strong> California residents may designate an authorized agent to submit a request on their behalf with proof of authorization.</li>
            <li><strong>Minors under 16.</strong> We do not sell or share the personal information of consumers we know to be under 16.</li>
          </List>
        </Section>

        <Section number="12" title="EEA / UK / Swiss specific rights">
          <p>
            If GDPR (EU 2016/679) or UK GDPR applies to processing of
            your data, the legal bases we rely on are: <strong>contract</strong>{' '}
            (to provide the Service you signed up for), <strong>consent</strong>{' '}
            (for marketing communications and optional features),{' '}
            <strong>legitimate interest</strong> (to operate, secure, and
            improve the Service in ways that balance fairly against your
            interests), and <strong>legal obligation</strong> (tax records,
            lawful requests).
          </p>
          <p>
            Tenants who are GDPR controllers must enter into a Data
            Processing Agreement with us before processing EEA/UK personal
            data through the Service. The DPA includes Standard
            Contractual Clauses for transfers to the United States and a
            description of our technical and organizational measures.
            Request it at <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          </p>
        </Section>

        <Section number="13" title="Cookies &amp; tracking">
          <p>
            We primarily use strictly-necessary cookies and similar local
            storage: session identifiers to keep you signed in, CSRF
            tokens, and user-preference storage (e.g. light/dark theme).
            We also collect first-party usage telemetry (page views,
            feature interactions, error reports) for service operation,
            debugging, and security. We do not use advertising cookies,
            cross-site tracking pixels, third-party analytics that
            fingerprint users across sites, or third-party tracking
            tools embedded in our pages.
          </p>
          <p>
            Tenants may embed third-party widgets on their own public
            pages (e.g. an embedded video, a Stripe checkout iframe).
            Those embeds bring their own cookies governed by the embedded
            service's policy.
          </p>
        </Section>

        <Section number="14" title="Changes to this policy">
          <p>
            We may update this policy as the Service, applicable law, or
            our vendor relationships change. Material changes will be
            announced to Tenant administrators by email at least 14 days
            before they take effect, and noted at the top of this page.
            Continued use of the Service after the effective date
            constitutes acceptance.
          </p>
        </Section>

        <Section number="15" title="Contact">
          <p>
            All privacy questions, data-subject requests, DPA requests,
            and breach reports: <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
            We aim to acknowledge within 5 business days and respond
            substantively within 45.
          </p>
        </Section>

        <footer className="pt-8 border-t border-border text-xs text-muted-foreground space-y-2">
          <p>
            See also: <Link to="/terms-of-service" className="underline">Terms of Service</Link>
            {' · '}
            <Link to="/copyright-policy" className="underline">Copyright &amp; Content Policy</Link>
          </p>
          <p>
            This document is tailored to {COMPANY_NAME}'s actual data
            flows. It is intended to be reviewed by privacy counsel
            before being used as the controlling notice for paid sign-ups
            at scale, especially if Tenants are subject to GDPR, FERPA,
            HIPAA-adjacent regimes, or state-law equivalents.
          </p>
        </footer>
      </main>
    </div>
  );
}

function Section({
  number, title, id, children,
}: {
  number: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">
        <span className="text-primary mr-2">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">{children}</ul>;
}
