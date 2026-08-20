// Participant page — /give/:slug/:participantSlug. Anon-accessible.
//
// This is the page that raises the money. A named singer at 76% of a $500
// goal makes a $60 gift feel decisive in a way a $42,000 program goal never
// will. Everything here serves that: the photo first, the first-person
// letter, the personal progress bar, and a donor wall of people who already
// said yes.
//
// One deliberate difference from the platforms this is modeled on: there is
// no gray silhouette fallback. A default avatar visibly depresses giving, so
// a participant with no photo gets a branded initial tile instead.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, ChevronRight, Info } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { GivingHero } from '@/components/giving/GivingHero';
import { DonateDialog } from '@/components/giving/DonateDialog';
import { TopDonations } from '@/components/giving/TopDonations';
import { ShareSheet } from '@/components/giving/ShareSheet';
import { fetchFundraiser, fetchParticipant, fetchTopDonations, fmtMoney } from '@/lib/giving/api';
import { useGivingMeta } from './useGivingMeta';

export default function ParticipantPublicPage() {
  const { slug = '', participantSlug = '' } = useParams();
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [donationLimit, setDonationLimit] = useState(5);

  const { data: fundraiser, isLoading: loadingFundraiser } = useQuery({
    queryKey: ['giving', 'fundraiser', slug],
    queryFn: () => fetchFundraiser(slug),
    enabled: !!slug,
  });

  const { data: participant, isLoading: loadingParticipant } = useQuery({
    queryKey: ['giving', 'participant', slug, participantSlug],
    queryFn: () => fetchParticipant(slug, participantSlug),
    enabled: !!slug && !!participantSlug,
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['giving', 'donations', slug, participantSlug],
    queryFn: () => fetchTopDonations(slug, participantSlug, 25),
    enabled: !!participant,
  });

  useGivingMeta(fundraiser && participant ? {
    title: `${participant.display_name} — ${fundraiser.title}`,
    description: `${fmtMoney(participant.raised_cents)} raised of a ${fmtMoney(participant.goal_cents)} goal. ${participant.story ?? ''}`.trim(),
    image: participant.photo_url ?? fundraiser.hero_image_url,
    indexable: false, // Participant pages picture minors — never indexed.
  } : null);

  if (loadingFundraiser || loadingParticipant) {
    return (
      <UniversalLayout>
        <div className="min-h-[50vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </UniversalLayout>
    );
  }

  if (!fundraiser || !participant) {
    return (
      <UniversalLayout>
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-4">This participant page may not be published yet.</p>
          {fundraiser && (
            <Link to={`/give/${fundraiser.slug}`} className="text-primary hover:underline">
              Go to the main fundraiser page →
            </Link>
          )}
        </div>
      </UniversalLayout>
    );
  }

  const shareUrl = `${window.location.origin}/give/${fundraiser.slug}/${participant.slug}`;
  const initials = participant.display_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <UniversalLayout>
      <div className="text-white" style={{ background: 'var(--site-accent, #2f6fed)' }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold">{fundraiser.title}</h1>
          <nav className="flex items-center gap-1 mt-1 text-sm opacity-85" aria-label="Breadcrumb">
            {/* Breadcrumb back to the org page: every shared participant link
                also markets the ensemble. */}
            <Link to={`/give/${fundraiser.slug}`} className="hover:underline">{fundraiser.tenant_name}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-white">{participant.display_name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_380px] gap-6 pb-28 lg:pb-10">
        <div className="space-y-6 order-2 lg:order-1">
          <div className="rounded-xl border bg-card p-5">
            <div className="sm:flex sm:gap-6">
              <div className="shrink-0 mb-4 sm:mb-0">
                {participant.photo_url ? (
                  <img
                    src={participant.photo_url}
                    alt={participant.display_name}
                    className="w-32 h-40 object-cover rounded-lg border shadow-sm rotate-[-2deg]"
                  />
                ) : (
                  <div
                    className="w-32 h-40 rounded-lg border shadow-sm rotate-[-2deg] grid place-items-center text-4xl font-bold text-white"
                    style={{ background: 'var(--site-accent, #2f6fed)' }}
                    aria-hidden
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold">{participant.display_name}</h2>
                {(participant.grade_label || participant.group_name) && (
                  <p className="text-muted-foreground">
                    {[participant.grade_label, participant.group_name].filter(Boolean).join(' · ')}
                  </p>
                )}
                {participant.story && (
                  <p className="mt-4 whitespace-pre-wrap leading-relaxed">{participant.story}</p>
                )}
              </div>
            </div>

            {participant.video_url && (
              <video
                src={participant.video_url}
                controls
                playsInline
                className="mt-5 w-full rounded-lg border"
              />
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 flex gap-3">
            <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Learn more</div>
              <p className="text-sm text-muted-foreground">Fundraiser details and full leaderboard.</p>
              <Link to={`/give/${fundraiser.slug}`} className="text-sm text-primary hover:underline">
                Main fundraiser page →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <GivingHero
            raisedCents={participant.raised_cents}
            goalCents={participant.goal_cents}
            endsAt={fundraiser.ends_at}
            donateLabel={`Donate to ${participant.display_name.split(' ')[0]}`}
            closed={fundraiser.status === 'closed'}
            onDonate={() => setDonateOpen(true)}
            onShare={() => setShareOpen(true)}
          />
          <TopDonations
            donations={donations.slice(0, donationLimit)}
            canShowMore={donations.length > donationLimit}
            onShowMore={() => setDonationLimit(n => n + 20)}
          />
        </div>
      </div>

      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        fundraiser={fundraiser}
        participantSlug={participant.slug}
        participantName={participant.display_name}
      />
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={`${participant.display_name} — ${fundraiser.title}`}
        pitch={`I'm raising ${fmtMoney(participant.goal_cents)} for ${fundraiser.tenant_name} and I'm at ${fmtMoney(participant.raised_cents)}. Any amount helps — thank you!`}
      />
    </UniversalLayout>
  );
}
