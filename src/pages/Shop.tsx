import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/features/store/cart";
import { ShoppingBag, Package, Download, Music } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

// Row shape returned by the `gw_store_list_products()` RPC (Task 1). This
// is a read-only catalog view — price lives here and ONLY here on the
// client; the cart module never stores it (see src/features/store/cart.ts).
interface StoreProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  requires_shipping: boolean;
  images: string[] | null;
  description: string | null;
}

export const Shop = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin";
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = () => {
    setCartCount(cart.getItems().reduce((sum, item) => sum + item.quantity, 0));
  };

  useEffect(() => {
    refreshCartCount();
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('gw_store_list_products');
      if (cancelled) return;
      if (rpcError) {
        console.error('Error loading store products:', rpcError);
        setError(true);
        setProducts([]);
      } else {
        setProducts((data as StoreProduct[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPrice = (product: StoreProduct) =>
    product.sale_price != null && product.sale_price < product.price
      ? product.sale_price
      : product.price;

  const handleAddToCart = (product: StoreProduct) => {
    cart.addItem({ product_id: product.id, quantity: 1 });
    refreshCartCount();
    toast({
      title: "Added to cart",
      description: `${product.name} was added to your cart.`,
    });
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading store...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {fromAdmin && (
          <div className="bg-muted/60 border-b border-border">
            <div className="container mx-auto px-4 py-2">
              {/* /product-management redirects here now (Phase 5 nav
                  consolidation, 2026-08-09) — point at the live route
                  directly rather than taking the extra redirect hop. */}
              <Link
                to="/dashboard/shop"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:text-link-hover"
              >
                ← Back to Store admin
              </Link>
            </div>
          </div>
        )}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6 sm:py-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Store</h1>
                <p className="text-sm text-muted-foreground">Apparel, accessories, and digital downloads</p>
              </div>
            </div>
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Cart ({cartCount})
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-10">
          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                We couldn't load the store right now. Please try again in a moment.
              </p>
            </div>
          )}

          {!error && products.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No items yet</h3>
              <p className="text-sm text-muted-foreground">Check back soon — new items are on the way.</p>
            </div>
          )}

          {!error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => {
                const price = displayPrice(product);
                const onSale = product.sale_price != null && product.sale_price < product.price;
                const image = product.images?.[0];
                return (
                  <Card key={product.id} className="flex flex-col overflow-hidden">
                    <div className="relative aspect-[4/5] bg-muted">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute top-3 left-3 gap-1"
                      >
                        {product.requires_shipping ? (
                          <>
                            <Package className="h-3 w-3" />
                            Ships to you
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            Digital download
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardContent className="flex flex-col flex-1 p-4 gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base text-foreground mb-1">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-foreground">
                            ${price.toFixed(2)}
                          </span>
                          {onSale && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${product.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleAddToCart(product)}>
                          Add to cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
