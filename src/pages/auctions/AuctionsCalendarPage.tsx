// Auctions — the calendar. Upcoming equipment sales across every tracked
// house, filterable by house and by modality, with catalog release dates
// called out and a subscribe-from-your-own-calendar option.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Gavel, Settings } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUserRole } from '@/hooks/useUserRole';
import { filterAuctions, groupAuctionsByMonth } from '@/lib/auctions/calendar';
import { MODALITIES, MODALITY_LABELS, type Modality } from '@/lib/auctions/types';
import { AuctionCard } from './components/AuctionCard';
import { SubscribeDialog } from './components/SubscribeDialog';
import { useAuctions, useAuctionSources } from './hooks';

export default function AuctionsCalendarPage() {
  const { isSuperAdmin } = useUserRole();
  const [sourceId, setSourceId] = useState('all');
  const [modality, setModality] = useState('all');
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const { data: sources = [] } = useAuctionSources();
  const { data: auctions = [], isLoading } = useAuctions();

  const groups = useMemo(() => {
    const filtered = filterAuctions(auctions, {
      sourceId: sourceId === 'all' ? undefined : sourceId,
      modality: modality === 'all' ? undefined : (modality as Modality),
    });
    return groupAuctionsByMonth(filtered);
  }, [auctions, sourceId, modality]);

  const total = groups.reduce((n, g) => n + g.auctions.length, 0);

  return (
    <DashboardPageShell
      title="Auctions"
      icon={Gavel}
      eyebrow="Equipment"
      subtitle="Upcoming sales of used medical and diagnostic equipment, with catalog release dates."
      actions={
        <div className="flex gap-2">
          {isSuperAdmin() && (
            <Button variant="outline" asChild>
              <Link to="/auctions/admin">
                <Settings className="w-4 h-4 mr-2" /> Manage
              </Link>
            </Button>
          )}
          <Button onClick={() => setSubscribeOpen(true)}>
            <CalendarPlus className="w-4 h-4 mr-2" /> Subscribe
          </Button>
        </div>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger aria-label="Filter by auction house">
              <SelectValue placeholder="All auction houses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All auction houses</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger aria-label="Filter by equipment type">
              <SelectValue placeholder="All equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {MODALITIES.map((m) => (
                <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">Loading auctions…</p>
      ) : total === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {auctions.length === 0
              ? 'No auctions are on the calendar yet.'
              : 'No auctions match these filters.'}
          </p>
          {auctions.length === 0 && isSuperAdmin() && (
            <Button variant="outline" asChild className="mt-2">
              <Link to="/auctions/admin">Add the first auction</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.auctions.map((a) => (
                  <AuctionCard key={a.id} auction={a as never} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Dates come from each auction house and can change without notice. Confirm details with the
        house before making plans around them.
      </p>

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} sources={sources} />
    </DashboardPageShell>
  );
}
