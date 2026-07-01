// Public Security page — lives at /security.
//
// Purpose: answer the security-questionnaire section of school /
// district / diocese procurement without overclaiming certifications
// we don't hold. This is a "trust page" — what we do have, honestly
// stated. Do NOT add references to SOC 2, ISO 27001, or HIPAA
// certifications: we have none. FERPA-aligned language for schools is
// fine because the school (not us) is the FERPA-covered entity.
//
// If we later engage a compliance platform (Vanta/Drata/Secureframe)
// or complete a Type 1 audit, promote the badge/statement into the
// hero section — but keep the specific claims accurate.
//
// === OPERATOR-CONFIGURABLE CONSTANTS ===

import { Link } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Lock, Database, Cloud, KeyRound,
  AlertTriangle, FileText, CheckCircle2, Sparkles, Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAST_UPDATED = 'July 2026';
const COMPANY_NAME = 'GleeWorld';
const SECURITY_EMAIL = 'support@gleeworld.org';
const INFRA_PROVIDER = 'DigitalOcean (United States)';
const STORAGE_PROVIDER = 'DigitalOcean Spaces (S3-compatible object storage)';
const PAYMENTS_PROVIDER = 'Stripe, Inc.';

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trust Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Security, privacy, and FERPA practices · Last updated: {LAST_UPDATED}</p>
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
            <strong>Honest posture.</strong> {COMPANY_NAME} has not undergone an
            independent SOC 2 or ISO 27001 audit and therefore cannot claim
            attestation to either. HIPAA is generally not applicable to
            {' '}{COMPANY_NAME}'s intended use cases — schools evaluate FERPA
            and general information-security practices. This page describes
            the controls that <em>are</em> in place today.
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" /> Infrastructure
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>All application and database servers run on {INFRA_PROVIDER}.</li>
            <li>User-uploaded files (sheet music, audio, video, images) are stored in {STORAGE_PROVIDER}. Buckets are private by default; reads require a signed URL scoped to the requesting user.</li>
            <li>Payments are processed by {PAYMENTS_PROVIDER}. We never see, store, or transmit raw card numbers — Stripe Elements posts card data directly to Stripe from the user's browser.</li>
            <li>Push notifications on iOS go through Apple Push Notification service (APNs) with our tool-signed authentication key. No third-party push aggregators.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> Data protection
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li><strong>In transit:</strong> TLS 1.2+ for every browser and native-app connection to our servers, and for every server-to-server call to Stripe, DigitalOcean Spaces, and other subprocessors.</li>
            <li><strong>At rest:</strong> Postgres data volumes and object-storage buckets are encrypted at rest using provider-managed keys (AES-256).</li>
            <li><strong>Tenant isolation:</strong> every customer organization is a separate tenant. Every row in the platform database carries a <code>tenant_id</code>, and PostgreSQL row-level security enforces a <em>restrictive</em> policy: no query — even from a compromised end-user account — can return data belonging to another tenant.</li>
            <li><strong>Authentication:</strong> passwords are hashed with bcrypt; sessions are represented by short-lived JWTs signed with an HMAC secret. Email + password is the default; SAML / SSO is on the enterprise roadmap.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Access control
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>Production database access is limited to a small number of platform engineers. All shell access is via SSH with public-key authentication; password auth is disabled.</li>
            <li>Within a tenant, roles (super-admin, admin, student, fan, graduate, member) determine which features a user can reach and which records they can read or write.</li>
            <li>Tenant super-admins can further restrict which navigation items appear to lower-privilege roles from Workspace Settings → Navigation.</li>
            <li>Platform-level administrative access is limited to the platform owner. Cross-tenant reads go through a dedicated superadmin API that requires the platform-owner claim in the caller's JWT; the anon-key client cannot see other tenants' data even from a platform-owner session.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI usage &amp; data handling
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li><strong>{COMPANY_NAME} does not use customer data to train AI foundation models.</strong> Student assignments, recordings, messages, and other tenant content are never sent to any AI provider for model training.</li>
            <li>AI features are opt-in per tenant. A tenant administrator can enable or disable AI features from Workspace Settings → Add-ons. Disabled means no data is sent to any AI provider from that tenant.</li>
            <li>When a user invokes an AI feature, the specific prompt and response for that request are transmitted to the AI provider named on our subprocessor list. Requests are not tied to identifying account claims beyond what is minimally required to serve the response.</li>
            <li>AI providers we use are configured to disable input retention for training where the provider offers that setting. Where a provider does not offer such a setting, we do not enable that provider for tenants with student data.</li>
            <li>AI-generated output that becomes part of a permanent record (e.g., an instructor accepts an AI draft into a rubric) is treated the same as any other tenant content for the purposes of this Trust Center — including tenant isolation, deletion on request, and this document's data-retention posture.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Archive className="w-5 h-5 text-primary" /> Backups &amp; disaster recovery
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>The production database is backed up daily. Backup snapshots are retained for 30 days and are encrypted at rest with the same AES-256 provider-managed keys as live data.</li>
            <li>Object storage (sheet music, audio, video, images) is stored on infrastructure with provider-native durability guarantees; deletion is soft-deletion first, purge on tenant request.</li>
            <li>Restore drills are performed periodically against a non-production environment to validate backup integrity. A written restore procedure is maintained by platform engineering.</li>
            <li>Recovery Point Objective (RPO): 24 hours. Recovery Time Objective (RTO): best-effort within one business day for a full-region outage; higher-tier RTO available under an enterprise agreement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Application security
          </h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>Every code change is committed to a version-controlled repository. Database schema changes ship as migrations; no schema drift outside migrations is allowed in production.</li>
            <li>Third-party dependencies are tracked; we monitor GitHub security advisories and patch critical vulnerabilities within 7 days of disclosure.</li>
            <li>The iOS application is signed with our team's Apple Developer distribution certificate and reviewed by Apple before every TestFlight and App Store release.</li>
            <li>Server-side inputs from the browser and native app are validated. Authenticated endpoints check role + tenant before every read or write.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> FERPA alignment (for schools)
          </h2>
          <p className="text-sm mb-2">
            When a K-12 or higher-education institution uses {COMPANY_NAME}, the school
            (not us) is the FERPA-covered entity. We operate as the school's{' '}
            <strong>School Official</strong> under the FERPA "school official
            exception" (34 CFR §99.31(a)(1)(i)(B)):
          </p>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>Student records are used only to perform services for the school.</li>
            <li>Access is limited to authorized school personnel and the student themselves.</li>
            <li>Records are not re-disclosed to third parties without the school's written direction.</li>
            <li>A Data Processing Addendum aligned with FERPA is available at{' '}
              <Link to="/dpa" className="underline">/dpa</Link>; schools can sign it before deploying to students.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Subprocessors</h2>
          <p className="text-sm mb-2">Current subprocessors that may process customer data on our behalf:</p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>DigitalOcean, LLC — hosting and object storage (U.S.).</li>
            <li>Stripe, Inc. — payment processing (U.S.).</li>
            <li>Resend, Inc. — transactional email (U.S.).</li>
            <li>Apple Inc. — iOS push notifications and App Store distribution.</li>
            <li>DeepSeek — AI-generated content, only when a user explicitly invokes an AI feature (not enabled for all tenants).</li>
          </ul>
          <p className="text-sm mt-2">
            We will notify tenants of material changes to this list. See our{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link> for
            the current data-flow mapping.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Incident response</h2>
          <p className="text-sm">
            If you believe you have discovered a security vulnerability or a
            data-security incident affecting {COMPANY_NAME}, please email{' '}
            <a href={`mailto:${SECURITY_EMAIL}`} className="underline">{SECURITY_EMAIL}</a>
            {' '}with a description and, if applicable, reproduction steps. We
            respond to security reports within one business day. In the event
            of a confirmed incident affecting customer data, we will notify
            affected tenant administrators without undue delay and at most
            within 72 hours of confirming the incident.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Roadmap</h2>
          <p className="text-sm mb-2">Controls we are actively working toward:</p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>SOC 2 Type 1 attestation (engagement TBD).</li>
            <li>Mandatory MFA for all administrator accounts.</li>
            <li>Formal quarterly access review.</li>
            <li>Automated vulnerability scanning of production dependencies.</li>
          </ul>
        </section>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Questions about the controls on this page? Email{' '}
          <a href={`mailto:${SECURITY_EMAIL}`} className="underline">{SECURITY_EMAIL}</a>.
        </p>
      </main>
    </div>
  );
}
