// Auctions — matches. What the matcher job found for this user's saved
// searches, best fit first.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Undo2, X } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatBid, formatCloses } from '@/lib/auctions/format';
import { AuctionsTabs } from './components/AuctionsTabs';
import { useMatchMutations, useMatches } from './hooks';

export default function MatchesPage() {
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const { data: matches = [], isLoading } = useMatches(includeDismissed);
  const { dismiss, restore } = useMatchMutations();

  return (
    <DashboardPageShell
      title="Matches"
      icon={Gavel}
      eyebrow="Equipment"
      subtitle="Lots that met one of your saved searches, strongest fit first."
    >
      <AuctionsTabs />

      <div className="flex items-center gap-2">
        <Checkbox
          id="matches-include-dismissed"
          checked={includeDismissed}
          onCheckedChange={(v) => setIncludeDismissed(v === true)}
        />
        <Label htmlFor="matches-include-dismissed" className="font-normal text-xs">
          Show dismissed matches
        </Label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">Loading matches…</p>
      ) : matches.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Nothing has matched yet. Matches appear after the matcher runs against your saved
            searches.
          </p>
          <Button variant="outline" asChild>
            <Link to="/auctions/searches">Review your saved searches</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const lot = match.lot;
            const dismissed = Boolean(match.dismissed_at);
            return (
              <Card key={match.id} className={dismissed ? 'opacity-60' : undefined}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug">
                        {lot ? (
                          <Link to={`/auctions/lots/${lot.id}`} className="hover:text-primary">
                            {lot.raw_title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">This lot is no longer listed</span>
                        )}
                      </h3>
                      {match.saved_search && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Matched "{match.saved_search.name}"
                        </p>
                      )}
                      {lot && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>{formatBid(lot.current_bid_cents)}</span>
                          <span>{formatCloses(lot.closes_at ?? lot.auction?.closes_at ?? null)}</span>
                          {lot.auction?.source?.name && <span>{lot.auction.source.name}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(match.score)}% fit
                      </Badge>
                      {dismissed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restore.mutate(match.id)}
                          aria-label="Restore this match"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismiss.mutate(match.id)}
                          aria-label="Dismiss this match"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Fit is a ranking aid based on how completely a listing matched your search and how
        confidently its details could be read. It says nothing about the condition or value of the
        equipment.
      </p>
    </DashboardPageShell>
  );
}
