// Auctions — lots. Every individual item across the tracked sales.
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gavel, Search, X } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MODALITIES, MODALITY_LABELS, type Modality } from '@/lib/auctions/types';
import { AuctionsTabs } from './components/AuctionsTabs';
import { LotRow } from './components/LotRow';
import { useAuction, useLots, useWatchlist, useWatchlistMutations } from './hooks';

export default function LotsPage() {
  const [modality, setModality] = useState('all');
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  // Arriving from a calendar card: show only that sale's equipment.
  const [params, setParams] = useSearchParams();
  const auctionId = params.get('auction') ?? undefined;
  const { data: focusedAuction } = useAuction(auctionId);

  const options = useMemo(() => ({
    modality: modality === 'all' ? undefined : (modality as Modality),
    search: search.trim() || undefined,
    // A specific sale is worth seeing whole, closed lots included — the
    // hide-closed default is for browsing everything, not for one catalog.
    openOnly: auctionId ? false : openOnly,
    auctionId,
  }), [modality, search, openOnly, auctionId]);

  function clearAuctionFilter() {
    const next = new URLSearchParams(params);
    next.delete('auction');
    setParams(next, { replace: true });
  }

  const { data: lots = [], isLoading } = useLots(options);
  const { data: watchlist = [] } = useWatchlist();
  const { add, remove } = useWatchlistMutations();

  const watchedIds = useMemo(
    () => new Set(watchlist.map((w) => w.lot_id)),
    [watchlist],
  );

  function toggleWatch(lotId: string, watched: boolean) {
    if (watched) remove.mutate(lotId);
    else add.mutate(lotId);
  }

  return (
    <DashboardPageShell
      title="Lots"
      icon={Gavel}
      eyebrow="Equipment"
      subtitle="Individual items across every tracked sale."
    >
      <AuctionsTabs />

      {auctionId && (
        <div className="flex items-center justify-between gap-3 flex-wrap border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm min-w-0">
            Showing equipment from{' '}
            <span className="font-semibold">{focusedAuction?.title ?? 'one sale'}</span>
            {focusedAuction?.source?.name && (
              <span className="text-muted-foreground"> · {focusedAuction.source.name}</span>
            )}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/auctions">Back to the calendar</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAuctionFilter}>
              <X className="w-4 h-4 mr-1" /> Show all equipment
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listing text"
            className="pl-8"
            aria-label="Search lots"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger aria-label="Filter by equipment type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {MODALITIES.map((m) => (
                <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`flex items-center gap-2 pb-2 ${auctionId ? 'hidden' : ''}`}>
          <Checkbox
            id="lots-open-only"
            checked={openOnly}
            onCheckedChange={(v) => setOpenOnly(v === true)}
          />
          <Label htmlFor="lots-open-only" className="font-normal text-xs whitespace-nowrap">
            Hide closed lots
          </Label>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">Loading lots…</p>
      ) : lots.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {auctionId
              ? 'No equipment from this sale is listed yet. Lots appear once its catalog has been brought in and read.'
              : 'No lots match this search. Lots appear once a catalog has been brought in and read.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lots.map((lot) => (
            <LotRow
              key={lot.id}
              lot={lot}
              watched={watchedIds.has(lot.id)}
              onToggleWatch={toggleWatch}
              busy={add.isPending || remove.isPending}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Equipment details are read automatically from each auction house's listing text and can be
        wrong or incomplete. Always confirm specifications and condition with the house before you bid.
      </p>
    </DashboardPageShell>
  );
}
