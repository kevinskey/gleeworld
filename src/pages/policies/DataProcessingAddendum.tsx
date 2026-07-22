// Public Data Processing Addendum — lives at /dpa.
//
// A FERPA-aligned Data Processing Addendum a school customer can sign
// alongside our master Terms of Service. Structured so it reads as
// enforceable contract language (defined terms, permitted purposes,
// subprocessors, security safeguards, data-subject rights, breach
// notification, deletion on termination). Style is procurement-office
// friendly — plain paragraphs, no "if you'd like to..." conversational
// filler.
//
// LAUNCH NOTE: this is production-ready boilerplate but IS NOT a
// substitute for legal review. Before executing this DPA with a real
// school, run it past an education-privacy attorney (or the school's
// counsel — they usually want to redline anyway). Do not add
// jurisdictional signature blocks / arbitration clauses without
// counsel review.
//
// === OPERATOR-CONFIGURABLE CONSTANTS ===

import { Link } from 'react-router-dom';
import { FileText, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';

const LAST_UPDATED = 'July 2026';
const COMPANY_NAME = 'GleeWorld';
const COMPANY_DOMAIN = 'gleeworld.org';
const LEGAL_EMAIL = 'support@gleeworld.org';
const SECURITY_EMAIL = 'support@gleeworld.org';
const GOVERNING_STATE = '[STATE TO BE CONFIRMED — defaults to operator\'s state of formation]';

export default function DataProcessingAddendum() {
  return (
    <PublicLayout>
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Processing Addendum</h1>
            <p className="text-xs text-muted-foreground mt-0.5">FERPA-aligned · Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-1.5" /> Print
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-foreground">
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex gap-3 text-sm text-sky-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>How to execute.</strong> This Addendum forms part of the
            master{' '}
            <Link to="/terms-of-service" className="underline">Terms of Service</Link>{' '}
            between {COMPANY_NAME} and a school, district, diocese, or higher-education
            institution (the "<strong>Institution</strong>"). To execute, print
            this page, sign at the bottom, and return a copy to{' '}
            <a href={`mailto:${LEGAL_EMAIL}`} className="underline">{LEGAL_EMAIL}</a>.
            We will countersign and return a fully executed PDF.
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Definitions</h2>
          <p className="text-sm mb-2">
            Capitalized terms not defined here have the meanings given in the
            Terms of Service. For this Addendum:
          </p>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li><strong>"FERPA"</strong> means the Family Educational Rights and Privacy Act, 20 U.S.C. § 1232g, and its implementing regulations at 34 CFR Part 99.</li>
            <li><strong>"Student Data"</strong> means any personally identifiable information (as defined in 34 CFR § 99.3) from Education Records of Institution's students that is received, created, maintained, or transmitted through the Services. This includes name, ID, contact information, coursework, grades, attendance, submitted audio / video / text, and any inferences drawn from the foregoing.</li>
            <li><strong>"Education Records"</strong> has the meaning given in 34 CFR § 99.3: records directly related to a student and maintained by an educational agency or institution.</li>
            <li><strong>"School Official"</strong> means a party performing an institutional service or function under 34 CFR § 99.31(a)(1)(i)(B).</li>
            <li><strong>"Subprocessor"</strong> means any third party engaged by {COMPANY_NAME} to process Student Data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Roles and School Official designation</h2>
          <p className="text-sm mb-2">
            Institution is the sole owner and controller of the Student Data
            processed through the Services. {COMPANY_NAME} acts solely as
            Institution's service provider and, for the purposes of FERPA,
            as a School Official under 34 CFR § 99.31(a)(1)(i)(B). Institution
            has the direct control over the use and maintenance of Student
            Data required by that regulation.
          </p>
          <p className="text-sm">
            {COMPANY_NAME} performs institutional services and functions for
            which Institution would otherwise use its own employees, and is
            subject to the requirements of 34 CFR § 99.33(a) governing use and
            redisclosure of personally identifiable information from Education
            Records.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Permitted purposes</h2>
          <p className="text-sm mb-2">
            {COMPANY_NAME} will process Student Data only to:
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Provide, maintain, secure, and improve the Services for Institution.</li>
            <li>Prevent and address technical or security issues.</li>
            <li>Comply with a legal obligation to which {COMPANY_NAME} is subject.</li>
            <li>Comply with Institution's documented instructions.</li>
          </ul>
          <p className="text-sm mt-2">
            {COMPANY_NAME} will not sell Student Data, use it for targeted
            advertising, create profiles of students for non-educational
            purposes, or use it to train AI or machine-learning models that
            are made available to any party other than Institution.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Confidentiality</h2>
          <p className="text-sm">
            {COMPANY_NAME} will ensure that personnel authorized to process
            Student Data are bound by written confidentiality obligations
            no less protective than those in this Addendum, and are trained
            on their obligations under this Addendum before receiving access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Security safeguards</h2>
          <p className="text-sm mb-2">
            {COMPANY_NAME} maintains administrative, technical, and physical
            safeguards designed to protect Student Data against unauthorized
            access, disclosure, alteration, or destruction, appropriate to the
            nature of the data and the risks presented. Current controls are
            described at{' '}
            <Link to="/security" className="underline">{COMPANY_DOMAIN}/security</Link>{' '}
            and include, at minimum:
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Encryption of Student Data in transit (TLS 1.2 or higher) and at rest (AES-256).</li>
            <li>Tenant isolation enforced by row-level database policies.</li>
            <li>Role-based access control within Institution's tenant.</li>
            <li>Principle-of-least-privilege access for {COMPANY_NAME} personnel to production systems, with public-key SSH authentication and no shared credentials.</li>
            <li>Version-controlled deployment of application code and database schema.</li>
            <li>Logging of administrative access to Student Data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Subprocessors</h2>
          <p className="text-sm mb-2">
            Institution authorizes {COMPANY_NAME} to engage the Subprocessors
            listed at{' '}
            <Link to="/security" className="underline">{COMPANY_DOMAIN}/security</Link>{' '}
            (the "Subprocessor List") to process Student Data. {COMPANY_NAME}:
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Enters into a written agreement with each Subprocessor imposing data-protection obligations no less protective than those in this Addendum.</li>
            <li>Remains responsible for its Subprocessors' acts and omissions relating to Student Data.</li>
            <li>Will give Institution reasonable prior notice of any material change to the Subprocessor List. Institution may object to a new Subprocessor within 30 days of notice on reasonable data-protection grounds; if the parties cannot resolve the objection, Institution may terminate the affected portion of the Services and receive a pro-rata refund.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Data subject requests</h2>
          <p className="text-sm">
            {COMPANY_NAME} will provide Institution with the tools necessary
            to respond to student and parental requests under FERPA and
            applicable state laws to access, correct, or delete Student Data.
            When {COMPANY_NAME} receives a request directly from a student,
            parent, or other data subject relating to Student Data,{' '}
            {COMPANY_NAME} will forward the request to Institution without
            undue delay and will not respond directly (except to acknowledge
            receipt and route the request) unless Institution instructs it
            to.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Security incidents</h2>
          <p className="text-sm mb-2">
            If {COMPANY_NAME} becomes aware of a Security Incident (defined
            as any confirmed unauthorized access to, or acquisition,
            disclosure, alteration, or destruction of, Student Data),{' '}
            {COMPANY_NAME} will:
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Notify Institution without undue delay, and in any event within seventy-two (72) hours of confirming the Incident.</li>
            <li>Provide Institution with a description of the nature and scope of the Incident, the categories and approximate number of data subjects affected, the likely consequences, and the measures taken or proposed to address the Incident.</li>
            <li>Cooperate reasonably with Institution's investigation and any required regulatory or data-subject notifications. Institution retains sole responsibility for determining whether notification to affected individuals or authorities is required and for making those notifications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Audit and information rights</h2>
          <p className="text-sm">
            On written request no more than once per calendar year (and
            additionally following a Security Incident), {COMPANY_NAME} will
            make available to Institution the information reasonably necessary
            to demonstrate compliance with this Addendum. {COMPANY_NAME} may
            satisfy this obligation by providing a copy of its most recent
            SOC 2 or equivalent report, if any, subject to confidentiality
            obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Data location and cross-border transfer</h2>
          <p className="text-sm">
            Student Data is stored on {COMPANY_NAME}'s U.S. infrastructure.
            {' '}{COMPANY_NAME} will notify Institution before materially
            changing the country in which Student Data is stored at rest. If
            Institution operates outside the United States and cross-border
            transfer restrictions apply, the parties will execute the
            supplementary transfer mechanism (e.g., Standard Contractual
            Clauses) reasonably required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">11. Return and deletion</h2>
          <p className="text-sm">
            On termination of the Services, and at Institution's option,{' '}
            {COMPANY_NAME} will either (a) return Student Data to Institution
            in a commercially reasonable format, or (b) delete Student Data
            from active systems within thirty (30) days and from routine
            backups within ninety (90) days. {COMPANY_NAME} will provide
            written confirmation of deletion on request. This obligation does
            not apply to Student Data that {COMPANY_NAME} is required by law
            to retain, provided that any retained data remains subject to
            this Addendum for so long as it is held.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">12. Term and precedence</h2>
          <p className="text-sm">
            This Addendum takes effect on the date of Institution's execution
            and remains in force for as long as {COMPANY_NAME} processes
            Student Data on Institution's behalf. In the event of a conflict
            between this Addendum and the Terms of Service with respect to
            Student Data, this Addendum controls.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">13. Governing law</h2>
          <p className="text-sm">
            This Addendum is governed by the laws of {GOVERNING_STATE},
            without regard to conflict-of-laws principles, except that any
            provision required by the law of Institution's jurisdiction to
            govern the processing of Student Data of its students will apply
            to the extent required.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <h2 className="text-xl font-semibold">Signatures</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div className="font-semibold">{COMPANY_NAME}</div>
              <div>
                <div className="text-xs text-muted-foreground">Signature</div>
                <div className="border-b border-foreground h-8" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="border-b border-foreground h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="border-b border-foreground h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="border-b border-foreground h-6" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-semibold">Institution</div>
              <div>
                <div className="text-xs text-muted-foreground">Signature</div>
                <div className="border-b border-foreground h-8" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="border-b border-foreground h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="border-b border-foreground h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Institution name</div>
                <div className="border-b border-foreground h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="border-b border-foreground h-6" />
              </div>
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Questions about this Addendum? Email{' '}
          <a href={`mailto:${LEGAL_EMAIL}`} className="underline">{LEGAL_EMAIL}</a>
          {' '}or, for security topics,{' '}
          <a href={`mailto:${SECURITY_EMAIL}`} className="underline">{SECURITY_EMAIL}</a>.
        </p>
      </div>
    </div>
    </PublicLayout>
  );
}
