import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  ArrowLeft, 
  ShoppingBag,
  Truck,
  CheckCircle,
  Loader2,
  Package
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItem {
  product: {
    id: string;
    title: string;
    price: number;
    images?: string[];
    description?: string;
  };
  quantity: number;
}

interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  delivery_days: number;
  est_delivery_date: string;
}

interface ShippingAddress {
  name: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" }
];

// Glee Club shipping origin (Atlanta, GA)
const FROM_ADDRESS = {
  name: "Spelman College Glee Club",
  street1: "350 Spelman Lane SW",
  city: "Atlanta",
  state: "GA",
  zip: "30314",
  country: "US",
  phone: "4046815000"
};

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  
  const [customerInfo, setCustomerInfo] = useState({
    email: "",
    name: "",
  });

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
  });

  const cartItems: CartItem[] = location.state?.cartItems || [];

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/shop');
    }
  }, [cartItems, navigate]);

  // Sync shipping name with customer name
  useEffect(() => {
    if (customerInfo.name && !shippingAddress.name) {
      setShippingAddress(prev => ({ ...prev, name: customerInfo.name }));
    }
  }, [customerInfo.name]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shippingCost = selectedRate?.rate ?? 0;
  const total = subtotal + shippingCost;

  // Calculate estimated package weight (assume 8oz per item)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedWeight = Math.max(totalItems * 8, 8); // minimum 8oz

  const fetchShippingRates = async () => {
    if (!shippingAddress.street1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      toast({
        title: "Missing Address",
        description: "Please fill in your complete shipping address.",
        variant: "destructive"
      });
      return;
    }

    setLoadingRates(true);
    setShippingRates([]);
    setSelectedRate(null);

    try {
      const { data, error } = await supabase.functions.invoke('easypost-rates', {
        body: {
          action: 'get_rates',
          fromAddress: FROM_ADDRESS,
          toAddress: {
            name: shippingAddress.name || customerInfo.name,
            street1: shippingAddress.street1,
            street2: shippingAddress.street2 || undefined,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone || undefined,
            email: customerInfo.email,
          },
          parcel: {
            length: 12,
            width: 9,
            height: 4,
            weight: estimatedWeight,
          }
        }
      });

      if (error) throw error;

      if (data.rates && data.rates.length > 0) {
        setShippingRates(data.rates);
        setShipmentId(data.shipment_id);
        // Auto-select cheapest rate
        setSelectedRate(data.rates[0]);
      } else {
        toast({
          title: "No Rates Available",
          description: "No shipping rates found for this address. Please verify your address.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: "Rate Lookup Failed",
        description: error.message || "Failed to get shipping rates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCheckout = async () => {
    if (!customerInfo.email || !customerInfo.name) {
      toast({
        title: "Missing Information",
        description: "Please provide your email and name.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedRate) {
      toast({
        title: "Select Shipping",
        description: "Please select a shipping method.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          cartItems,
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
          shippingRate: selectedRate,
          shippingAddress,
          shipmentId,
        }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isAddressComplete = shippingAddress.street1 && shippingAddress.city && shippingAddress.state && shippingAddress.zip;

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/shop')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer & Shipping Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>We'll use this to send you order confirmation and updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
                <CardDescription>Enter your shipping address to see available rates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street1">Street Address</Label>
                  <Input
                    id="street1"
                    value={shippingAddress.street1}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street1: e.target.value }))}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="street2">Apartment, Suite, etc. (optional)</Label>
                  <Input
                    id="street2"
                    value={shippingAddress.street2}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street2: e.target.value }))}
                    placeholder="Apt 4B"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={shippingAddress.state}
                      onValueChange={(value) => setShippingAddress(prev => ({ ...prev, state: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={shippingAddress.zip}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
                      placeholder="12345"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <Button 
                  onClick={fetchShippingRates} 
                  disabled={!isAddressComplete || loadingRates}
                  variant="secondary"
                  className="w-full"
                >
                  {loadingRates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting Rates...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Get Shipping Rates
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Shipping Rates Selection */}
            {shippingRates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Select Shipping Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedRate?.id || ""}
                    onValueChange={(value) => {
                      const rate = shippingRates.find(r => r.id === value);
                      if (rate) setSelectedRate(rate);
                    }}
                    className="space-y-3"
                  >
                    {shippingRates.slice(0, 5).map((rate) => (
                      <div
                        key={rate.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRate?.id === rate.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedRate(rate)}
                      >
                        <RadioGroupItem value={rate.id} id={rate.id} />
                        <div className="flex-1">
                          <Label htmlFor={rate.id} className="cursor-pointer font-medium">
                            {rate.carrier} - {rate.service}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {rate.delivery_days 
                              ? `${rate.delivery_days} business day${rate.delivery_days > 1 ? 's' : ''}` 
                              : 'Estimated delivery varies'}
                          </p>
                        </div>
                        <span className="font-bold text-lg">
                          ${rate.rate.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {item.product.images?.[0] ? (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.product.title}</h4>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>
                      {selectedRate 
                        ? `$${shippingCost.toFixed(2)}` 
                        : <span className="text-muted-foreground">Enter address for rates</span>
                      }
                    </span>
                  </div>
                  {selectedRate && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRate.carrier} {selectedRate.service}
                    </p>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCheckout} 
              disabled={loading || !customerInfo.email || !customerInfo.name || !selectedRate}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating checkout...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              You'll be redirected to Stripe's secure checkout to complete your payment.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
