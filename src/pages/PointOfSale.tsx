import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  QrCode,
  Package,
  Loader2,
  X,
  DollarSign,
  Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  inventory_quantity: number | null;
  product_type: string | null;
  is_active: boolean | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const PointOfSale = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_products')
      .select('id, title, price, images, inventory_quantity, product_type, is_active')
      .eq('is_active', true)
      .order('title');
    if (error) {
      toast({ title: 'Error loading products', description: error.message, variant: 'destructive' });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.product_type).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      filtered = filtered.filter(p => p.product_type === categoryFilter);
    }
    return filtered;
  }, [products, searchQuery, categoryFilter]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pos-create-payment-link', {
        body: {
          cartItems: cart.map(item => ({
            product: {
              title: item.product.title,
              price: item.product.price,
              description: `${item.product.product_type || 'Merch'}`,
              images: item.product.images || [],
            },
            quantity: item.quantity,
          })),
        },
      });

      if (error) throw error;
      if (data?.url) {
        setPaymentUrl(data.url);
        setShowQR(true);
      }
    } catch (err: any) {
      toast({
        title: 'Checkout failed',
        description: err.message || 'Unable to create payment link',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setShowQR(false);
    setPaymentUrl(null);
    clearCart();
    toast({ title: 'Sale recorded!', description: 'Cart cleared for next customer.' });
    fetchProducts(); // refresh inventory
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0 && product.images[0]) {
      return product.images[0];
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="bg-[#003666] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6" />
          <h1 className="text-xl font-bold">GleeWorld POS</h1>
        </div>
        <div className="flex items-center gap-2 text-sm opacity-80">
          <ShoppingCart className="w-4 h-4" />
          <span>{itemCount} items</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Product grid – left side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + filters */}
          <div className="p-3 space-y-2 shrink-0 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-card text-base"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <Badge
                  variant={categoryFilter === null ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                </Badge>
                {categories.map(cat => (
                  <Badge
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Package className="w-10 h-10 mb-2" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map(product => {
                  const img = getProductImage(product);
                  const inCart = cart.find(c => c.product.id === product.id);
                  const outOfStock =
                    product.inventory_quantity !== null && product.inventory_quantity <= 0;
                  return (
                    <Card
                      key={product.id}
                      className={`cursor-pointer transition-all active:scale-95 ${
                        outOfStock ? 'opacity-50 pointer-events-none' : ''
                      } ${inCart ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => !outOfStock && addToCart(product)}
                    >
                      <CardContent className="p-2">
                        <div className="aspect-square rounded-md bg-muted mb-2 overflow-hidden relative">
                          {img ? (
                            <img
                              src={img}
                              alt={product.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tag className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                          {inCart && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              {inCart.quantity}
                            </div>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <span className="text-xs font-bold text-destructive">SOLD OUT</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          {product.title}
                        </p>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          ${product.price.toFixed(2)}
                        </p>
                        {product.inventory_quantity !== null && (
                          <p className="text-[10px] text-muted-foreground">
                            {product.inventory_quantity} left
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart – right side */}
        <div className="w-[320px] lg:w-[380px] bg-card border-l border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Cart ({itemCount})
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs">
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Tap a product to add</p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-bold w-16 text-right shrink-0">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Totals + checkout */}
          <div className="p-3 border-t border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-14 text-lg font-bold gap-2"
              disabled={cart.length === 0 || checkoutLoading}
              onClick={handleCheckout}
            >
              {checkoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Charge ${subtotal.toFixed(2)}
                </>
              )}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Customer pays via QR code or link
            </p>
          </div>
        </div>
      </div>

      {/* QR / Payment Link Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-xl">Customer Payment</DialogTitle>
            <DialogDescription>
              Have the customer scan the QR code or tap the link to pay
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-3xl font-bold text-primary">
              ${subtotal.toFixed(2)}
            </div>

            {paymentUrl && (
              <>
                {/* QR Code using a simple API */}
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}`}
                    alt="Payment QR Code"
                    className="w-56 h-56 rounded-lg border border-border"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Or share the link directly:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentUrl);
                    toast({ title: 'Link copied!' });
                  }}
                >
                  Copy Payment Link
                </Button>
              </>
            )}

            <Separator />

            <Button
              className="w-full"
              variant="default"
              onClick={handlePaymentComplete}
            >
              Payment Received — Next Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PointOfSale;
