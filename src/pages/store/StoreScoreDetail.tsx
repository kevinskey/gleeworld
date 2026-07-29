import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStoreScore, useCreateCheckout } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';

const ASSETS_BUCKET = 'partner-assets';

export default function StoreScoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: score, isLoading } = useStoreScore(id);
  const cart = useCart();
  const checkout = useCreateCheckout();

  if (isLoading) return <DashboardPageShell title="Store"><p className="text-sm text-slate-600">Loading…</p></DashboardPageShell>;
  if (!score) return <DashboardPageShell title="Store"><p className="text-sm text-slate-600">Score not found.</p></DashboardPageShell>;

  const thumbUrl = score.thumbnail_storage_path
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(score.thumbnail_storage_path).data.publicUrl
    : null;

  const add = () => {
    const res = cart.addItem(score);
    if (!res.ok && res.reason === 'multiple_partners') {
      toast.error('Complete your current partner purchase first, then start a new cart.');
      return;
    }
    toast.success('Added to cart');
  };

  const buyNow = async () => {
    const res = cart.addItem(score);
    if (!res.ok) { toast.error('Cart conflict — check current cart first.'); return; }
    try {
      const r = await checkout.mutateAsync({ partner_score_ids: cart.items.map(i => i.id).concat([score.id]).filter((v, i, arr) => arr.indexOf(v) === i) });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  return (
    <DashboardPageShell title={score.title} subtitle={`by ${score.composer ?? score.partner?.display_name ?? 'composer'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="aspect-[3/4] rounded bg-slate-50 border overflow-hidden flex items-center justify-center">
              {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">No thumbnail</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1">
              {score.voicing && <Badge variant="outline" className="text-xs">{score.voicing}</Badge>}
              {score.ensemble_type && <Badge variant="outline" className="text-xs">{score.ensemble_type}</Badge>}
              {score.difficulty_grade && <Badge variant="outline" className="text-xs">{score.difficulty_grade}</Badge>}
              {typeof score.page_count === 'number' && <Badge variant="outline" className="text-xs">{score.page_count} pages</Badge>}
            </div>
            {score.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{score.description}</p>}
            <div>
              <p className="text-2xl font-bold">${(score.price_cents / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-500">50% goes to the composer.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={buyNow} disabled={checkout.isPending}>Buy now</Button>
              <Button variant="outline" onClick={add}>
                <ShoppingCart className="w-4 h-4 mr-1" /> Add to cart
              </Button>
            </div>
            {score.partner_id && (
              <button
                type="button"
                onClick={() => navigate(`/store/partners/${score.partner_id}`)}
                className="text-xs text-slate-600 hover:underline inline-flex items-center gap-1"
              >
                More by {score.partner?.display_name} <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
