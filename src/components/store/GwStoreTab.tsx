// GW Sheet Music Store — front door, rebuilt to Kevin's 2026-08-03
// desktop/iPad/iPhone store model: marketing hero (in-hero search +
// Browse/Sell CTAs), trust strip, category chip filters, browse section
// with result count + sort, publisher cards with title counts, and a
// Become-a-Partner banner. Earlier spec history:
// docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight, Church, GraduationCap, LayoutGrid, Music, Music2, Star, Store, Users,
} from 'lucide-react';
import {
  useFeaturedPartners, useStorePartners, useStoreScores,
  type StorePartner, type StoreScoreRow,
} from '@/lib/store/api';
import { StoreScoreGrid } from './StoreScoreGrid';
import { StoreHero } from './StoreHero';
import { StoreTrustStrip } from './StoreTrustStrip';
import { StoreSectionHeader } from './StoreSectionHeader';
import { StoreEmptyState } from './StoreEmptyState';

const ASSETS_BUCKET = 'partner-assets';
const PARTNER_MAILTO = 'mailto:kpj64110@gmail.com?subject=Publishing%20on%20GleeWorld';

// Category chips from the store model. Voicing chips match score.voicing;
// topic chips match tags (both case-insensitive). Fixed vocabulary so the
// row looks intentional even while the catalog is small.
const CHIPS: Array<{ key: string; label: string; icon: typeof Music; kind: 'all' | 'voicing' | 'tag' }> = [
  { key: 'all', label: 'All', icon: LayoutGrid, kind: 'all' },
  { key: 'satb', label: 'SATB', icon: Users, kind: 'voicing' },
  { key: 'ssaa', label: 'SSAA', icon: Users, kind: 'voicing' },
  { key: 'sab', label: 'SAB', icon: Users, kind: 'voicing' },
  { key: 'ttbb', label: 'TTBB', icon: Users, kind: 'voicing' },
  { key: 'sacred', label: 'Sacred', icon: Church, kind: 'tag' },
  { key: 'gospel', label: 'Gospel', icon: Music2, kind: 'tag' },
  { key: 'concert', label: 'Concert', icon: Music, kind: 'tag' },
  { key: 'patriotic', label: 'Patriotic', icon: Star, kind: 'tag' },
  { key: 'educational', label: 'Educational', icon: GraduationCap, kind: 'tag' },
];

type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'title';

function matchesChip(s: StoreScoreRow, chip: (typeof CHIPS)[number]): boolean {
  if (chip.kind === 'all') return true;
  if (chip.kind === 'voicing') return (s.voicing ?? '').toLowerCase().replace(/[^a-z]/g, '') === chip.key;
  return (s.tags ?? []).some((t) => t.toLowerCase().includes(chip.key));
}

function partnerImage(p: StorePartner): string | null {
  const path = p.owner_photo_storage_path ?? p.logo_storage_path;
  return path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/** Publisher card per the model: avatar · name · "N titles" · chevron. */
function PublisherCard({ p, titleCount }: { p: StorePartner; titleCount: number }) {
  const img = partnerImage(p);
  return (
    <Link to={`/store/partners/${p.id}`} className="block h-full">
      <Card className="hover:border-primary/40 transition-colors h-full">
        <CardContent className="flex items-center gap-3 p-3">
          {img ? (
            <img src={img} alt="" className="w-11 h-11 rounded-full object-cover border shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/10 border grid place-items-center shrink-0">
              <Store className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{p.display_name}</p>
            <p className="text-xs text-muted-foreground">
              {titleCount} title{titleCount === 1 ? '' : 's'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function GwStoreTab() {
  const { data: featuredPartners } = useFeaturedPartners();
  const { data: allPartners } = useStorePartners();
  const { data: allScores, isLoading } = useStoreScores();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const browseRef = useRef<HTMLDivElement>(null);

  // One deduped publisher list: featured first, then the rest.
  const publishers = useMemo(() => {
    const feat = featuredPartners ?? [];
    const rest = (allPartners ?? []).filter((p) => !feat.some((f) => f.id === p.id));
    return [...feat, ...rest];
  }, [featuredPartners, allPartners]);

  const titleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allScores ?? []) m.set(s.partner_id, (m.get(s.partner_id) ?? 0) + 1);
    return m;
  }, [allScores]);

  const browseScores = useMemo(() => {
    let list = allScores ?? [];
    const activeChip = CHIPS.find((c) => c.key === chip) ?? CHIPS[0];
    list = list.filter((s) => matchesChip(s, activeChip));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q)
        || (s.composer ?? '').toLowerCase().includes(q)
        || (s.arranger ?? '').toLowerCase().includes(q)
        || (s.voicing ?? '').toLowerCase().includes(q)
        || (s.tags ?? []).some((t) => t.toLowerCase().includes(q))
        || (s.partner?.display_name ?? '').toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case 'newest': break; // hook returns newest-first
      case 'price-asc': sorted.sort((a, b) => a.price_cents - b.price_cents); break;
      case 'price-desc': sorted.sort((a, b) => b.price_cents - a.price_cents); break;
      case 'title': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'featured':
      default:
        // GW-featured first (curated order), then everything else newest-first.
        sorted.sort((a, b) =>
          (a.gw_featured_order ?? Number.MAX_SAFE_INTEGER) - (b.gw_featured_order ?? Number.MAX_SAFE_INTEGER));
    }
    return sorted;
  }, [allScores, chip, query, sort]);

  const scrollToBrowse = () => browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6">
      <StoreHero query={query} onQueryChange={setQuery} onBrowse={scrollToBrowse} />

      <StoreTrustStrip />

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CHIPS.map(({ key, label, icon: Icon }) => {
          const active = chip === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setChip(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-primary/40'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          );
        })}
      </div>

      <section ref={browseRef} className="scroll-mt-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold tracking-tight flex-1">Browse Sheet Music</h2>
          <span className="text-sm text-muted-foreground">
            {browseScores.length} result{browseScores.length === 1 ? '' : 's'}
          </span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Sort by: Featured</SelectItem>
              <SelectItem value="newest">Sort by: Newest</SelectItem>
              <SelectItem value="title">Sort by: Title A–Z</SelectItem>
              <SelectItem value="price-asc">Sort by: Price low → high</SelectItem>
              <SelectItem value="price-desc">Sort by: Price high → low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && browseScores.length === 0 && (
          (query || chip !== 'all') ? (
            <p className="text-sm text-muted-foreground">
              No scores match.{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => { setQuery(''); setChip('all'); }}
              >
                Clear filters
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

      <section>
        <StoreSectionHeader title="Featured Publishers" count={publishers.length || undefined} />
        {publishers.length === 0 ? (
          <StoreEmptyState
            icon={Store}
            headline="Publishers are coming"
            body="Partner composers and publishers will appear here as they join."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {publishers.map((p) => (
              <PublisherCard key={p.id} p={p} titleCount={titleCounts.get(p.id) ?? 0} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-full bg-primary grid place-items-center shrink-0">
            <Star className="w-4 h-4 text-primary-foreground fill-current" />
          </span>
          <div>
            <p className="text-base font-semibold">Publish your music on GleeWorld</p>
            <p className="text-sm text-muted-foreground">
              Keep 50% of every sale. Watermarked delivery, Stripe payouts.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <a href={PARTNER_MAILTO}>Become a Partner</a>
        </Button>
      </section>
    </div>
  );
}
