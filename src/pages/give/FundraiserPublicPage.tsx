// Org-level giving page — /give/:slug. Anon-accessible.
//
// This page's job is NOT primarily to take a donation. A $3,500-of-$42,350
// bar does not make anyone feel decisive. Its job is to route a visitor to a
// PARTICIPANT, because a personal page at 76% of a $500 goal converts several
// times better. Hence the participant search sitting directly under the
// donate button, exactly where the platforms that do this well put it.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, AlertTriangle, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { GivingHero } from '@/components/giving/GivingHero';
import { DonateDialog } from '@/components/giving/DonateDialog';
import { TopDonations } from '@/components/giving/TopDonations';
import { ShareSheet } from '@/components/giving/ShareSheet';
import {
  fetchFundraiser, fetchParticipants, fetchTopDonations, fetchGroups,
  fmtMoney, pctOfGoal,
} from '@/lib/giving/api';
import { useGivingMeta } from './useGivingMeta';

export default function FundraiserPublicPage() {
  const { slug = '' } = useParams();
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [donationLimit, setDonationLimit] = useState(5);

  const { data: fundraiser, isLoading, error } = useQuery({
    queryKey: ['giving', 'fundraiser', slug],
    queryFn: () => fetchFundraiser(slug),
    enabled: !!slug,
  });

  // Debounced so typing a name doesn't fire a query per keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: participants = [] } = useQuery({
    queryKey: ['giving', 'participants', slug, debounced],
    queryFn: () => fetchParticipants(slug, { search: debounced, limit: 100 }),
    enabled: !!fundraiser?.allow_participants,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['giving', 'groups', slug],
    queryFn: () => fetchGroups(slug),
    enabled: !!fundraiser,
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['giving', 'donations', slug],
    queryFn: () => fetchTopDonations(slug, null, 25),
    enabled: !!fundraiser,
  });

  useGivingMeta(fundraiser ? {
    title: fundraiser.title,
    description: fundraiser.story ?? `Support ${fundraiser.tenant_name}.`,
    image: fundraiser.hero_image_url,
    indexable: fundraiser.is_indexable,
  } : null);

  const shownDonations = useMemo(() => donations.slice(0, donationLimit), [donations, donationLimit]);

  if (isLoading) {
    return (
      <UniversalLayout>
        <div className="min-h-[50vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </UniversalLayout>
    );
  }

  if (error || !fundraiser) {
    return (
      <UniversalLayout>
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Fundraiser not found</h1>
          <p className="text-muted-foreground">This fundraiser may have ended or the link may be incorrect.</p>
        </div>
      </UniversalLayout>
    );
  }

  const shareUrl = `${window.location.origin}/give/${fundraiser.slug}`;

  return (
    <UniversalLayout>
      <div className="text-white" style={{ background: 'var(--site-accent, #2f6fed)' }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold">{fundraiser.title}</h1>
          <p className="opacity-85 mt-1">{fundraiser.tenant_name}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_380px] gap-6 pb-28 lg:pb-10">
        {/* Left column — story, participants, groups */}
        <div className="space-y-6 order-2 lg:order-1">
          {fundraiser.hero_image_url && (
            <img
              src={fundraiser.hero_image_url}
              alt=""
              className="w-full rounded-xl border object-cover max-h-72"
              loading="lazy"
            />
          )}

          {fundraiser.story && (
            <div className="rounded-xl border bg-card p-5">
              <p className="whitespace-pre-wrap leading-relaxed">{fundraiser.story}</p>
            </div>
          )}

          {fundraiser.allow_participants && (
            <div className="rounded-xl border bg-card p-5">
              <Tabs defaultValue="participants">
                <TabsList>
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                  {groups.length > 0 && <TabsTrigger value="groups">Groups</TabsTrigger>}
                </TabsList>

                <TabsContent value="participants" className="mt-4">
                  {participants.length === 0 && !debounced ? (
                    <p className="text-sm text-muted-foreground">Participant pages are being set up.</p>
                  ) : participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No participant matches "{debounced}".</p>
                  ) : (
                    <ul className="divide-y">
                      {participants.map(p => (
                        <li key={p.slug}>
                          <Link
                            to={`/give/${fundraiser.slug}/${p.slug}`}
                            className="flex items-center gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 rounded"
                          >
                            <Avatar className="w-9 h-9">
                              {p.photo_url && <AvatarImage src={p.photo_url} alt="" />}
                              <AvatarFallback>{p.display_name.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-primary truncate">{p.display_name}</div>
                              {p.grade_label && <div className="text-xs text-muted-foreground">{p.grade_label}</div>}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold tabular-nums">{fmtMoney(p.raised_cents)}</div>
                              <div className="text-xs text-muted-foreground">{pctOfGoal(p.raised_cents, p.goal_cents)}% of goal</div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                {groups.length > 0 && (
                  <TabsContent value="groups" className="mt-4">
                    <ul className="divide-y">
                      {groups.map(g => (
                        <li key={g.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{g.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold tabular-nums">{fmtMoney(g.raised_cents)}</div>
                            {g.goal_cents > 0 && (
                              <div className="text-xs text-muted-foreground">{pctOfGoal(g.raised_cents, g.goal_cents)}% of goal</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>

        {/* Right rail — the money */}
        <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <GivingHero
            raisedCents={fundraiser.raised_cents}
            goalCents={fundraiser.goal_cents}
            endsAt={fundraiser.ends_at}
            donateLabel="Donate"
            closed={fundraiser.status === 'closed'}
            onDonate={() => setDonateOpen(true)}
            onShare={() => setShareOpen(true)}
          />

          {fundraiser.allow_participants && fundraiser.participant_count > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search for a participant"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Giving to a specific singer helps them reach their own goal.
              </p>
            </div>
          )}

          <TopDonations
            donations={shownDonations}
            showParticipant
            canShowMore={donations.length > shownDonations.length}
            onShowMore={() => setDonationLimit(n => n + 20)}
          />
        </div>
      </div>

      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} fundraiser={fundraiser} />
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={fundraiser.title}
        pitch={`Please help support ${fundraiser.tenant_name}! Every gift counts.`}
      />
    </UniversalLayout>
  );
}
