import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Package, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cart, type CartItem } from '@/features/store/cart';
import type { BlockModule, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Merch'),
});
type Config = z.infer<typeof schema>;

// Row shape returned by gw_store_list_tenant_products (Task 1) — a
// tenant-scoped, add-on-gated catalog view. Empty when the tenant hasn't
// enabled the Store add-on; that's a normal, non-error state (see below).
interface TenantProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  requires_shipping: boolean;
  images: string[] | null;
  description: string | null;
}

interface ShippingFields {
  name: string;
  line1: string;
  city: string;
  state: string;
  postal: string;
}

function displayPrice(p: TenantProduct): number {
  return p.sale_price != null && p.sale_price < p.price ? p.sale_price : p.price;
}

// Stub UI (heading + "coming soon") kept as the fallback for: RPC error,
// add-on not enabled (RPC returns zero rows), or genuinely no products yet.
// All three collapse to the same graceful empty state — a guest visitor
// has no way to tell them apart, and shouldn't need to.
function ComingSoon({ heading }: { heading: string }) {
  return (
    <section id="merch" className="gw-container py-5 text-center">
      <ShoppingBag className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--site-accent)' }} />
      <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-3">{heading}</h2>
      <p className="text-muted-foreground">Our store is coming soon.</p>
    </section>
  );
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  // Live, tenant-scoped catalog. The public site (and preview) both go
  // through the same RPC — it's a read-only inventory view, not
  // draft/published content, so there's no separate preview path like
  // events.tsx has.
  const { data: products = [], isLoading, isError } = useQuery<TenantProduct[]>({
    queryKey: ['public-site-store', ctx.slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('gw_store_list_tenant_products', { p_tenant_slug: ctx.slug });
      if (error) throw error;
      return (data as TenantProduct[]) ?? [];
    },
  });

  // Cart lives in localStorage (src/features/store/cart.ts) and is never
  // reactive on its own, so we mirror it into local state and refresh
  // after every mutation.
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setCartItems(cart.getItems());
  }, []);

  const [buyerEmail, setBuyerEmail] = useState('');
  const [shipping, setShipping] = useState<ShippingFields>({ name: '', line1: '', city: '', state: '', postal: '' });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cartLines = cartItems
    .map((item) => ({ item, product: byId.get(item.product_id) }))
    .filter((line): line is { item: CartItem; product: TenantProduct } => !!line.product);
  const subtotal = cartLines.reduce((sum, l) => sum + displayPrice(l.product) * l.item.quantity, 0);
  const needsShipping = cartLines.some((l) => l.product.requires_shipping);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleAddToCart = (product: TenantProduct) => {
    cart.addItem({ product_id: product.id, quantity: 1 });
    setCartItems(cart.getItems());
  };

  const handleRemove = (item: CartItem) => {
    cart.removeItem(item.product_id, item.variant_id);
    setCartItems(cart.getItems());
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!buyerEmail || !buyerEmail.includes('@')) {
      setCheckoutError('Enter a valid email to receive your receipt.');
      return;
    }
    if (needsShipping && (!shipping.name || !shipping.line1 || !shipping.city || !shipping.state || !shipping.postal)) {
      setCheckoutError('Fill out the shipping address for the physical items in your cart.');
      return;
    }
    setSubmitting(true);
    try {
      // Guest tenant checkout (Task 2) — no login required. The client
      // never sends a price; store-checkout resolves it server-side from
      // gw_products keyed on tenant_slug.
      const { data, error } = await supabase.functions.invoke('store-checkout', {
        body: {
          store_type: 'tenant',
          tenant_slug: ctx.slug,
          items: cart.getItems(),
          buyer_email: buyerEmail,
          ...(needsShipping ? { shipping_address: shipping } : {}),
        },
      });
      if (error) throw new Error(error.message || 'Checkout failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No checkout URL received');
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'There was an error starting checkout.');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section id="merch" className="gw-container py-5 text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
      </section>
    );
  }

  // Add-on not enabled, RPC error, or no products yet — all render the
  // same graceful empty state rather than surfacing an error to a guest.
  if (isError || products.length === 0) {
    return <ComingSoon heading={config.heading} />;
  }

  return (
    <section id="merch" className="gw-container py-5">
      <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
        <ShoppingBag className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
        {config.heading}
      </h2>

      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-lg:grid-cols-3 gap-4 cq-sm:gap-6">
        {products.map((product) => {
          const price = displayPrice(product);
          const onSale = product.sale_price != null && product.sale_price < product.price;
          const image = product.images?.[0];
          return (
            <div key={product.id} className="flex flex-col border border-border bg-card overflow-hidden">
              <div className="relative aspect-[4/5] bg-muted">
                {image ? (
                  <img src={image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <span
                  className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ background: 'var(--site-accent)' }}
                >
                  {product.requires_shipping ? (
                    <><Package className="h-3 w-3" /> Ships to you</>
                  ) : (
                    <><Download className="h-3 w-3" /> Digital download</>
                  )}
                </span>
              </div>
              <div className="flex flex-col flex-1 p-4 gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-base normal-case mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">${price.toFixed(2)}</span>
                    {onSale && (
                      <span className="text-sm text-muted-foreground line-through">${product.price.toFixed(2)}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="text-white"
                    style={{ background: 'var(--site-accent)' }}
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to cart
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="mt-10 border border-border bg-card p-4 cq-sm:p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Your cart ({cartCount})</h3>
          <ul className="divide-y divide-border mb-4">
            {cartLines.map((line) => (
              <li
                key={`${line.item.product_id}-${line.item.variant_id ?? 'base'}`}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{line.product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty {line.item.quantity} · ${(displayPrice(line.product) * line.item.quantity).toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(line.item)}
                  className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold mb-4">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="space-y-1.5">
              <Label htmlFor="merch-buyer-email">Email address</Label>
              <Input
                id="merch-buyer-email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">We'll send your receipt here. No account required.</p>
            </div>

            {needsShipping && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Shipping address</p>
                <Input
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  placeholder="Full name"
                  aria-label="Full name"
                  required
                />
                <Input
                  value={shipping.line1}
                  onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                  placeholder="Address"
                  aria-label="Address"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    placeholder="City"
                    aria-label="City"
                    required
                  />
                  <Input
                    value={shipping.state}
                    onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                    placeholder="State"
                    aria-label="State"
                    required
                  />
                </div>
                <Input
                  value={shipping.postal}
                  onChange={(e) => setShipping({ ...shipping, postal: e.target.value })}
                  placeholder="Postal code"
                  aria-label="Postal code"
                  required
                />
              </div>
            )}
          </div>

          {checkoutError && <p className="text-sm text-destructive mb-3">{checkoutError}</p>}

          <Button
            className="w-full text-white"
            style={{ background: 'var(--site-accent)' }}
            disabled={submitting}
            onClick={handleCheckout}
          >
            {submitting ? 'Redirecting to payment…' : `Checkout · $${subtotal.toFixed(2)}`}
          </Button>
        </div>
      )}
    </section>
  );
}

export const merchBlock: BlockModule<typeof schema> = {
  type: 'merch',
  name: 'Merch Store',
  description: 'Sell apparel, recordings, and gear straight from your landing page.',
  icon: ShoppingBag,
  tier: 'addon',
  // Matches gw_tenant_subscriptions.module_id used by gw_store_list_tenant_products
  // and store-checkout's add-on gate (see 20260707000000_tenant_store.sql).
  requiredAddon: 'store',
  group: 'addon',
  poweredBy: 'Store',
  configSchema: schema,
  defaultConfig: { heading: 'Merch' },
  Render,
};
