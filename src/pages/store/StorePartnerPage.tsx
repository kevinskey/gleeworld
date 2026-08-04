// A partner's complete store: banner header, story, their own featured
// shelf, full catalog. ?score=<id> deep-links (from GW featured pieces)
// scroll to and highlight that score.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
// Redesign: expert-committee spec 2026-08-03.
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStorePartner, useStoreScores } from '@/lib/store/api';
import { StoreScoreGrid, StoreScoreCard } from '@/components/store/StoreScoreGrid';
import { StoreSectionHeader } from '@/components/store/StoreSectionHeader';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';

const ASSETS_BUCKET = 'partner-assets';

export default function StorePartnerPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const targetId = params.get('score');
  const { data: partner } = useStorePartner(id);
  const { data: scores } = useStoreScores({ partnerId: id });

  const featured = useMemo(
    () => (scores ?? [])
      .filter((s) => s.partner_featured_order != null)
      .sort((a, b) => (a.partner_featured_order! - b.partner_featured_order!)),
    [scores]
  );

  useEffect(() => {
    if (!targetId || !scores?.length) return;
    const el = document.getElementById(`score-${targetId}`);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetId, scores?.length]);

  const url = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
  const ownerPhoto = url(partner?.owner_photo_storage_path ?? null);
  const logo = url(partner?.logo_storage_path ?? null);
  const avatar = ownerPhoto ?? logo;
  const scoreCount = scores?.length ?? 0;
  // When everything is featured the shelf would duplicate the whole catalog.
  const showFeaturedShelf = featured.length > 0 && featured.length !== scoreCount;

  return (
    <DashboardPageShell title={partner?.display_name ?? 'Store'} maxWidth="6xl">
      <div className="space-y-6">
        <header className="rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/15 to-transparent" />
          <div className="px-6 pb-6">
            {avatar ? (
              <img
                src={avatar}
                alt={partner?.display_name ?? ''}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-card -mt-10 relative object-cover"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-card -mt-10 relative bg-muted" />
            )}
            <h2 className="text-2xl font-bold mt-3">{partner?.display_name ?? '—'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary">GleeWorld Partner</Badge>
              <span className="text-xs text-muted-foreground">
                {scoreCount} {scoreCount === 1 ? 'score' : 'scores'}
              </span>
              {partner?.website_url && (
                <Button asChild variant="outline" className="h-8 text-xs">
                  <a href={partner.website_url} target="_blank" rel="noopener noreferrer">Website</a>
                </Button>
              )}
            </div>
            {partner?.bio && (
              <p className="text-sm text-muted-foreground max-w-prose mt-2 whitespace-pre-wrap">{partner.bio}</p>
            )}
          </div>
        </header>

        {partner?.history && (
          <Card>
            <CardContent className="p-6">
              <StoreSectionHeader title="Our Story" />
              <p className="max-w-prose text-sm leading-relaxed whitespace-pre-wrap">{partner.history}</p>
            </CardContent>
          </Card>
        )}

        {showFeaturedShelf && (
          <section>
            <StoreSectionHeader title="Featured" />
            <div className="flex gap-4 overflow-x-auto snap-x pb-2">
              {featured.map((s) => (
                <div key={s.id} className="w-40 shrink-0 snap-start">
                  <StoreScoreCard score={s} to={`/store/scores/${s.id}`} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <StoreSectionHeader title="All Scores" count={scoreCount} />
          {scoreCount === 0 ? (
            <StoreEmptyState icon={Music} headline="No published scores yet" />
          ) : (
            <StoreScoreGrid scores={scores!} highlightId={targetId} />
          )}
        </section>
      </div>
    </DashboardPageShell>
  );
}
