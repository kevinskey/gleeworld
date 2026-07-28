import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useOrderStatus, useDownloadUrl } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';

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
    return <DashboardPageShell title="Thanks"><p className="text-sm text-slate-600">Missing order id.</p></DashboardPageShell>;
  }

  const isPaid = order?.status === 'paid';

  return (
    <DashboardPageShell title="Thanks for your purchase" subtitle="We're preparing your scores.">
      <Card>
        <CardContent className="p-4 space-y-3">
          {!isPaid && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Confirming payment…
            </div>
          )}
          {isPaid && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Check className="w-4 h-4" /> Payment confirmed.
            </div>
          )}
          {isPaid && order && order.items.length === 0 && (
            <p className="text-sm text-slate-600">Preparing your files…</p>
          )}
          {isPaid && order && order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 border-t pt-3">
              <p className="text-sm">Item {it.id.slice(0, 8)}</p>
              {it.watermarked_storage_path ? (
                <Button size="sm" onClick={() => download(it.id)}>
                  <Download className="w-4 h-4 mr-1" /> Download PDF
                </Button>
              ) : (
                <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Watermarking…</span>
              )}
            </div>
          ))}
          <div className="pt-3 border-t flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/dashboard/music-library">Open My Music</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/store">Back to store</Link></Button>
          </div>
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
