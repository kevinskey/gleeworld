// A partner's complete store: owner photo, history, their own featured
// shelf, full catalog. ?score=<id> deep-links (from GW featured pieces)
// scroll to and highlight that score.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStorePartner, useStoreScores } from '@/lib/store/api';
import { StoreScoreGrid } from '@/components/store/StoreScoreGrid';
import type { StoreScoreRow } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

function HighlightableGrid({ scores, targetId }: { scores: StoreScoreRow[]; targetId: string | null }) {
  // Card-level wrapper so the ring survives StoreScoreGrid's internals.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scores.map((s) => (
        <div key={s.id} id={`score-${s.id}`} className={s.id === targetId ? 'ring-2 ring-primary rounded-xl' : ''}>
          <StoreScoreGrid scores={[s]} />
        </div>
      ))}
    </div>
  );
}

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

  return (
    <DashboardPageShell title={partner?.display_name ?? 'Store'} maxWidth="6xl">
      <div className="space-y-6">
        <div className="rounded-2xl bg-card p-4 shadow-sm flex items-start gap-4">
          {ownerPhoto ? (
            <img src={ownerPhoto} alt={partner?.display_name ?? ''} className="w-24 h-24 rounded-full border object-cover" />
          ) : logo ? (
            <img src={logo} alt={partner?.display_name ?? ''} className="w-24 h-24 rounded border object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{partner?.display_name ?? '—'}</p>
            {partner?.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{partner.bio}</p>}
            {partner?.website_url && (
              <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                {partner.website_url}
              </a>
            )}
          </div>
        </div>

        {partner?.history && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">Our Story</h2>
            <p className="text-sm whitespace-pre-wrap">{partner.history}</p>
          </section>
        )}

        {featured.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Items</h2>
            <StoreScoreGrid scores={featured} />
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Scores</h2>
          {(scores?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No published scores yet.</p>
          ) : (
            <HighlightableGrid scores={scores!} targetId={targetId} />
          )}
        </section>
      </div>
    </DashboardPageShell>
  );
}
