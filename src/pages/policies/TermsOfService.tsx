// Public Terms of Service page.
//
// Lives at /terms-of-service (with /terms as a legacy alias). This is
// the master agreement: it sets the relationship between the tenant
// (the organization paying for the service) and GleeWorld, names the
// authorized users (the tenant's members), incorporates the Copyright
// & Content Policy by reference, and sets out the payment, termination,
// warranty, indemnity, and liability framework.
//
// Tailored to GleeWorld's actual operating model — multi-tenant SaaS
// for music programs, Stripe-billed, with user-uploaded sheet music /
// audio / video, member-facing communications, and storage of personal
// data including minors (school programs). NOT a generic template.
//
// LAUNCH NOTE: before going to paid production at scale we strongly
// recommend IP/tech-attorney review of this file. The structure (esp.
// safe harbor, indemnity flow, and limitation of liability) reflects
// current best practice for online service providers, but the dollar
// caps, governing-law clause, and arbitration provisions are
// jurisdiction-sensitive and worth a professional eye.
//
// === OPERATOR-CONFIGURABLE CONSTANTS ===
// Update these before paid launch. Each one shows up multiple times in
// the rendered page; changing it here updates every reference.

import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAST_UPDATED = 'June 2026';
const COMPANY_NAME = 'GleeWorld';
const COMPANY_DOMAIN = 'gleeworld.org';
// TODO: confirm legal entity's state of formation.
const GOVERNING_STATE = '[STATE TO BE CONFIRMED — defaults to operator\'s state of formation]';
// We use one confirmed address until dedicated mailboxes / forwards
// are set up. To split traffic, change these to e.g. legal@, dmca@,
// security@ — and make sure each address actually delivers.
const CONTACT_EMAIL = 'support@gleeworld.org';
const DMCA_EMAIL = 'support@gleeworld.org';
const LEGAL_EMAIL = 'support@gleeworld.org';
const SECURITY_EMAIL = 'support@gleeworld.org';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Terms of Service</h1>
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
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex gap-3 text-sm text-sky-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Read first.</strong> By creating an account, paying for a tenant
            subscription, or accessing the platform as a member of a tenant, you
            agree to these Terms and to the{' '}
            <Link to="/copyright-policy" className="underline">Copyright &amp; Content Policy</Link>{' '}
            (incorporated by reference). A separate Privacy Policy describing how
            personal data is handled is available at{' '}
            <Link to="/privacy" className="underline">/privacy</Link> and applies
            to the extent it is in effect.
          </div>
        </section>

        <Section number="1" title="The parties &amp; how tenancy works">
          <p>
            These Terms govern your use of the {COMPANY_NAME} platform
            (the "Service"), operated by {COMPANY_NAME} (the "Operator",
            "we", "us"). The Service is a multi-tenant SaaS — each
            customer organization (a school, choir, ensemble, ministry,
            studio, or program — the "Tenant") receives its own workspace
            and admits its own members ("Members").
          </p>
          <p>
            The Tenant is the contracting party for billing and content
            decisions: they own the data they upload, manage their own
            roster, and are responsible for the way their Members use the
            Service. Members are bound by these Terms when they accept an
            invitation or sign in to a Tenant workspace, but billing and
            ownership disputes are between the Tenant and {COMPANY_NAME}.
          </p>
        </Section>

        <Section number="2" title="Accounts">
          <List>
            <li>You must provide accurate registration information and keep it current.</li>
            <li>You're responsible for everything that happens under your account, including any sub-accounts you authorize.</li>
            <li>Notify us immediately at <a className="underline" href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> if you suspect unauthorized access.</li>
            <li>One human per account. Sharing credentials violates these Terms and may trigger account suspension.</li>
            <li>Minors under 13 may not register independently. Tenants serving minors (schools, youth choirs) must obtain appropriate parental / guardian consent before adding a minor to their roster.</li>
          </List>
        </Section>

        <Section number="3" title="Tenant subscriptions &amp; billing">
          <p>
            Tenant subscriptions and one-time purchases are processed through
            Stripe. By purchasing a plan, the Tenant authorizes us to charge
            the payment method on file for the recurring fee at the cadence
            shown at checkout, plus any seat-count overages or add-on module
            charges.
          </p>
          <List>
            <li><strong>Trials &amp; pricing changes:</strong> we may change pricing on 30 days' notice to the Tenant admin email on file. Existing paid terms are not retroactively repriced; the new price applies at the next renewal.</li>
            <li><strong>Refunds:</strong> monthly subscriptions are non-refundable for the current billing period. Annual subscriptions cancelled within the first 30 days are refunded pro rata; after 30 days, prepaid annual fees are non-refundable. Course / event / merchandise charges processed by the Tenant for their own Members follow that Tenant's stated refund policy — not ours.</li>
            <li><strong>Taxes:</strong> fees do not include sales tax, VAT, or similar transaction taxes; the Tenant is responsible for any such tax assessed by their jurisdiction.</li>
            <li><strong>Failed payments:</strong> if a charge is declined, we may suspend write access to the Tenant workspace after 7 days and disable read access after 30 days. Data is preserved for 60 days before permanent deletion.</li>
            <li><strong>Cancellation:</strong> Tenant admins can cancel from billing settings. Cancellation takes effect at the end of the current paid term.</li>
          </List>
        </Section>

        <Section number="4" title="User-uploaded content">
          <p>
            The Service hosts content the Tenant and its Members upload —
            sheet music, audio, video, photos, written materials, roster
            information, and member-facing communications. As between you
            and {COMPANY_NAME}, the Tenant retains ownership of its
            content. By uploading, you grant {COMPANY_NAME} a limited,
            non-exclusive, royalty-free license to host, transmit, cache,
            display, transcode, and back up that content solely as needed
            to operate the Service for you. We do not sell your content,
            use it to serve advertising, or sublicense it to third
            parties. The Service includes optional AI-assisted features
            (for example, draft generation of concert-program notes). When
            you invoke one of those features, we transmit the minimum
            content needed to a third-party AI provider, governed by that
            provider's data-handling policy in effect at the time. If you
            don't use those features, no AI-side transmission occurs.
          </p>
          <p>
            <strong>You are responsible for the rights to anything you upload.</strong>{' '}
            See the{' '}
            <Link to="/copyright-policy" className="underline font-semibold">
              Copyright &amp; Content Policy
            </Link>{' '}
            for the rights-categories framework, seat-count rules,
            shared-vs-personal partition, and the full DMCA
            notice-and-takedown procedure (incorporated into these Terms).
          </p>
        </Section>

        <Section number="5" title="Acceptable use">
          <p>You agree not to use the Service to:</p>
          <List>
            <li>Violate any law, regulation, or third-party right (including copyright, trademark, privacy, or publicity rights).</li>
            <li>Upload, store, or transmit malware, viruses, spyware, or other harmful code.</li>
            <li>Probe, scan, or test the vulnerability of the Service, or breach its security or authentication measures, without prior written authorization.</li>
            <li>Send unsolicited bulk email or SMS to anyone who has not opted in to your Tenant's communications (including via the fan-signup, member roster, or graduate-list features).</li>
            <li>Use the Service to harass, threaten, defame, or stalk any person.</li>
            <li>Resell, redistribute, or otherwise commercialize the Service or its component features outside the scope of a normal Tenant deployment without our written consent.</li>
            <li>Use automated means (scrapers, bots, headless browsers) to access the Service except through documented APIs and within published rate limits.</li>
            <li>Misrepresent your identity or your authority to act for any organization.</li>
          </List>
          <p>
            We may suspend or terminate access for violations of this
            section without prior notice when the violation poses an
            imminent risk to the Service, other users, or {COMPANY_NAME}'s
            legal posture.
          </p>
        </Section>

        <Section number="6" title="Service availability &amp; changes">
          <p>
            We provide the Service on an "as available" basis. We target
            high availability but do not guarantee uninterrupted access:
            we may pause the Service for scheduled maintenance, security
            response, or unavoidable third-party outages (cloud
            infrastructure, payment processors, email/SMS gateways).
            Where commercially reasonable we will provide advance notice
            of scheduled downtime.
          </p>
          <p>
            We may add, modify, or remove features over time. Material
            removals (an entire module, a billed add-on) will be announced
            to Tenant admins at least 30 days in advance, with reasonable
            export tooling for any affected data.
          </p>
        </Section>

        <Section number="7" title="Privacy &amp; data">
          <p>
            Our handling of personal information is described in the{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
            In short: the Tenant is the data controller for Member and
            Fan data they collect; {COMPANY_NAME} is a data processor
            acting on the Tenant's instructions. Tenants serving residents
            of jurisdictions with stricter data-protection law (GDPR, UK
            GDPR, CCPA, FERPA, COPPA) are responsible for their own
            compliance posture and for entering into any data-processing
            addendum we make available on request.
          </p>
        </Section>

        <Section number="8" title="Termination">
          <List>
            <li><strong>By you:</strong> you may cancel a paid subscription from billing settings at any time. Member accounts may delete themselves from account settings; Tenant admins may delete the Tenant on request to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
            <li><strong>By us:</strong> we may suspend or terminate access (a) for a material breach of these Terms that is not cured within 14 days of notice; (b) for non-payment per section 3; (c) immediately for violations of the Acceptable Use policy, the Copyright Policy's repeat-infringer rule, or applicable law; or (d) if we discontinue the Service or a feature you depend on, with the notice in section 6.</li>
            <li><strong>Effect of termination:</strong> Tenant data is preserved for 30 days after termination so admins can request export. After 30 days, we permanently delete it from active systems; backups age out over the following 60 days under our standard retention. Sections that by their nature should survive (4, 9, 10, 11, 12, 13) survive termination.</li>
          </List>
        </Section>

        <Section number="9" title="Warranties &amp; disclaimers">
          <p className="font-semibold uppercase text-xs tracking-wider">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE."
          </p>
          <p>
            Except as expressly stated in these Terms, {COMPANY_NAME}{' '}
            disclaims all warranties of any kind, whether express,
            implied, statutory, or otherwise — including any implied
            warranties of merchantability, fitness for a particular
            purpose, non-infringement, accuracy, or that the Service will
            be uninterrupted or error-free. No information or advice
            obtained from us creates any warranty not expressly stated
            here.
          </p>
        </Section>

        <Section number="10" title="Indemnity">
          <p>
            You (the Tenant, and each Member acting outside the
            authorization their Tenant gave them) will defend, indemnify,
            and hold harmless {COMPANY_NAME} and its officers, employees,
            and contractors from any third-party claim, loss, or damage
            (including reasonable attorneys' fees) arising out of:
          </p>
          <List>
            <li>Content you uploaded, distributed, or used through the Service in violation of any third party's intellectual-property or privacy rights, including any DMCA claim that would not have arisen but for your upload or distribution choice.</li>
            <li>Your breach of these Terms, the Copyright Policy, the Privacy Policy, or any applicable law.</li>
            <li>Communications you sent through the Service to recipients who did not consent to receive them (anti-spam laws, CAN-SPAM, TCPA, equivalent).</li>
            <li>Disputes between Tenants and their own Members, students, parents, customers, or donors.</li>
          </List>
          <p>
            We'll notify you of any claim promptly and let you control the
            defense (with counsel reasonably acceptable to us); we may
            participate at our own expense. You may not settle a claim
            that admits fault, imposes obligations on us, or reflects
            adversely on us without our prior written consent.
          </p>
        </Section>

        <Section number="11" title="Limitation of liability">
          <p className="font-semibold uppercase text-xs tracking-wider">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <List>
            <li>{COMPANY_NAME} will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any lost profits, revenue, data, goodwill, or business interruption, even if advised of the possibility of such damages.</li>
            <li>Our total aggregate liability arising out of or related to these Terms or the Service, regardless of the legal theory, will not exceed the greater of (a) the amount the Tenant paid us for the Service in the 12 months immediately preceding the event giving rise to the claim, or (b) US $100.</li>
          </List>
          <p>
            Some jurisdictions don't allow the exclusion or limitation of
            certain damages; in those jurisdictions our liability is
            limited to the maximum extent permitted by law.
          </p>
        </Section>

        <Section number="12" title="Governing law &amp; disputes">
          <p>
            These Terms are governed by the laws of {GOVERNING_STATE},
            without regard to its conflict-of-law principles.
          </p>
          <p>
            <strong>Informal resolution first.</strong> Before filing a
            formal claim, you agree to attempt to resolve the dispute by
            contacting us at <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>{' '}
            and giving us 30 days to respond and try to resolve it in
            good faith.
          </p>
          <p>
            <strong>Venue.</strong> If informal resolution fails, the
            state and federal courts located in {GOVERNING_STATE} will
            have exclusive jurisdiction, and you consent to personal
            jurisdiction there. <strong>Where enforceable by applicable
            law</strong>, each party waives any right to a jury trial and
            the right to participate in a class action against the other.
            Some jurisdictions do not permit such waivers; in those
            jurisdictions this provision applies only to the maximum
            extent allowed.
          </p>
        </Section>

        <Section number="13" title="Miscellaneous">
          <List>
            <li><strong>Assignment.</strong> You may not assign these Terms without our prior written consent. We may assign them to a successor in connection with a merger, acquisition, or sale of substantially all of our assets, on notice.</li>
            <li><strong>No partnership.</strong> Nothing here creates a partnership, joint venture, employment, or agency relationship.</li>
            <li><strong>Force majeure.</strong> Neither party is liable for delays or failures caused by events beyond reasonable control (natural disaster, war, terrorism, sustained internet outage, government action, or upstream infrastructure failure).</li>
            <li><strong>Severability.</strong> If a provision is held unenforceable, the rest stays in effect, and the unenforceable provision is reformed to the minimum extent needed to make it enforceable while preserving its intent.</li>
            <li><strong>Waiver.</strong> Failure to enforce a provision is not a waiver of later enforcement.</li>
            <li><strong>Entire agreement.</strong> These Terms, the Copyright Policy, and the Privacy Policy are the entire agreement between you and {COMPANY_NAME} regarding the Service, superseding any prior agreement on the same subject.</li>
            <li><strong>Notices.</strong> To us: <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. To you: the email address on file for your Tenant admin or Member account.</li>
            <li><strong>Changes.</strong> We may update these Terms. Material changes will be announced by email to Tenant admins at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.</li>
          </List>
        </Section>

        <footer className="pt-8 border-t border-border text-xs text-muted-foreground space-y-2">
          <p>
            See also: <Link to="/copyright-policy" className="underline">Copyright &amp; Content Policy</Link>
            {' · '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>
          </p>
          <p>
            This document is tailored to {COMPANY_NAME}'s operating model
            and is intended to be reviewed by an attorney before being
            published as the contractual basis for paid sign-ups at scale.
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
