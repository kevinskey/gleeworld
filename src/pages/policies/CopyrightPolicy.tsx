// Public Copyright & Content Policy page.
//
// Lives at /copyright-policy. Linked from the Viewer, Music Library, and
// Librarian surfaces (anywhere users upload, store, or distribute sheet
// music or audio). Tailored to GleeWorld's choral / sheet-music context
// rather than generic SaaS boilerplate — covers user responsibility,
// rights categories, the per-seat copy principle, print vs. digital,
// shared vs. personal libraries, prohibited uses, and the full DMCA
// notice / counter-notice / repeat-infringer procedure.
//
// NOTE FOR LAUNCH: publishing this page does NOT itself confer DMCA
// safe-harbor protection. Safe harbor attaches only when a designated
// agent is registered with the U.S. Copyright Office at
// https://dmca.copyright.gov/osp/. The agent's name + contact must
// match what's printed in section 8 below.

import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';

const LAST_UPDATED = 'June 2026';

export default function CopyrightPolicy() {
  return (
    <PublicLayout>
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Copyright &amp; Content Policy</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-1.5" /> Print
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-foreground">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Read this before uploading.</strong> GleeWorld is a hosting and
            workflow platform for choral, vocal, and instrumental programs. We do not
            clear rights to the music our users upload — <strong>you are responsible
            for the rights to anything you put on the platform.</strong>
          </div>
        </section>

        <Section number="1" title="Who's responsible for what">
          <p>
            GleeWorld is a neutral host. Tenants (schools, ensembles, ministries,
            studios) upload scores, recordings, accompaniments, and related materials
            to organize their own program. By uploading anything to the platform you
            represent and warrant that:
          </p>
          <List>
            <li>You own the work, or you have a license, permission, or legal exception (e.g. public domain, fair use as understood in your jurisdiction) that covers the way you are using it on GleeWorld.</li>
            <li>The number of digital copies in use (one per active seat in your roster, as defined below) does not exceed what your license allows.</li>
            <li>You will remove material promptly if your license expires, your seat count changes, or the rightsholder asks you to.</li>
          </List>
          <p>
            GleeWorld does not pre-screen uploads and does not adjudicate
            permissions. We act on credible reports under the DMCA procedure in
            section 8.
          </p>
        </Section>

        <Section number="2" title="Three rights categories">
          <p>Every score, audio file, or video you upload should be classified into one of three categories, both for your own tracking and so the platform can enforce sensible defaults:</p>
          <div className="space-y-3">
            <Category label="Public domain" tone="emerald">
              No active copyright in the United States (typically works published
              before 1929, or whose author died long enough ago in source
              countries). You may distribute these freely to anyone in your
              tenant — no seat-count limit applies. We still recommend tagging
              the edition and editor, because modern editions of public-domain
              works can themselves be copyrighted.
            </Category>
            <Category label="Licensed" tone="sky">
              You hold a paid license, purchased download, subscription, or
              other documented permission. The license terms govern: in
              particular, how many people may receive a copy and whether they
              may print it. Most modern publisher digital licenses limit copies
              to the number of seats you've paid for; some allow only physical
              printing, not screen distribution. Verify before you upload.
            </Category>
            <Category label="All rights reserved" tone="rose">
              Copyrighted material for which you do <em>not</em> hold a
              distribution license. This category exists for private,
              non-distributive use only — e.g. an instructor preparing a
              private study annotation, scholarly excerpt, or personal practice
              copy. Do not share with members, do not place in shared
              libraries, and do not distribute via fan or graduate pages. The
              platform's default sharing UI will block this category from
              member-facing destinations.
            </Category>
          </div>
        </Section>

        <Section number="3" title="The one-copy-per-seat principle">
          <p>
            Most publisher licenses for sheet music are sold per copy, not per
            organization. The platform's distribution model mirrors that
            structure: a licensed work is considered to occupy <strong>one seat
            per active member who has access to it</strong>.
          </p>
          <List>
            <li><strong>Active seat</strong> = a member of your tenant whose role is enrolled, rostered, or otherwise non-archived at the time the work is accessible to them.</li>
            <li>If you reduce your active roster, the released seats free up automatically. If you grow beyond your purchased seat count, you must purchase additional copies before adding the work to those members' libraries.</li>
            <li>Public-domain works do not consume seats.</li>
            <li>All-rights-reserved (un-distributed) works do not consume seats either, because they should not be shared.</li>
          </List>
        </Section>

        <Section number="4" title="Print vs. digital">
          <p>
            Many licenses cover only one mode of distribution. Common patterns:
          </p>
          <List>
            <li><strong>Print-only licenses</strong> permit one physical copy per seat, made by the licensee (you), not redistributed digitally. Uploading the PDF to a shared GleeWorld library typically violates this category. If your license is print-only, mark the upload "private" and use the platform only for your own reference.</li>
            <li><strong>Digital licenses</strong> usually permit on-screen distribution to a defined number of seats; some also permit printing one physical copy per seat, others don't. Read the license.</li>
            <li><strong>"Either / or" licenses</strong> let you choose mode per seat — most commonly, "print and distribute, OR display digitally, but not both per copy purchased." Track the choice in the work's rights metadata.</li>
          </List>
          <p>
            The platform does not police printing, but it does record which
            seats accessed each work; in a publisher audit, that record protects
            you only if your usage matches the license you cite.
          </p>
        </Section>

        <Section number="5" title="Shared vs. personal libraries">
          <p>
            GleeWorld stores uploaded content in two partitions, and the
            distinction matters for licensing:
          </p>
          <List>
            <li><strong>Shared library</strong> (tenant-wide) — visible to all members in roles you grant. This is "distribution" for licensing purposes; each active member with access counts as one copy.</li>
            <li><strong>Personal library</strong> — visible only to the uploading user. This is generally "use" rather than "distribution," but it still requires that you hold a copy or license for the underlying work yourself.</li>
          </List>
          <p>
            Moving a work from personal to shared activates seat-count
            enforcement and may trigger the publisher's distribution terms.
            Do not move all-rights-reserved material into the shared library.
          </p>
        </Section>

        <Section number="6" title="Prohibited uses">
          <List>
            <li>Uploading material you do not have the right to host (no license, not public domain, not your own work).</li>
            <li>Sharing licensed material beyond the seat count permitted by your license.</li>
            <li>Stripping, obscuring, or altering copyright notices, watermarks, or editorial credits on uploaded scores or recordings.</li>
            <li>Re-distributing GleeWorld-hosted material to recipients outside your tenant (e.g. emailing a PDF to a non-member, posting to a public website, syncing to a non-licensed cloud).</li>
            <li>Using the platform to systematically duplicate or scrape copyrighted catalogs from publisher sites or paid services.</li>
            <li>Using the platform to circumvent any technical protection measure (DRM, encryption, watermark) applied by the rightsholder.</li>
          </List>
          <p>
            Violations may result in immediate content takedown, account
            suspension, and — in clear and repeated cases — termination of the
            tenant account under the repeat-infringer policy in section 8.
          </p>
        </Section>

        <Section number="7" title="Editions, arrangements, and arranger credits">
          <p>
            A work being public domain does not make all editions of it public
            domain. Modern critical editions, urtext editions, choral
            arrangements, transcriptions, accompaniment realizations, and
            piano-vocal reductions can themselves be copyrighted by the editor
            or arranger.
          </p>
          <p>
            When you upload a piece, please record both the original composer
            <em> and</em> the editor or arranger if one is named on the score.
            The rights category of the upload reflects the most recent
            copyrightable contribution to the version you are using, not the
            composition's original publication date.
          </p>
        </Section>

        <Section number="8" title="DMCA notice &amp; takedown" id="dmca">
          <p>
            GleeWorld responds to claims of copyright infringement under the
            Digital Millennium Copyright Act ("DMCA"). If you are a rightsholder
            (or an authorized agent of one) and you believe material on the
            platform infringes your copyright, send us a written notice with
            the following:
          </p>
          <List>
            <li>Your physical or electronic signature.</li>
            <li>Identification of the copyrighted work you claim has been infringed.</li>
            <li>Identification of the material you claim is infringing and where it appears on the platform (URL, tenant name, file title).</li>
            <li>Your contact information — name, address, telephone, email.</li>
            <li>A statement, made in good faith, that the use is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the owner or are authorized to act on the owner's behalf.</li>
          </List>
          <p>
            <strong>Send notices to our Designated Agent:</strong>
          </p>
          <address className="not-italic text-sm bg-muted/50 rounded-lg p-4 font-mono whitespace-pre-line">
{`GleeWorld — DMCA Designated Agent
[Name to be inserted at registration]
[Mailing address]
Email: support@gleeworld.org`}
          </address>
          <p className="text-xs text-muted-foreground">
            <strong>Operator note (not part of the policy):</strong> the designated
            agent must be registered with the U.S. Copyright Office at{' '}
            <a href="https://dmca.copyright.gov/osp/" target="_blank" rel="noreferrer" className="underline">dmca.copyright.gov</a>{' '}
            for the safe-harbor protection to attach. The registration fee is small
            and the form takes ~10 minutes. The contact above should match the
            registered agent.
          </p>

          <h3 className="text-base font-semibold mt-4">Counter-notice</h3>
          <p>
            If your material was removed and you believe it was removed in error
            (e.g. you hold the necessary license, the work is public domain, or
            the use is fair), you may send a counter-notice with:
          </p>
          <List>
            <li>Your physical or electronic signature.</li>
            <li>Identification of the removed material and the location it appeared before removal.</li>
            <li>A statement, under penalty of perjury, that you believe the removal was a mistake or misidentification.</li>
            <li>Your name, address, and phone number, and a statement consenting to the jurisdiction of the federal court for your district (or, if outside the U.S., the Northern District of California).</li>
          </List>
          <p>
            We will forward the counter-notice to the original complainant. If
            they do not file suit within 10–14 business days, we may restore the
            material.
          </p>

          <h3 className="text-base font-semibold mt-4">Repeat-infringer policy</h3>
          <p>
            Users and tenants found to be repeat infringers — defined as those
            against whom we receive multiple substantiated DMCA notices that
            are not successfully counter-noticed — will have their accounts
            suspended or terminated. "Substantiated" includes notices we have
            acted on without a successful counter-notice within the statutory
            response window.
          </p>
        </Section>

        <Section number="9" title="Changes to this policy">
          <p>
            We may update this policy as the platform, the law, or industry
            licensing norms change. Material changes will be announced to
            tenant administrators by email and noted at the top of this page.
            Continued use of the platform after a change constitutes
            acceptance of the revised policy.
          </p>
        </Section>

        <Section number="10" title="Questions">
          <p className="flex items-start gap-2">
            <Mail className="w-4 h-4 mt-1 shrink-0" />
            <span>
              All questions about this policy, including formal DMCA
              notices, go to <a href="mailto:support@gleeworld.org" className="underline">support@gleeworld.org</a>.
              (Dedicated <code>legal@</code> and <code>dmca@</code> addresses may be added later.)
            </span>
          </p>
        </Section>

        <footer className="pt-8 border-t border-border text-xs text-muted-foreground space-y-2">
          <p>
            This policy is incorporated into the GleeWorld Terms of Service. In
            the event of a conflict between this policy and the Terms, the
            Terms govern.
          </p>
          <p>
            This text is a self-published template tailored to GleeWorld's use
            case; before launch we recommend a brief review by an
            intellectual-property attorney familiar with online-service-provider
            safe harbor.
          </p>
        </footer>
      </div>
    </div>
    </PublicLayout>
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

function Category({
  label, tone, children,
}: {
  label: string;
  tone: 'emerald' | 'sky' | 'rose';
  children: React.ReactNode;
}) {
  const toneClass = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    sky: 'border-sky-200 bg-sky-50 text-sky-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
  }[tone];
  const labelClass = {
    emerald: 'bg-emerald-600 text-white',
    sky: 'bg-sky-600 text-white',
    rose: 'bg-rose-600 text-white',
  }[tone];
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed ${toneClass}`}>
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${labelClass}`}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
