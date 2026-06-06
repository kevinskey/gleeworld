import React from "react";
import { Link } from "react-router-dom";

// Light, accurate boilerplate ToS + Privacy. Customize before signing real
// contracts; these are good enough for SaaS sign-ups and most school /
// church procurement reviews.

const PAGE_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
};

function LegalShell({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={PAGE_STYLE}>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12"
              style={{
                backgroundImage: 'url(/lovable-uploads/gleeworld-logo.png?v=6)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{ letterSpacing: '-0.02em', color: '#000618' }}>
              GleeWorld
            </span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">← Back home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900" style={{ letterSpacing: '-0.025em' }}>
          {title}
        </h1>
        <p className="text-sm text-slate-500 mb-12">Last updated: {lastUpdated}</p>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          {children}
        </div>
      </main>

      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} GleeWorld</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-slate-700">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-700">Privacy</Link>
            <a href="mailto:kevin@gleeworld.org" className="hover:text-slate-700">kevin@gleeworld.org</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-3" style={{ letterSpacing: '-0.02em' }}>
      {children}
    </h2>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="June 2, 2026">
      <p>
        These Terms of Service govern your use of GleeWorld, a hosted software platform for choirs,
        bands, music classrooms, and worship programs ("GleeWorld," "we," "our"). By signing up for or
        using GleeWorld, you ("Customer," "you") agree to these terms.
      </p>

      <H2>1. The service</H2>
      <p>
        GleeWorld provides a private, branded web application for your organization. We host the
        software, maintain its security, and ship updates. You retain full control over your data
        and your members.
      </p>

      <H2>2. Your account</H2>
      <p>
        You are responsible for keeping your admin credentials secure and for the actions taken by
        users you invite. You agree to provide accurate information when signing up and to update
        it if it changes.
      </p>

      <H2>3. Subscription &amp; billing</H2>
      <p>
        GleeWorld is sold on a month-to-month or annual subscription. Fees are quoted in US Dollars
        and billed in advance. You may cancel at any time effective at the end of your current
        billing period — no penalties, no contracts. Annual plans are non-refundable except where
        required by law.
      </p>

      <H2>4. Your data is yours</H2>
      <p>
        All data you or your members enter into GleeWorld belongs to you. We do not sell, rent, or
        license your data to third parties. On request — including after cancellation — we will
        export a full copy of your database in a standard SQL or JSON format within 7 business
        days at no cost.
      </p>

      <H2>5. Acceptable use</H2>
      <p>You agree not to use GleeWorld to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Send unsolicited bulk messages (spam) outside your member roster.</li>
        <li>Upload content you do not have the rights to distribute.</li>
        <li>Interfere with the operation of the platform or other tenants.</li>
        <li>Use the service for any illegal purpose.</li>
      </ul>

      <H2>6. Availability</H2>
      <p>
        We target 99.5% uptime measured monthly, excluding scheduled maintenance windows announced
        at least 24 hours in advance. We do not currently offer a contractual uptime SLA; if that
        matters for your procurement, contact us about an Institution-tier custom agreement.
      </p>

      <H2>7. Support</H2>
      <p>
        Email support is included with every plan. Solo Director: 48-hour response target.
        School / Program: 24 hours. Institution: 4 hours during business hours (US Eastern).
      </p>

      <H2>8. Changes to the service</H2>
      <p>
        We may add, change, or remove features to improve the platform. Material adverse changes
        to features you actively rely on will be announced at least 30 days in advance.
      </p>

      <H2>9. Termination</H2>
      <p>
        Either party may terminate the agreement on notice. We may suspend or terminate access if
        you breach these terms or fail to pay invoices after a 14-day cure period. On termination,
        you may request a data export per Section 4.
      </p>

      <H2>10. Liability</H2>
      <p>
        To the maximum extent permitted by law, our total liability for any claim arising out of
        these terms is limited to the fees you paid us in the twelve months preceding the claim.
        Neither party is liable for indirect or consequential damages.
      </p>

      <H2>11. Changes to these terms</H2>
      <p>
        We may update these terms occasionally. Material changes will be announced by email at
        least 30 days before they take effect. Continued use after that date constitutes
        acceptance.
      </p>

      <H2>12. Contact</H2>
      <p>
        Questions? Email <a href="mailto:kevin@gleeworld.org" className="text-sky-700 underline">kevin@gleeworld.org</a>.
      </p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="June 2, 2026">
      <p>
        This Privacy Policy explains what data GleeWorld collects, how we use it, and the choices
        you have. It applies to both customer organizations and the individuals (students, members,
        directors) who use GleeWorld through their organization.
      </p>

      <H2>1. What we collect</H2>
      <p>From customer organizations (the people who sign the contract):</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Organization name, contact email, subdomain.</li>
        <li>Billing information (processed by Stripe — we never see card numbers).</li>
        <li>Admin user account credentials (hashed).</li>
      </ul>
      <p className="mt-4">From organization members (added by their director):</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Name, email, voice part, and any other fields the director sets up.</li>
        <li>Attendance records, grades, assignments — content the director and student create.</li>
        <li>Files the user uploads (photos, sheet music, etc.).</li>
      </ul>

      <H2>2. How we use it</H2>
      <p>
        We use your data to operate the GleeWorld platform — authenticating logins, displaying
        rosters, sending notifications you trigger, storing the files you upload. We do not use
        your data to train AI models. We do not show ads. We do not sell or rent data to anyone.
      </p>

      <H2>3. Where data is stored</H2>
      <p>
        Each tenant organization has its own isolated database. Data is stored on servers in the
        New York region (DigitalOcean NYC1). File uploads use DigitalOcean Spaces (S3-compatible)
        in the SFO3 region. We back up databases daily; backups are retained for 14 days.
      </p>

      <H2>4. Who can see your data</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>You and the users you invite to your organization.</li>
        <li>GleeWorld engineering staff, only when troubleshooting a specific issue and only with the minimum access needed.</li>
        <li>Subprocessors required to run the service: DigitalOcean (hosting), Stripe (billing). A full subprocessor list is available on request.</li>
      </ul>
      <p className="mt-3">
        We never share your data with marketers, data brokers, or other third parties.
      </p>

      <H2>5. Children and students under 13</H2>
      <p>
        Many GleeWorld customers are K-12 music programs. We are designed to operate as a
        "school official" under FERPA — student records you upload are treated as confidential
        and are accessible only to authorized users you designate. If your organization is
        subject to COPPA, you must obtain verifiable parental consent for users under 13 before
        adding them.
      </p>

      <H2>6. Your rights</H2>
      <p>
        You can request a copy of your data, ask us to delete specific records, or close your
        account at any time. Contact <a href="mailto:kevin@gleeworld.org" className="text-sky-700 underline">kevin@gleeworld.org</a> and
        we will respond within 7 business days. EU residents have additional rights under GDPR
        (Articles 15-22) which we honor.
      </p>

      <H2>7. Cookies</H2>
      <p>
        We use only essential cookies — the session token that keeps you logged in. We do not use
        analytics cookies, advertising cookies, or third-party trackers.
      </p>

      <H2>8. Security</H2>
      <p>
        All data is encrypted in transit (HTTPS) and at rest (AES-256). Passwords are hashed with
        bcrypt. Each tenant runs in its own isolated database — there is no shared customer data
        pool. We follow least-privilege principles for engineering access. If we ever discover a
        breach affecting your data, we will notify you within 72 hours.
      </p>

      <H2>9. Changes</H2>
      <p>
        Material changes to this Privacy Policy will be announced by email at least 30 days
        before they take effect.
      </p>

      <H2>10. Contact</H2>
      <p>
        For privacy questions or data requests: <a href="mailto:kevin@gleeworld.org" className="text-sky-700 underline">kevin@gleeworld.org</a>.
      </p>
    </LegalShell>
  );
}
