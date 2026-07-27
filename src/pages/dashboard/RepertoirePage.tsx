import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import {
  useRepertoireSearch,
  useRepertoireFeatured,
  type RepertoireItem,
} from '@/lib/repertoire/api';
import {
  RepertoireSearchBar,
  type RepertoireFilters,
} from '@/components/repertoire/RepertoireSearchBar';
import { RepertoireResultCard } from '@/components/repertoire/RepertoireResultCard';
import { RepertoireBrowseShelf } from '@/components/repertoire/RepertoireBrowseShelf';

const DEFAULTS: RepertoireFilters = { query: '', ensemble: '', voicing: '', source: '' };

export default function RepertoirePage() {
  const [filters, setFilters] = useState<RepertoireFilters>(DEFAULTS);
  const [tab, setTab] = useState<'browse' | 'search'>('browse');

  const featuredChoral = useRepertoireFeatured('choral', 12);
  const featuredBand = useRepertoireFeatured('band', 12);

  const searchEnabled = tab === 'search' && (
    filters.query.trim().length > 0 ||
    !!filters.ensemble ||
    !!filters.voicing ||
    !!filters.source
  );

  const search = useRepertoireSearch(
    {
      query: filters.query || undefined,
      ensemble: filters.ensemble || undefined,
      voicing: filters.voicing || undefined,
      source: filters.source || undefined,
      limit: 50,
    },
    { enabled: searchEnabled },
  );

  const onAddToMyMusic = (item: RepertoireItem) =>
    toast.info(`"${item.title}" — saving to My Music (coming in Phase 3)`);
  const onAddToTenant = (item: RepertoireItem) =>
    toast.info(`"${item.title}" — saving to tenant library (coming in Phase 3)`);

  return (
    <DashboardPageShell
      title="Repertoire"
      subtitle="Browse and search choral & band repertoire across CPDL, IMSLP and more"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'search')}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6 mt-4">
          <RepertoireBrowseShelf
            title="Featured choral"
            items={featuredChoral.data ?? []}
            loading={featuredChoral.isLoading}
            onAddToMyMusic={onAddToMyMusic}
            onAddToTenant={onAddToTenant}
          />
          <RepertoireBrowseShelf
            title="Featured band"
            items={featuredBand.data ?? []}
            loading={featuredBand.isLoading}
            onAddToMyMusic={onAddToMyMusic}
            onAddToTenant={onAddToTenant}
          />
          {!featuredChoral.isLoading && !featuredBand.isLoading &&
            (featuredChoral.data ?? []).length === 0 &&
            (featuredBand.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Featured selections will appear once the IMSLP crawler has ingested content. Try the Search tab in the meantime — CPDL's full catalog is already available.
              </p>
            )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4 mt-4">
          <RepertoireSearchBar filters={filters} onChange={setFilters} />
          {!searchEnabled && (
            <p className="text-sm text-muted-foreground">Enter a search term or pick a filter to see results.</p>
          )}
          {searchEnabled && search.isLoading && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {searchEnabled && search.data && search.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No results. Try broadening the search.</p>
          )}
          {searchEnabled && search.data && search.data.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {search.data.map((it) => (
                <RepertoireResultCard
                  key={it.id}
                  item={it}
                  onAddToMyMusic={onAddToMyMusic}
                  onAddToTenant={onAddToTenant}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  );
}
