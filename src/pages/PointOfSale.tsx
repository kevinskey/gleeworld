import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Tag,
  Truck,
  MapPin,
  Settings,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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
  shipToCustomer: boolean;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
}

export const PointOfSale = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
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
      return [...prev, { product, quantity: 1, shipToCustomer: false }];
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

  const toggleShipToCustomer = (productId: string) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, shipToCustomer: !item.shipToCustomer }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasShippingItems = cart.some(item => item.shipToCustomer);

  const handleCheckout = async (mode: 'customer_fills' | 'staff_entered') => {
    if (cart.length === 0) return;

    if (mode === 'staff_entered' && hasShippingItems) {
      if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postal_code) {
        toast({ title: 'Missing address', description: 'Please fill in all required shipping fields.', variant: 'destructive' });
        return;
      }
    }

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
            shipToCustomer: item.shipToCustomer,
          })),
          requiresShipping: hasShippingItems,
          shippingMode: mode,
          shippingAddress: mode === 'staff_entered' ? shippingAddress : undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        setPaymentUrl(data.url);
        setShowQR(true);
        setShowShippingForm(false);
        setShowMobileCart(false);
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
    setShippingAddress({ name: '', line1: '', line2: '', city: '', state: '', postal_code: '' });
    toast({ title: 'Sale recorded!', description: 'Cart cleared for next customer.' });
    fetchProducts();
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0 && product.images[0]) {
      return product.images[0];
    }
    return null;
  };

  const handleChargeClick = () => {
    if (!hasShippingItems) {
      handleCheckout('customer_fills');
    } else {
      setShowShippingForm(true);
    }
  };

  // Shared cart items renderer
  const renderCartItems = () => (
    <div className="space-y-2">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Tap a product to add</p>
        </div>
      ) : (
        cart.map(item => (
          <div
            key={item.product.id}
            className="p-2 rounded-lg bg-muted/50 space-y-1.5"
          >
            <div className="flex items-center gap-2">
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
            {/* Ship to Customer toggle */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleShipToCustomer(item.product.id);
              }}
            >
              <Switch
                checked={item.shipToCustomer}
                onCheckedChange={() => toggleShipToCustomer(item.product.id)}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Ship to customer
              </span>
              {item.shipToCustomer && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Ships later
                </Badge>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Shared checkout footer
  const renderCheckoutFooter = () => (
    <div className="space-y-3">
      {hasShippingItems && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5">
          <Truck className="w-3.5 h-3.5 shrink-0" />
          <span>{cart.filter(i => i.shipToCustomer).length} item(s) will ship after tour</span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
      </div>
      <Button
        className="w-full h-14 text-lg font-bold gap-2"
        disabled={cart.length === 0 || checkoutLoading}
        onClick={handleChargeClick}
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
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="bg-[#003666] text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          <h1 className="text-lg sm:text-xl font-bold">GleeWorld POS</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/products')}
            className="text-white/80 hover:text-white hover:bg-white/10 text-xs sm:text-sm hidden sm:flex"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Manage Products
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/products')}
            className="text-white/80 hover:text-white hover:bg-white/10 sm:hidden h-8 w-8"
          >
            <Settings className="w-4 h-4" />
          </Button>
          {/* Desktop cart count */}
          {!isMobile && (
            <div className="flex items-center gap-2 text-sm opacity-80">
              <ShoppingCart className="w-4 h-4" />
              <span>{itemCount} items</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Product grid */}
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
          <div className={cn("flex-1 overflow-y-auto p-3", isMobile && itemCount > 0 && "pb-24")}>
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

        {/* Desktop Cart – right side (hidden on mobile) */}
        {!isMobile && (
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

            <div className="flex-1 overflow-y-auto p-3">
              {renderCartItems()}
            </div>

            {/* Totals + checkout */}
            <div className="p-3 border-t border-border">
              {renderCheckoutFooter()}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Floating cart bar at bottom */}
      {isMobile && itemCount > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="fixed bottom-0 left-0 right-0 z-[99998] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-2xl"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Mobile Cart Sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart ({itemCount})
              </SheetTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs">
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {renderCartItems()}
          </div>

          <div className="p-4 border-t border-border bg-card">
            {renderCheckoutFooter()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Shipping Method Dialog */}
      <Dialog open={showShippingForm} onOpenChange={setShowShippingForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping Details
            </DialogTitle>
            <DialogDescription>
              Some items will ship to the customer after the tour. Choose how to collect the address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Option 1: Customer fills via Stripe */}
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleCheckout('customer_fills')}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Customer enters address</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customer fills in their shipping address on the Stripe checkout page after scanning the QR code.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Option 2: Staff enters address */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Enter address for customer</p>
              </div>
              <div className="grid gap-2">
                <Input
                  placeholder="Customer name *"
                  value={shippingAddress.name}
                  onChange={e => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Street address *"
                  value={shippingAddress.line1}
                  onChange={e => setShippingAddress(prev => ({ ...prev, line1: e.target.value }))}
                />
                <Input
                  placeholder="Apt, suite, etc."
                  value={shippingAddress.line2}
                  onChange={e => setShippingAddress(prev => ({ ...prev, line2: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="City *"
                    value={shippingAddress.city}
                    onChange={e => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                  />
                  <Input
                    placeholder="State *"
                    value={shippingAddress.state}
                    onChange={e => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                  />
                  <Input
                    placeholder="ZIP *"
                    value={shippingAddress.postal_code}
                    onChange={e => setShippingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="w-full gap-2"
                disabled={checkoutLoading}
                onClick={() => handleCheckout('staff_entered')}
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Generate Payment QR
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}`}
                    alt="Payment QR Code"
                    className="w-44 h-44 sm:w-56 sm:h-56 rounded-lg border border-border"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Or share the link directly:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
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
                  {isMobile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ url: paymentUrl, title: 'GleeWorld Payment' });
                        } else {
                          window.open(paymentUrl, '_blank');
                        }
                      }}
                    >
                      Share Link
                    </Button>
                  )}
                </div>
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
