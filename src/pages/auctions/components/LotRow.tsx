// One lot in a list. Shows the house's own wording as the headline, with the
// normalizer's structured reading underneath — so a buyer can always see what
// the listing actually said, not just what a model made of it.
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatBid, formatCloses } from '@/lib/auctions/format';
import { MODALITY_LABELS, type LotWithAuction, type Modality } from '@/lib/auctions/types';

interface LotRowProps {
  lot: LotWithAuction;
  watched?: boolean;
  onToggleWatch?: (lotId: string, watched: boolean) => void;
  busy?: boolean;
}

export function LotRow({ lot, watched, onToggleWatch, busy }: LotRowProps) {
  const spec = [
    lot.manufacturer,
    lot.model,
    lot.year_of_manufacture ? String(lot.year_of_manufacture) : null,
  ].filter(Boolean).join(' · ');

  const location = [lot.auction?.location_city, lot.auction?.location_state]
    .filter(Boolean).join(', ');

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug">
              <Link to={`/auctions/lots/${lot.id}`} className="hover:text-primary">
                {lot.raw_title}
              </Link>
            </h3>
            {spec && <p className="text-xs text-muted-foreground mt-0.5">{spec}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lot.modality && (
              <Badge variant="outline" className="text-xs">
                {MODALITY_LABELS[lot.modality as Modality] ?? lot.modality}
              </Badge>
            )}
            {onToggleWatch && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onToggleWatch(lot.id, Boolean(watched))}
                aria-label={watched ? 'Stop watching this lot' : 'Watch this lot'}
              >
                {watched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{formatBid(lot.current_bid_cents)}</span>
          <span>{formatCloses(lot.closes_at ?? lot.auction?.closes_at ?? null)}</span>
          {lot.auction?.source?.name && <span>{lot.auction.source.name}</span>}
          {location && <span>{location}</span>}
          {lot.lot_number && <span>Lot {lot.lot_number}</span>}
        </div>

        {lot.url && (
          <a
            href={lot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--link))] hover:underline"
          >
            <ExternalLink className="w-4 h-4" /> View the listing
          </a>
        )}
      </CardContent>
    </Card>
  );
}
