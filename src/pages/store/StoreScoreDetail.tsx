import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStoreScore, useCreateCheckout } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';
import { StoreScoreCover } from '@/components/store/StoreScoreCover';
import { StoreTrustStrip } from '@/components/store/StoreTrustStrip';

const ASSETS_BUCKET = 'partner-assets';

// Owner-confirmed license copy (seat-based model, final revision 2026-08-03).
// Quantity picker + in-app sharing ship in a follow-up PR — do not claim
// unlimited copies.
const LICENSE_LINE =
  "Priced per student — buy a copy for each student who'll use it. You'll be able to share your purchase with that many students right here in the app.";

export default function StoreScoreDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: score, isLoading } = useStoreScore(id);
  const cart = useCart();
  const checkout = useCreateCheckout();

  if (isLoading) return <DashboardPageShell title="Store"><p className="text-sm text-muted-foreground">Loading…</p></DashboardPageShell>;
  if (!score) return <DashboardPageShell title="Store"><p className="text-sm text-muted-foreground">Score not found.</p></DashboardPageShell>;

  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
  const partnerLogo = publicUrl(score.partner?.logo_storage_path ?? null);
  const sampleAudioUrl = publicUrl(score.sample_audio_storage_path);

  const add = () => {
    const res = cart.addItem(score);
    if (!res.ok && res.reason === 'multiple_partners') {
      toast('Your cart has items from another publisher', {
        action: {
          label: 'Clear cart & add this',
          onClick: () => {
            cart.clear();
            cart.addItem(score);
            toast.success('Added to cart');
          },
        },
      });
      return;
    }
    toast.success('Added to cart');
  };

  // Buy now checks out THIS score only — never the cart. The old version
  // concatenated stale cart state and double-charged forgotten items.
  const buyNow = async () => {
    try {
      const r = await checkout.mutateAsync({ partner_score_ids: [score.id] });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  const subtitle = score.composer
    ? `by ${score.composer}${score.arranger ? `, arr. ${score.arranger}` : ''}`
    : undefined;

  return (
    <DashboardPageShell title={score.title} subtitle={subtitle}>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,360px)_1fr] gap-6">
        <div className="md:sticky md:top-4 self-start">
          <StoreScoreCover score={score} className="rounded-lg shadow-md" />
          {typeof score.page_count === 'number' && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Preview · page 1 of {score.page_count}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {score.voicing && <Badge variant="secondary" className="text-xs">{score.voicing}</Badge>}
            {score.ensemble_type && <Badge variant="secondary" className="text-xs">{score.ensemble_type}</Badge>}
            {score.difficulty_grade && <Badge variant="secondary" className="text-xs">{score.difficulty_grade}</Badge>}
            {typeof score.page_count === 'number' && <Badge variant="secondary" className="text-xs">{score.page_count} pages</Badge>}
          </div>

          {(score.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {score.tags!.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {score.description && (
            <p className="text-sm text-foreground whitespace-pre-wrap max-w-prose">{score.description}</p>
          )}

          <div>
            <p className="text-3xl font-bold">${(score.price_cents / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{LICENSE_LINE}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-auto" onClick={buyNow} disabled={checkout.isPending}>
              {checkout.isPending ? 'Opening Stripe…' : 'Buy now'}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={add}>
              <ShoppingCart className="w-4 h-4 mr-1" /> Add to cart
            </Button>
          </div>

          <StoreTrustStrip />

          {sampleAudioUrl && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Listen to a sample</p>
              <audio controls className="w-full" src={sampleAudioUrl} />
            </div>
          )}

          {score.partner_id && score.partner && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                {partnerLogo ? (
                  <img src={partnerLogo} alt="" className="w-10 h-10 rounded-full object-cover border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted border" />
                )}
                <p className="text-sm font-medium min-w-0 truncate">{score.partner.display_name}</p>
                <Button asChild variant="outline" className="h-8 text-xs ml-auto shrink-0">
                  <Link to={`/store/partners/${score.partner_id}`}>Visit store</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}
