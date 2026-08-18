// One auction in the calendar list. The catalog badge is the loudest thing
// on the card on purpose: for several houses the catalog release, not the
// close date, is the moment a buyer has to act on.
import { CalendarClock, ExternalLink, FileText, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { catalogBadge, deriveDisplayStatus } from '@/lib/auctions/calendar';
import { INGEST_METHOD_LABELS, MODALITY_LABELS, type AuctionWithSource, type Modality } from '@/lib/auctions/types';

const STATUS_LABELS: Record<string, string> = {
  announced: 'Announced',
  catalog_posted: 'Catalog posted',
  open: 'Bidding open',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Date to be announced';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function AuctionCard({ auction }: { auction: AuctionWithSource }) {
  const status = deriveDisplayStatus(auction);
  const catalog = catalogBadge(auction);
  const location = [auction.location_city, auction.location_state].filter(Boolean).join(', ');

  return (
    <Card className={status === 'cancelled' ? 'opacity-60' : undefined}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug">{auction.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {auction.source?.name ?? 'Unknown house'}
              {auction.source && (
                <span className="ml-2">· {INGEST_METHOD_LABELS[auction.source.ingest_method]}</span>
              )}
            </p>
          </div>
          <Badge variant={status === 'open' ? 'default' : 'secondary'} className="text-xs shrink-0">
            {STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        {catalog && (
          <div className="flex items-start gap-2 border border-primary/30 bg-primary/5 p-2">
            <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs">
              {catalog.kind === 'posted' && (
                <>
                  <span className="font-semibold">Catalog is out</span> — posted {formatDate(catalog.at)}
                </>
              )}
              {catalog.kind === 'expected' && (
                <>
                  <span className="font-semibold">Catalog expected</span> {formatDate(catalog.at)}
                </>
              )}
              {catalog.kind === 'estimate' && (
                <>
                  <span className="font-semibold">Catalog estimated</span> around {formatDate(catalog.at)}
                  {' '}— this house has not published a date, so this is an estimate based on a typical
                  three-day lead. Check with the house to confirm.
                </>
              )}
            </p>
          </div>
        )}

        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 shrink-0" />
            {auction.opens_at ? `Opens ${formatDateTime(auction.opens_at)}` : 'Opening date to be announced'}
            {auction.closes_at && ` · closes ${formatDateTime(auction.closes_at)}`}
          </span>
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              {location}
            </span>
          )}
        </div>

        {auction.modality_focus.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {auction.modality_focus.map((m) => (
              <Badge key={m} variant="outline" className="text-xs">
                {MODALITY_LABELS[m as Modality] ?? m}
              </Badge>
            ))}
          </div>
        )}

        {auction.catalog_url && (
          <a
            href={auction.catalog_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--link))] hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            View the catalog on {auction.source?.name ?? 'the house site'}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
