// Auctions — one lot in full. Deliberately shows the structured reading and
// the original listing text side by side: the extraction is a convenience,
// the house's own words are the record.
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Eye, EyeOff, Gavel } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MODALITY_LABELS, type Modality } from '@/lib/auctions/types';
import { formatBid, formatCloses } from '@/lib/auctions/format';
import { useLot, useWatchlist, useWatchlistMutations } from './hooks';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? <span className="text-muted-foreground">Not stated</span>}</dd>
    </div>
  );
}

export default function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const { data: lot, isLoading } = useLot(lotId);
  const { data: watchlist = [] } = useWatchlist();
  const { add, remove } = useWatchlistMutations();

  const watched = watchlist.some((w) => w.lot_id === lotId);

  if (isLoading) {
    return (
      <DashboardPageShell title="Lot" icon={Gavel}>
        <p className="text-sm text-muted-foreground">Loading lot…</p>
      </DashboardPageShell>
    );
  }

  if (!lot) {
    return (
      <DashboardPageShell title="Lot" icon={Gavel}>
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            This lot is not available. It may have been withdrawn, or it may still be waiting on review.
          </p>
          <Button variant="outline" asChild>
            <Link to="/auctions/lots">Back to lots</Link>
          </Button>
        </Card>
      </DashboardPageShell>
    );
  }

  const location = [lot.auction?.location_city, lot.auction?.location_state]
    .filter(Boolean).join(', ');

  const confidence = lot.normalization_confidence;

  return (
    <DashboardPageShell
      title={lot.raw_title}
      icon={Gavel}
      eyebrow="Lot"
      subtitle={lot.auction?.source?.name ?? undefined}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/auctions/lots"><ArrowLeft className="w-4 h-4 mr-2" /> All lots</Link>
          </Button>
          <Button
            variant={watched ? 'secondary' : 'default'}
            disabled={add.isPending || remove.isPending}
            onClick={() => (watched ? remove.mutate(lot.id) : add.mutate(lot.id))}
          >
            {watched
              ? <><EyeOff className="w-4 h-4 mr-2" /> Stop watching</>
              : <><Eye className="w-4 h-4 mr-2" /> Watch this lot</>}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="!text-sm">What the listing says it is</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Equipment type"
                value={lot.modality ? (MODALITY_LABELS[lot.modality as Modality] ?? lot.modality) : null}
              />
              <Field label="Manufacturer" value={lot.manufacturer} />
              <Field label="Model" value={lot.model} />
              <Field
                label="Year"
                value={lot.year_of_manufacture ? String(lot.year_of_manufacture) : null}
              />
              <Field label="Serial" value={lot.serial} />
              <Field label="Lot number" value={lot.lot_number} />
            </dl>

            {lot.condition_notes && (
              <div>
                <dt className="text-xs text-muted-foreground">Condition, as described</dt>
                <dd className="text-sm mt-0.5">{lot.condition_notes}</dd>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              {confidence === null
                ? 'These fields have not been read from the listing yet.'
                : `These fields were read automatically from the listing text (confidence ${Math.round(confidence * 100)}%). They are not a description from the seller, and nothing here is a guarantee of condition. Verify with the auction house.`}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="!text-sm">Bidding</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Current bid" value={formatBid(lot.current_bid_cents)} />
                <Field
                  label="Closing"
                  value={formatCloses(lot.closes_at ?? lot.auction?.closes_at ?? null)}
                />
                <Field label="Sale" value={lot.auction?.title ?? null} />
                <Field label="Location" value={location || null} />
              </dl>
              {lot.url && (
                <a
                  href={lot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--link))] hover:underline mt-4"
                >
                  <ExternalLink className="w-4 h-4" /> Open the listing on the house site
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="!text-sm">The listing, as published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{lot.raw_title}</p>
              {lot.raw_text && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                  {lot.raw_text}
                </p>
              )}
              <Badge variant="outline" className="text-xs mt-3">
                Unedited source text
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPageShell>
  );
}
