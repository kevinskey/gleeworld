import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/features/store/cart";
import {
  Truck,
  Lock,
  ArrowLeft,
  Mail,
  MapPin,
  Package
} from "lucide-react";

interface CartItem {
  product: {
    id: string;
    title: string;
    price: number;
    requires_shipping: boolean;
    weight?: number;
    images: string[];
  };
  quantity: number;
  variant_id?: string | null;
  variant_size?: string | null;
  variant_color?: string | null;
  unit_price?: number;
}

interface ShippingOption {
  id: string;             // EasyPost rate id
  name: string;           // "USPS Priority"
  price: number;          // dollars
  estimatedDays: number;  // 1..N
  description: string;    // free-form (carrier + service)
}

interface CheckoutForm {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  sameAsBilling: boolean;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
}

// This route (`/checkout`) is shared by two independent shopping flows:
//
// 1. GraduatesShop.tsx (legacy) navigates here with `location.state.cartItems`
//    — a full EasyPost-rated, taxed checkout against `gw_user_orders` /
//    `shop-checkout`. That flow is untouched below (`LegacyCheckout`).
// 2. Shop.tsx (Task 5, the GleeWorld Store storefront) uses the
//    localStorage-backed cart in `src/features/store/cart.ts` and has no
//    navigation state to read. Task 6 wires *that* flow to `store-checkout`
//    (`StoreCheckout`, below) — server-resolved pricing, guest checkout
//    allowed, no live shipping-rate shopping (the new backend doesn't do
//    EasyPost rating; it only needs to know whether the cart requires
//    shipping at all).
//
// `CheckoutPage` just decides which one to mount based on how the buyer got
// here, so neither flow's hooks run conditionally inside a single component.
export const CheckoutPage = () => {
  const location = useLocation();
  const legacyCartItems = (location.state as { cartItems?: CartItem[] } | null)?.cartItems;
  if (legacyCartItems && legacyCartItems.length > 0) {
    return <LegacyCheckout />;
  }
  return <StoreCheckout />;
};

