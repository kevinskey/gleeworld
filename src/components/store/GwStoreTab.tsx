// GW Sheet Music Store — curated front door for the partner marketplace.
// Hero spotlights the top GW-featured score, a trust strip answers buyer
// doubts, one deduped Publishers shelf, then the full catalog with search.
// A recruitment banner closes the page so the store never dead-ends.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
// Redesign: expert-committee spec 2026-08-03.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Music, Search, Store } from 'lucide-react';
import {
  useFeaturedPartners, useGwFeaturedScores, useStorePartners, useStoreScores,
  type StorePartner,
} from '@/lib/store/api';
import { StoreScoreGrid } from './StoreScoreGrid';
import { StoreHero } from './StoreHero';
import { StoreTrustStrip } from './StoreTrustStrip';
import { StoreSectionHeader } from './StoreSectionHeader';
import { StoreEmptyState } from './StoreEmptyState';

const ASSETS_BUCKET = 'partner-assets';
const PARTNER_MAILTO = 'mailto:kpj64110@gmail.com?subject=Publishing%20on%20GleeWorld';

function partnerImage(p: StorePartner): string | null {
  const path = p.owner_photo_storage_path ?? p.logo_storage_path;
  return path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/** Narrow avatar card for the horizontal shelf (4+ publishers). */
function PartnerCard({ p }: { p: StorePartner }) {
  const img = partnerImage(p);
  return (
    <Link to={`/store/partners/${p.id}`} className="block shrink-0 w-44">
      <Card className="hover:border-primary/40 transition-colors h-full">
        <CardContent className="p-3 text-center">
          {img ? (
            <img src={img} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 border" />
          )}
          <p className="text-sm font-medium truncate">{p.display_name}</p>
          {p.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.bio}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

/** Wide card used when there are only a few publishers (≤ 3). */
function PartnerWideCard({ p }: { p: StorePartner }) {
  const img = partnerImage(p);
  return (
    <Link to={`/store/partners/${p.id}`} className="block">
      <Card className="hover:border-primary/40 transition-colors h-full">
        <CardContent className="flex items-center gap-4 p-4">
          {img ? (
            <img src={img} alt="" className="w-16 h-16 rounded-full object-cover border shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted border shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{p.display_name}</p>
            {p.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.bio}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}

function PartnerShelf({ partners }: { partners: StorePartner[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {partners.map((p) => <PartnerCard key={p.id} p={p} />)}
    </div>
  );
}

export function GwStoreTab() {
  const { data: featuredPartners } = useFeaturedPartners();
  const { data: featuredScores } = useGwFeaturedScores();
  const { data: allPartners } = useStorePartners();
  const { data: allScores, isLoading } = useStoreScores();
  const [query, setQuery] = useState('');

  const heroScore = featuredScores?.[0] ?? null;

  // One deduped publisher list: featured first (featured_order asc from the
  // hook), then the rest alphabetical. Kills the duplicated-card bug.
  const publishers = useMemo(() => {
    const feat = featuredPartners ?? [];
    const rest = (allPartners ?? []).filter((p) => !feat.some((f) => f.id === p.id));
    return [...feat, ...rest];
  }, [featuredPartners, allPartners]);
  const nonFeaturedCount = publishers.length - (featuredPartners?.length ?? 0);
  const splitPublishers = nonFeaturedCount > 0 && publishers.length > 6;

  // Featured Pieces shelf only earns space in a big catalog; below that the
  // hero absorbs the feature and the browse grid is the only score grid.
  const shelfFeatured = useMemo(() => {
    if ((allScores?.length ?? 0) < 8) return [];
    return (featuredScores ?? []).filter((s) => s.id !== heroScore?.id);
  }, [featuredScores, allScores, heroScore]);

  const browseScores = useMemo(() => {
    const list = allScores ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      s.title.toLowerCase().includes(q)
      || (s.composer ?? '').toLowerCase().includes(q)
      || (s.voicing ?? '').toLowerCase().includes(q)
      || (s.partner?.display_name ?? '').toLowerCase().includes(q));
  }, [allScores, query]);

  return (
    <div className="space-y-8">
      <StoreHero featured={heroScore} />

      <StoreTrustStrip />

      <section>
        {splitPublishers ? (
          <>
            <StoreSectionHeader title="Featured Publishers" />
            <PartnerShelf partners={featuredPartners!} />
            <div className="mt-6">
              <StoreSectionHeader title="All Publishers" count={publishers.length} />
              <PartnerShelf partners={publishers.filter((p) => !featuredPartners!.some((f) => f.id === p.id))} />
            </div>
          </>
        ) : (
          <>
            <StoreSectionHeader title="Publishers" count={publishers.length || undefined} />
            {publishers.length === 0 ? (
              <StoreEmptyState
                icon={Store}
                headline="Publishers are coming"
                body="Partner composers and publishers will appear here as they join."
              />
            ) : publishers.length <= 3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publishers.map((p) => <PartnerWideCard key={p.id} p={p} />)}
              </div>
            ) : (
              <PartnerShelf partners={publishers} />
            )}
          </>
        )}
      </section>

      {shelfFeatured.length > 0 && (
        <section>
          <StoreSectionHeader title="Featured Pieces" />
          <StoreScoreGrid
            scores={shelfFeatured}
            linkFor={(s) => `/store/partners/${s.partner_id}?score=${s.id}`}
          />
        </section>
      )}

      <section>
        <StoreSectionHeader title="All Scores" count={browseScores.length || undefined} />
        <div className="relative max-w-sm mb-3">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search scores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && browseScores.length === 0 && (
          query ? (
            <p className="text-sm text-muted-foreground">
              No scores match your search.{' '}
              <button type="button" className="text-primary hover:underline" onClick={() => setQuery('')}>
                Clear search
              </button>
            </p>
          ) : (
            <StoreEmptyState
              icon={Music}
              headline="The catalog is warming up"
              body="New scores from our partner composers are on the way."
            />
          )
        )}
        {browseScores.length > 0 && <StoreScoreGrid scores={browseScores} />}
      </section>

      <section className="rounded-2xl bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold">Publish your music on GleeWorld</p>
          <p className="text-sm text-muted-foreground">
            Keep 50% of every sale. Watermarked delivery, Stripe payouts.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={PARTNER_MAILTO}>Become a partner</a>
        </Button>
      </section>
    </div>
  );
}
