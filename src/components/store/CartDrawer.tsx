import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/store/CartContext';
import { useCreateCheckout, platformFeeCents } from '@/lib/store/api';

export function CartDrawer() {
  const cart = useCart();
  const checkout = useCreateCheckout();
  const subtotal = cart.subtotalCents;
  const fee = platformFeeCents(subtotal);

  const goCheckout = async () => {
    if (cart.items.length === 0) return;
    try {
      const r = await checkout.mutateAsync({ partner_score_ids: cart.items.map(i => i.id) });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <ShoppingCart className="w-4 h-4 mr-1" /> Cart ({cart.items.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader><SheetTitle>Cart</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {cart.items.length === 0 && (
            <p className="text-sm text-slate-600">Your cart is empty.</p>
          )}
          {cart.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">{it.title}</p>
                <p className="text-xs text-slate-500">${(it.price_cents / 100).toFixed(2)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cart.removeItem(it.id)} aria-label="Remove">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {cart.items.length > 0 && (
            <>
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-slate-500"><span>Composer receives</span><span>${((subtotal - fee) / 100).toFixed(2)}</span></div>
              </div>
              <Button className="w-full rounded-full" onClick={goCheckout} disabled={checkout.isPending}>
                {checkout.isPending ? 'Opening Stripe…' : 'Checkout'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={cart.clear}>Clear cart</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
