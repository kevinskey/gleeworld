import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/store/CartContext';
import { useCreateCheckout } from '@/lib/store/api';
import { StoreScoreCover } from '@/components/store/StoreScoreCover';
import { StoreTrustStrip } from '@/components/store/StoreTrustStrip';

export function CartDrawer() {
  const cart = useCart();
  const checkout = useCreateCheckout();
  const subtotal = cart.subtotalCents;
  // All cart items share one partner by construction; older persisted carts
  // may predate the partner_name field.
  const partnerName = cart.items.find((i) => i.partner_name)?.partner_name;

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
        <Button variant="outline" size="icon" className="relative" aria-label={`Cart, ${cart.items.length} items`}>
          <ShoppingCart className="w-4 h-4" />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-primary text-primary-foreground text-[10px] grid place-items-center px-1">
              {cart.items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
          {partnerName && <p className="text-xs text-muted-foreground">From {partnerName}</p>}
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {cart.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          )}
          {cart.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-sm">
              {it.thumbnail_storage_path ? (
                <StoreScoreCover
                  score={{ title: it.title, composer: null, voicing: null, thumbnail_storage_path: it.thumbnail_storage_path }}
                  className="w-6 rounded border shrink-0"
                />
              ) : (
                <div className="w-6 aspect-[3/4] rounded border bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{it.title}</p>
                <p className="text-xs text-muted-foreground">${(it.price_cents / 100).toFixed(2)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cart.removeItem(it.id)} aria-label="Remove">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {cart.items.length > 0 && (
            <>
              <div className="border-t pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span>
                </div>
              </div>
              <StoreTrustStrip compact />
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
