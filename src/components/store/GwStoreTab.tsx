// GW Sheet Music Store — curated front door for the partner marketplace.
// Featured stores + featured pieces lead; browse-all follows. A featured
// piece deep-links to its store of origin so every feature drives traffic
// into the partner's full catalog.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  useFeaturedPartners, useGwFeaturedScores, useStorePartners, useStoreScores,
  type StorePartner,
} from '@/lib/store/api';
import { StoreScoreGrid } from './StoreScoreGrid';

const ASSETS_BUCKET = 'partner-assets';

function partnerImage(p: StorePartner): string | null {
  const path = p.owner_photo_storage_path ?? p.logo_storage_path;
  return path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

function PartnerCard({ p }: { p: StorePartner }) {
  const img = partnerImage(p);
  return (
    <Link to={`/store/partners/${p.id}`} className="block shrink-0 w-44">
      <Card className="hover:border-slate-400 transition-colors h-full">
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

export function GwStoreTab() {
  const { data: featuredPartners } = useFeaturedPartners();
  const { data: featuredScores } = useGwFeaturedScores();
  const { data: allPartners } = useStorePartners();
  const { data: allScores, isLoading } = useStoreScores();
  const [query, setQuery] = useState('');

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
      {(featuredPartners?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Stores</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {featuredPartners!.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {(featuredScores?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Pieces</h2>
          <StoreScoreGrid
            scores={featuredScores!}
            linkFor={(s) => `/store/partners/${s.partner_id}?score=${s.id}`}
          />
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Stores</h2>
        {(allPartners?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No partner stores yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {allPartners!.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Scores</h2>
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
          <p className="text-sm text-muted-foreground">
            {query ? 'No scores match your search.' : 'No scores in the store yet. Composers publish scores from their portal.'}
          </p>
        )}
        {browseScores.length > 0 && <StoreScoreGrid scores={browseScores} />}
      </section>
    </div>
  );
}
