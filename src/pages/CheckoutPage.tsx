import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Truck, 
  Lock, 
  ArrowLeft, 
  Mail, 
  User,
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

export const CheckoutPage = () => {
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

  const createOrder = async () => {
    try {
      const orderNumber = `GW-${Date.now()}`;
      
      const { data: order, error: orderError } = await supabase
        .from('gw_user_orders')
        .insert({
          user_id: user?.id || null,
          guest_email: user ? null : form.email,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          shipping_amount: shippingCost,
          currency: 'USD',
          billing_address: {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          },
          shipping_address: form.sameAsBilling ? {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          } : {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.shippingAddress1,
            address_line_2: form.shippingAddress2,
            city: form.shippingCity,
            state: form.shippingState,
            postal_code: form.shippingPostalCode,
            country: form.shippingCountry
          }
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        product_title: item.product.title
      }));

      const { error: itemsError } = await supabase
        .from('gw_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
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