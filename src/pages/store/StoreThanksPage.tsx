import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useOrderStatus, useDownloadUrl } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';
import { StoreScoreCover } from '@/components/store/StoreScoreCover';

const SUPPORT_MAILTO = 'mailto:kpj64110@gmail.com?subject=Store%20order%20help';

export default function StoreThanksPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order') ?? undefined;
  const { data: order } = useOrderStatus(orderId);
  const cart = useCart();
  const dl = useDownloadUrl();

  // Clear the cart once we've confirmed the order is paid.
  useEffect(() => {
    if (order && order.status === 'paid') cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const download = async (item_id: string) => {
    try {
      const r = await dl.mutateAsync({ order_item_id: item_id });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };

  if (!orderId) {
    return <DashboardPageShell title="Thanks"><p className="text-sm text-muted-foreground">Missing order id.</p></DashboardPageShell>;
  }

  const isPaid = order?.status === 'paid';
  const totalCents = (order?.items ?? []).reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const anyWatermarking = isPaid && (order?.items ?? []).some((i) => !i.watermarked_storage_path);

  return (
    <DashboardPageShell title="Thanks for your purchase" subtitle="We're preparing your scores.">
      <Card>
        <CardContent className="p-4 space-y-3">
          {!isPaid && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Confirming payment…
            </div>
          )}
          {isPaid && (
            <div className="flex items-center gap-3">
              <span className="bg-emerald-100 rounded-full p-2">
                <Check className="w-4 h-4 text-emerald-700" />
              </span>
              <p className="text-base font-semibold">Payment confirmed</p>
            </div>
          )}
          {isPaid && order && order.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Preparing your files…</p>
          )}
          {isPaid && order && order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 border-t pt-3">
              <StoreScoreCover
                score={{
                  title: it.title ?? 'Score',
                  composer: it.composer ?? null,
                  voicing: null,
                  thumbnail_storage_path: it.thumbnail_storage_path ?? null,
                }}
                className="w-10 rounded border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{it.title ?? `Item ${it.id.slice(0, 8)}`}</p>
                {it.composer && <p className="text-xs text-muted-foreground truncate">{it.composer}</p>}
              </div>
              {it.watermarked_storage_path ? (
                <Button size="sm" onClick={() => download(it.id)}>
                  <Download className="w-4 h-4 mr-1" /> Download PDF
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Watermarking…
                </span>
              )}
            </div>
          ))}
          {isPaid && totalCents > 0 && (
            <div className="flex justify-between border-t pt-3 text-sm font-semibold">
              <span>Order total</span><span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          )}
          {anyWatermarking && (
            <p className="text-xs text-muted-foreground">
              Watermarking usually takes under a minute. Taking longer?{' '}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">Email support</a>.
            </p>
          )}
          <div className="pt-3 border-t flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/dashboard/music-library">Open My Music</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/store">Back to store</Link></Button>
          </div>
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