const LegacyCheckout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingCost, setShippingCost] = useState(0);
  const [easypostShipmentId, setEasypostShipmentId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [form, setForm] = useState<CheckoutForm>({
    email: user?.email || "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    sameAsBilling: true,
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: "",
    shippingPostalCode: "",
    shippingCountry: "US"
  });

  useEffect(() => {
    // Get cart data from navigation state
    const state = location.state as { cartItems: CartItem[], totalAmount: number };
    if (!state?.cartItems || state.cartItems.length === 0) {
      navigate('/shop');
      return;
    }

    setCartItems(state.cartItems);
    setSubtotal(state.totalAmount);
    // No auto-fetch: the buyer needs to fill out their shipping address
    // first. They click "Get shipping rates" once the address is complete.
  }, [location.state, navigate]);

  const tenantSlug = (typeof window !== 'undefined'
    && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || '';

  const shippingAddressComplete = () => {
    const a = form.sameAsBilling ? {
      street1: form.address1, city: form.city, state: form.state, zip: form.postalCode,
    } : {
      street1: form.shippingAddress1, city: form.shippingCity, state: form.shippingState, zip: form.shippingPostalCode,
    };
    return !!(form.firstName && form.lastName && a.street1 && a.city && a.state && a.zip);
  };

  const getEasyPostRates = async () => {
    if (!shippingAddressComplete()) {
      setShippingError('Fill out the full shipping address first.');
      return;
    }
    setShippingError(null);
    setLoading(true);
    setShippingOptions([]);
    setSelectedShipping('');
    setShippingCost(0);
    setEasypostShipmentId(null);
    try {
      const to = form.sameAsBilling ? {
        name: `${form.firstName} ${form.lastName}`,
        street1: form.address1, street2: form.address2,
        city: form.city, state: form.state, zip: form.postalCode, country: form.country,
        email: form.email,
      } : {
        name: `${form.firstName} ${form.lastName}`,
        street1: form.shippingAddress1, street2: form.shippingAddress2,
        city: form.shippingCity, state: form.shippingState, zip: form.shippingPostalCode, country: form.shippingCountry,
        email: form.email,
      };
      const items = cartItems
        .filter(i => i.product.requires_shipping !== false)
        .map(i => ({ product_id: i.product.id, variant_id: i.variant_id ?? null, quantity: i.quantity }));

      // Digital-only cart: no shipping needed.
      if (items.length === 0) {
        setShippingOptions([{ id: 'digital-only', name: 'Digital delivery', price: 0, estimatedDays: 0, description: 'Email link after payment' }]);
        setSelectedShipping('digital-only');
        setShippingCost(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('easypost-rates', {
        body: { items, to },
        headers: tenantSlug ? { 'x-tenant-slug': tenantSlug } : {},
      });

      if (error) throw new Error(error.message || 'easypost-rates failed');
      if (data?.error) throw new Error(data.message || data.error);

      type EasyPostRate = {
        id: string; carrier: string; service: string;
        rate_cents: number; delivery_days: number | null;
      };
      const rates: EasyPostRate[] = data?.rates ?? [];
      if (rates.length === 0) {
        setShippingError('No shipping rates returned for this address.');
        return;
      }

      const mapped: ShippingOption[] = rates
        .slice()
        .sort((a, b) => a.rate_cents - b.rate_cents)
        .map(r => ({
          id: r.id,
          name: `${r.carrier} ${r.service}`,
          price: r.rate_cents / 100,
          estimatedDays: r.delivery_days ?? 0,
          description: `${r.carrier} · ${r.service}`,
        }));

      setShippingOptions(mapped);
      setEasypostShipmentId(data.shipment_id ?? null);
      // Pre-select the cheapest by default.
      setSelectedShipping(mapped[0].id);
      setShippingCost(mapped[0].price);
    } catch (e: any) {
      const msg = e?.message || 'Unable to get rates from EasyPost.';
      setShippingError(msg);
      toast({ title: 'Shipping rates unavailable', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Calculate tax (8.75% for Atlanta, GA)
    const taxRate = form.state === 'GA' ? 0.0875 : 0.08;
    const taxAmount = subtotal * taxRate;
    setTax(taxAmount);
    setTotal(subtotal + shippingCost + taxAmount);
  }, [subtotal, shippingCost, form.state]);

  const handleShippingChange = (shippingId: string) => {
    const option = shippingOptions.find(opt => opt.id === shippingId);
    if (option) {
      setSelectedShipping(shippingId);
      setShippingCost(option.price);
    }
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setProcessingPayment(true);

    try {
      // Prepare cart items for Stripe checkout — include variant info so
      // the order items table can reference the picked size/color.
      const checkoutItems = cartItems.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant_id ?? null,
        variant_size: item.variant_size ?? null,
        variant_color: item.variant_color ?? null,
        title: [item.product.title, item.variant_size, item.variant_color].filter(Boolean).join(' · '),
        price: item.unit_price ?? item.product.price,
        quantity: item.quantity,
        requires_shipping: item.product.requires_shipping,
        image: item.product.images?.[0]
      }));

      const shippingAddress = form.sameAsBilling ? {
        name: `${form.firstName} ${form.lastName}`,
        street1: form.address1,
        street2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.postalCode,
        country: form.country
      } : {
        name: `${form.firstName} ${form.lastName}`,
        street1: form.shippingAddress1,
        street2: form.shippingAddress2,
        city: form.shippingCity,
        state: form.shippingState,
        zip: form.shippingPostalCode,
        country: form.shippingCountry
      };

      // Call Stripe checkout edge function. We pass the EasyPost
      // shipment + rate ids so the downstream label-buy step can target
      // the exact rate the buyer picked — without re-rating the package.
      const { data, error: checkoutError } = await supabase.functions.invoke('shop-checkout', {
        body: {
          items: checkoutItems,
          customer_email: form.email,
          customer_name: `${form.firstName} ${form.lastName}`,
          shipping_address: shippingAddress,
          shipping_cost: shippingCost,
          tax_amount: tax,
          easypost_shipment_id: easypostShipmentId,
          easypost_rate_id: selectedShipping,
          shipping_carrier_service: shippingOptions.find(o => o.id === selectedShipping)?.name ?? null,
        }
      });

      if (checkoutError) throw checkoutError;
      if (data.error) throw new Error(data.error);

      // Clear cart before redirect
      localStorage.removeItem('gleeworld-cart');

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "There was an error starting checkout.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const validateForm = () => {
    if (!form.email || !form.firstName || !form.lastName || !form.address1 || !form.city || !form.state || !form.postalCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return false;
    }

    // Skip the rate check entirely when nothing in the cart needs to
    // ship (digital-only orders).
    const physicalItems = cartItems.some(i => i.product.requires_shipping !== false);
    if (physicalItems && !selectedShipping) {
      toast({
        title: "Shipping rate required",
        description: shippingOptions.length === 0
          ? 'Click "Get shipping rates" above to pick a shipping option.'
          : 'Please select a shipping option.',
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/shop')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Forms */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!!user}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address1">Address Line 1</Label>
                  <Input
                    id="address1"
                    value={form.address1}
                    onChange={(e) => setForm({ ...form, address1: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    value={form.address2}
                    onChange={(e) => setForm({ ...form, address2: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select value={form.state} onValueChange={(value) => setForm({ ...form, state: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={form.country} onValueChange={(value) => setForm({ ...form, country: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Options — live rates from EasyPost. The buyer
                clicks "Get rates" once the address is complete; we cache
                the EasyPost shipment id so the admin can buy the label
                against this same shipment after payment. */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getEasyPostRates}
                    disabled={loading || !shippingAddressComplete()}
                  >
                    {loading ? 'Getting rates…' : shippingOptions.length > 0 ? 'Refresh rates' : 'Get shipping rates'}
                  </Button>
                  {!shippingAddressComplete() && (
                    <span className="text-xs text-muted-foreground">Fill out the full shipping address to see live rates.</span>
                  )}
                </div>
                {shippingError && (
                  <p className="text-sm text-destructive">{shippingError}</p>
                )}
                {shippingOptions.length > 0 && (
                  <div className="space-y-2">
                    {shippingOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedShipping === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => handleShippingChange(option.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{option.name}</div>
                            {option.estimatedDays > 0 && (
                              <div className="text-sm text-gray-500">
                                Estimated delivery: {option.estimatedDays} business day{option.estimatedDays !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          <div className="font-bold">
                            {option.price === 0 ? 'FREE' : `$${option.price.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items — variant axes (size / color) get their
                    own small line under the product title so the buyer
                    can confirm they picked the right combination. */}
                <div className="space-y-3">
                  {cartItems.map((item, idx) => {
                    const variantBits = [item.variant_size, item.variant_color]
                      .filter(Boolean)
                      .join(' / ');
                    const linePrice = (item.unit_price ?? item.product.price) * item.quantity;
                    return (
                      <div key={`${item.product.id}-${item.variant_id ?? 'base'}-${idx}`} className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={item.product.images?.[0]}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product.title}</div>
                          {variantBits && (
                            <div className="text-xs text-gray-500 mt-0.5">{variantBits}</div>
                          )}
                          <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                          <div className="font-medium">${linePrice.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={
                    processingPayment
                    || loading
                    || (cartItems.some(i => i.product.requires_shipping !== false) && !selectedShipping)
                  }
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {processingPayment
                    ? 'Processing…'
                    : (cartItems.some(i => i.product.requires_shipping !== false) && !selectedShipping)
                      ? 'Pick a shipping rate first'
                      : `Pay $${total.toFixed(2)}`}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  Your payment information is secure and encrypted
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

// ---------------------------------------------------------------------------
// GleeWorld Store checkout (Task 6). Cart lives in localStorage
// (src/features/store/cart.ts) — never a price, only
// { product_id, variant_id, quantity }. We re-fetch the public catalog to
// display names/images/prices, but the actual charge amount is always
// resolved server-side inside `store-checkout` from `gw_products`. Guest
// checkout is allowed — no login required.
// ---------------------------------------------------------------------------

interface StoreCatalogProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  requires_shipping: boolean;
  images: string[] | null;
}

interface ShippingFields {
  name: string;
  line1: string;
  city: string;
  state: string;
  postal: string;
}

const StoreCheckout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [lines, setLines] = useState<{ productId: string; quantity: number; product: StoreCatalogProduct | null }[]>([]);
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
  const [shipping, setShipping] = useState<ShippingFields>({ name: "", line1: "", city: "", state: "", postal: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const items = cart.getItems();
    if (items.length === 0) {
      navigate('/shop');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('gw_store_list_products');
      if (cancelled) return;
      if (error) {
        console.error('Error loading store catalog for checkout:', error);
      }
      const catalog: StoreCatalogProduct[] = (data as StoreCatalogProduct[]) || [];
      const byId = new Map(catalog.map((p) => [p.id, p]));
      setLines(items.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: byId.get(item.product_id) ?? null,
      })));
      setLoadingCatalog(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const displayPrice = (p: StoreCatalogProduct) =>
    p.sale_price != null && p.sale_price < p.price ? p.sale_price : p.price;

  const subtotal = lines.reduce(
    (sum, line) => sum + (line.product ? displayPrice(line.product) * line.quantity : 0),
    0,
  );
  const needsShipping = lines.some((line) => line.product?.requires_shipping);
  const hasUnavailable = lines.some((line) => !line.product);

  const handlePay = async () => {
    if (!buyerEmail || !buyerEmail.includes('@')) {
      toast({ title: "Email required", description: "Enter a valid email to receive your receipt.", variant: "destructive" });
      return;
    }
    if (needsShipping && (!shipping.name || !shipping.line1 || !shipping.city || !shipping.state || !shipping.postal)) {
      toast({ title: "Shipping address required", description: "Fill out the shipping address for the physical items in your cart.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-checkout', {
        body: {
          store_type: 'gleeworld',
          items: cart.getItems(),
          buyer_email: buyerEmail,
          ...(needsShipping ? { shipping_address: shipping } : {}),
        },
      });

      if (error) throw new Error(error.message || 'Checkout failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No checkout URL received');

      // Cart is cleared on /shop/success once the order is confirmed
      // 'paid' — not here, so a failed/abandoned Stripe session leaves the
      // cart intact for the buyer to try again.
      window.location.href = data.url;
    } catch (e: any) {
      toast({
        title: "Checkout failed",
        description: e?.message || "There was an error starting checkout.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loadingCatalog) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading checkout…</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/shop')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to shop
          </Button>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Checkout</h1>
        </div>

        {hasUnavailable && (
          <div className="mb-6 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            One or more items in your cart are no longer available and will be skipped at checkout.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  Contact information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="buyer-email">Email address</Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={!!user}
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll send your receipt and order updates here. No account required.
                  </p>
                </div>
              </CardContent>
            </Card>

            {needsShipping && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
                    Shipping address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ship-name">Full name</Label>
                    <Input
                      id="ship-name"
                      value={shipping.name}
                      onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ship-line1">Address</Label>
                    <Input
                      id="ship-line1"
                      value={shipping.line1}
                      onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ship-city">City</Label>
                      <Input
                        id="ship-city"
                        value={shipping.city}
                        onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ship-state">State</Label>
                      <Input
                        id="ship-state"
                        value={shipping.state}
                        onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ship-postal">Postal code</Label>
                    <Input
                      id="ship-postal"
                      value={shipping.postal}
                      onChange={(e) => setShipping({ ...shipping, postal: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Order summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={`${line.productId}-${idx}`} className="flex gap-3">
                      <div className="w-14 h-14 bg-muted overflow-hidden shrink-0">
                        {line.product?.images?.[0] && (
                          <img
                            src={line.product.images[0]}
                            alt={line.product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {line.product?.name ?? 'Item no longer available'}
                        </div>
                        <div className="text-sm text-muted-foreground">Qty: {line.quantity}</div>
                        {line.product && (
                          <div className="font-medium text-sm text-foreground">
                            ${(displayPrice(line.product) * line.quantity).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Final total (including any shipping) is calculated at checkout.
                </p>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={submitting || lines.every((l) => !l.product)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {submitting ? 'Redirecting to payment…' : 'Continue to payment'}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  Your payment is processed securely by Stripe.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
