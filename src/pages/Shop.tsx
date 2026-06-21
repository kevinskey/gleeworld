import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Heart, Plus, Minus, ShoppingBag, CreditCard, Music, Shirt, FileMusic, Sparkles, ArrowRight, ArrowLeft, Package } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type React from "react";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";
import { tenantAuthGradient } from "@/lib/tenantGradient";

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};
interface ProductVariant {
  id: string;
  size: string | null;   // option1
  color: string | null;  // option2
  sku: string | null;
  price: number;
  inventory_quantity: number;
}
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  product_type: string;
  images: string[];
  inventory_quantity: number;
  tags: string[];
  requires_shipping: boolean;
  weight?: number;
  weight_oz?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
  variants?: ProductVariant[];
}
interface CartItem {
  product: Product;
  quantity: number;
}
const CATEGORIES = [{
  value: "all",
  label: "All",
  icon: Sparkles
}, {
  value: "apparel",
  label: "Clothing",
  icon: Shirt
}, {
  value: "accessories",
  label: "Accessories",
  icon: Package
}, {
  value: "digital",
  label: "Sheet Music",
  icon: FileMusic
}];
export const Shop = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  // Branded header — pulls the tenant's logo, name, and gradient so the
  // boutique matches whatever org the user belongs to instead of always
  // showing the platform default. Falls back gracefully when branding
  // hasn't been customized.
  const { settings: branding } = useBrandingSettings();
  const tenantName = branding.short_name || branding.org_name || 'Boutique';
  const tenantLogo = branding.logo_url;
  const headerBg = tenantAuthGradient(branding.primary_color);
  // ?from=admin is set by the "View public store" button on the Store
  // admin so we know to surface a quick way back into the backend.
  const [searchParams] = useSearchParams();
  const fromAdmin = searchParams.get('from') === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  // Per-card variant picker state. Keys are productId; values are the
  // user's currently-picked size/color tuple. We resolve those to a
  // concrete variant id at add-to-cart time.
  const [pickedSize, setPickedSize] = useState<Record<string, string>>({});
  const [pickedColor, setPickedColor] = useState<Record<string, string>>({});

  const resolveVariantId = (product: Product): string | null => {
    if (!product.variants || product.variants.length === 0) return null;
    const size = pickedSize[product.id] || '';
    const color = pickedColor[product.id] || '';
    const sizes = Array.from(new Set(product.variants.map(v => v.size).filter(Boolean) as string[]));
    const colors = Array.from(new Set(product.variants.map(v => v.color).filter(Boolean) as string[]));
    if (sizes.length > 0 && !size) return null;
    if (colors.length > 0 && !color) return null;
    return product.variants.find(v =>
      (v.size ?? '') === size && (v.color ?? '') === color
    )?.id ?? null;
  };
  useEffect(() => {
    loadProducts();
    loadCartFromStorage();
  }, []);
  const loadProducts = async () => {
    // Single canonical source: gw_products joined with gw_product_images
    // + gw_product_categories. Whatever the admin curates from the Store
    // backend is what shoppers see. Empty store stays empty — no mock
    // fallback (the admin can build their catalogue from the backend).
    try {
      const { data, error } = await supabase
        .from('gw_products')
        .select(`
          id, title, name, description, short_description, price, sale_price,
          product_type, inventory_quantity, stock_quantity, tags, images,
          requires_shipping, is_active, weight_oz, length_in, width_in, height_in,
          category:gw_product_categories(name, slug),
          gallery:gw_product_images(image_url, is_primary, sort_order),
          variants:gw_product_variants(id, option1, option2, sku, price, inventory_quantity)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped: Product[] = (data || []).map((r: any) => {
        // Prefer the structured gw_product_images gallery; fall back to
        // the legacy text[] images column on gw_products.
        const galleryImgs = (r.gallery || [])
          .slice()
          .sort((a: any, b: any) =>
            b.is_primary === a.is_primary
              ? (a.sort_order ?? 0) - (b.sort_order ?? 0)
              : (b.is_primary ? 1 : -1)
          )
          .map((i: any) => i.image_url)
          .filter(Boolean);
        const imgs = galleryImgs.length > 0 ? galleryImgs : (r.images || []);

        // Map admin's category to one of the storefront filter buckets.
        const categorySlug = (r.category?.slug || '').toLowerCase();
        const productType = r.product_type
          || (categorySlug.includes('apparel') || categorySlug.includes('shirt') || categorySlug.includes('hoodie')
            ? 'apparel'
            : categorySlug.includes('digital') || categorySlug.includes('music') || categorySlug.includes('pdf')
              ? 'digital'
              : 'accessories');

        const variants: ProductVariant[] = (r.variants || []).map((v: any) => ({
          id: v.id,
          size: v.option1,
          color: v.option2,
          sku: v.sku,
          price: Number(v.price ?? r.price ?? 0),
          inventory_quantity: v.inventory_quantity ?? 0,
        }));

        return {
          id: r.id,
          title: r.name || r.title || '',
          description: r.description || r.short_description || '',
          price: Number(r.sale_price ?? r.price ?? 0),
          product_type: productType,
          images: imgs.length > 0 ? imgs : [],
          inventory_quantity: r.stock_quantity ?? r.inventory_quantity ?? 0,
          tags: r.tags || [],
          requires_shipping: r.requires_shipping ?? (productType !== 'digital'),
          weight_oz: r.weight_oz ?? undefined,
          length_in: r.length_in ?? undefined,
          width_in: r.width_in ?? undefined,
          height_in: r.height_in ?? undefined,
          variants,
        };
      });

      setProducts(mapped);
      setFilteredProducts(mapped);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };
  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('gleeworld-cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  };
  const saveCartToStorage = (cart: {
    [key: string]: number;
  }) => {
    localStorage.setItem('gleeworld-cart', JSON.stringify(cart));
  };
  useEffect(() => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.product_type === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(product => product.title.toLowerCase().includes(searchQuery.toLowerCase()) || product.description?.toLowerCase().includes(searchQuery.toLowerCase()) || product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);
  // Cart key format: "productId|variantId" (variantId blank for products
  // with no variants). Encoding both pieces in one string keeps the
  // existing { [key]: quantity } shape intact while letting us round-trip
  // the variant selection to checkout.
  const cartKey = (productId: string, variantId?: string | null) => `${productId}|${variantId || ''}`;
  const parseCartKey = (key: string): { productId: string; variantId: string | null } => {
    const [productId, variantId] = key.split('|');
    return { productId, variantId: variantId || null };
  };
  const findVariant = (product: Product, variantId: string | null) =>
    variantId ? product.variants?.find(v => v.id === variantId) ?? null : null;
  const lineQuantityAvailable = (product: Product, variantId: string | null) => {
    const v = findVariant(product, variantId);
    return v ? v.inventory_quantity : product.inventory_quantity;
  };
  const lineUnitPrice = (product: Product, variantId: string | null) => {
    const v = findVariant(product, variantId);
    return v && v.price > 0 ? v.price : product.price;
  };

  const addToCart = (productId: string, variantId: string | null = null) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const key = cartKey(productId, variantId);
    const currentQuantity = cartItems[key] || 0;
    if (currentQuantity >= lineQuantityAvailable(product, variantId)) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock.",
        variant: "destructive"
      });
      return;
    }
    const newCart = {
      ...cartItems,
      [key]: currentQuantity + 1
    };
    setCartItems(newCart);
    saveCartToStorage(newCart);
    const variant = findVariant(product, variantId);
    const variantLabel = variant
      ? [variant.size, variant.color].filter(Boolean).join(' / ')
      : '';
    toast({
      title: "Added to Cart",
      description: `${product.title}${variantLabel ? ` (${variantLabel})` : ''} added to your cart.`
    });
  };
  const removeFromCart = (productId: string, variantId: string | null = null) => {
    const key = cartKey(productId, variantId);
    const newCart = {
      ...cartItems
    };
    if (newCart[key] > 1) {
      newCart[key]--;
    } else {
      delete newCart[key];
    }
    setCartItems(newCart);
    saveCartToStorage(newCart);
  };
  const getTotalItems = () => {
    return Object.values(cartItems).reduce((sum, quantity) => sum + quantity, 0);
  };
  const getTotalPrice = () => {
    return Object.entries(cartItems).reduce((total, [key, quantity]) => {
      const { productId, variantId } = parseCartKey(key);
      const product = products.find(p => p.id === productId);
      return total + (product ? lineUnitPrice(product, variantId) * quantity : 0);
    }, 0);
  };
  const getCartItems = (): CartItem[] => {
    return Object.entries(cartItems).map(([key, quantity]) => {
      const { productId } = parseCartKey(key);
      const product = products.find(p => p.id === productId);
      return {
        product: product!,
        quantity
      };
    }).filter(item => item.product);
  };
  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout.",
        variant: "destructive"
      });
      return;
    }
    navigate('/checkout', {
      state: {
        cartItems: getCartItems(),
        totalAmount: getTotalPrice()
      }
    });
  };
  const getProductImage = (product: Product) => {
    return product.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
  };
  if (loading) {
    return <PublicLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-2 border-muted border-t-foreground rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground tracking-wide">Loading boutique...</p>
          </div>
        </div>
      </PublicLayout>;
  }
  return <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header Banner — tenant-branded. Logo and short name come from
            gw_branding_settings; the dark-gradient backdrop is derived
            from the tenant's primary color. */}
        <div className="w-full py-4 sm:py-5 relative" style={{ background: headerBg }}>
          <Link
            to="/"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          {/* Came from the Store admin — surface a quick way back so the
              admin can keep curating without having to re-navigate the
              dashboard sidebar. */}
          {fromAdmin && (
            <Link
              to="/dashboard/shop"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Store admin</span>
            </Link>
          )}
          <div className="container mx-auto px-4 flex items-center justify-center">
            <div>
              <div className="flex items-center justify-center gap-3">
                {tenantLogo ? (
                  <img
                    src={tenantLogo}
                    alt={`${tenantName} logo`}
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded bg-white/10 p-0.5"
                  />
                ) : (
                  <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                )}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-center">
                  {tenantName} Store
                </h1>
              </div>
              <p className="text-white/80 text-center mt-1 text-sm max-w-xl mx-auto">
                Curated accessories, apparel & digital sheet music
              </p>
            </div>
          </div>
        </div>

        {/* Boutique Filter Section - Compact for iPad */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="max-w-3xl mx-auto">
              {/* Category Pills */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
                {CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.value;
                return <button key={category.value} onClick={() => setSelectedCategory(category.value)} className={`
                        group flex items-center gap-2 px-4 py-2 rounded-full
                        transition-all duration-300 ease-out
                        ${isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-card text-foreground hover:bg-muted hover:shadow-md border border-border'}
                      `}>
                      <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>;
              })}
              </div>

              {/* Search Bar */}
              <div className="max-w-md mx-auto relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input placeholder="Search our collection..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-5 bg-card border-border rounded-full text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Summary Bar */}
        {getTotalItems() > 0 && <div className="sticky z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm" style={{ top: 'var(--gw-safe-top)' }}>
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">{getTotalItems()} items</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-lg font-semibold text-foreground">${getTotalPrice().toFixed(2)}</span>
                </div>
                <Button onClick={handleCheckout} className="rounded-full px-6 gap-2 transition-all duration-300 hover:shadow-lg">
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>}

        {/* Products Section - Tighter spacing for iPad */}
        <div className="container mx-auto px-4 py-6 sm:py-10">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {selectedCategory === "all" ? "Our Collection" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{filteredProducts.length} pieces</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Music className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">No items found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or browse all categories.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => {
            setSelectedCategory("all");
            setSearchQuery("");
          }}>
                View All Products
              </Button>
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map(product => <Card key={product.id} className={`${SOFT_CARD} group overflow-hidden transition-all duration-500 ease-out cursor-pointer hover:shadow-xl hover:-translate-y-1`} style={SOFT_CARD_STYLE} onMouseEnter={() => setHoveredProduct(product.id)} onMouseLeave={() => setHoveredProduct(null)}>
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      <img src={getProductImage(product)} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />

                      {/* Overlay gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Wishlist Button */}
                      <button className="absolute top-4 right-4 w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-card hover:scale-110">
                        <Heart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>

                      {/* Quick Add Button */}
                      {(() => {
                        const resolvedVariantId = resolveVariantId(product);
                        const lineKey = cartKey(product.id, resolvedVariantId);
                        const inCart = cartItems[lineKey] || 0;
                        const needsVariantPick = (product.variants && product.variants.length > 0) && !resolvedVariantId;
                        return inCart === 0 ? (
                          <button
                            disabled={needsVariantPick}
                            onClick={e => {
                              e.stopPropagation();
                              if (!needsVariantPick) addToCart(product.id, resolvedVariantId);
                            }}
                            className={`absolute bottom-4 left-4 right-4 py-3 rounded-lg font-medium opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                              needsVariantPick
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                            {needsVariantPick ? 'Pick options below' : 'Add to Cart'}
                          </button>
                        ) : (
                          <div className="absolute bottom-4 left-4 right-4 py-2 bg-primary rounded-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                            <div className="flex items-center justify-between px-4">
                              <button onClick={e => { e.stopPropagation(); removeFromCart(product.id, resolvedVariantId); }} className="w-8 h-8 rounded-full bg-primary/80 hover:bg-primary/70 flex items-center justify-center transition-colors">
                                <Minus className="h-4 w-4 text-primary-foreground" />
                              </button>
                              <span className="font-medium text-primary-foreground">{inCart}</span>
                              <button onClick={e => { e.stopPropagation(); addToCart(product.id, resolvedVariantId); }} className="w-8 h-8 rounded-full bg-card hover:bg-muted flex items-center justify-center transition-colors">
                                <Plus className="h-4 w-4 text-foreground" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Category Badge */}
                      <Badge className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm text-foreground border-0 text-xs font-medium">
                        {CATEGORIES.find(c => c.value === product.product_type)?.label || product.product_type}
                      </Badge>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      {/* Variant pickers — only show when the product
                          actually has variants. Size + Color are
                          rendered as compact pill-style buttons. */}
                      {product.variants && product.variants.length > 0 && (() => {
                        const sizes = Array.from(new Set(product.variants.map(v => v.size).filter(Boolean) as string[]));
                        const colors = Array.from(new Set(product.variants.map(v => v.color).filter(Boolean) as string[]));
                        return (
                          <div className="space-y-2 mb-3">
                            {sizes.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground w-12">Size</span>
                                {sizes.map(s => (
                                  <button
                                    key={s}
                                    onClick={(e) => { e.stopPropagation(); setPickedSize(prev => ({ ...prev, [product.id]: s })); }}
                                    className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                                      pickedSize[product.id] === s
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-foreground border-border hover:border-primary/60'
                                    }`}
                                  >{s}</button>
                                ))}
                              </div>
                            )}
                            {colors.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground w-12">Color</span>
                                {colors.map(c => (
                                  <button
                                    key={c}
                                    onClick={(e) => { e.stopPropagation(); setPickedColor(prev => ({ ...prev, [product.id]: c })); }}
                                    className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                                      pickedColor[product.id] === c
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-foreground border-border hover:border-primary/60'
                                    }`}
                                  >{c}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-foreground">
                          ${product.price.toFixed(2)}
                        </span>

                        {product.inventory_quantity < 5 && product.inventory_quantity > 0 && <span className="text-xs text-primary font-medium">
                            Only {product.inventory_quantity} left
                          </span>}

                        {product.inventory_quantity === 0 && <span className="text-xs text-muted-foreground font-medium">
                            Sold out
                          </span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </div>

        {/* Bottom CTA Section - Compact */}
        <div className="bg-muted/40 py-10 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px w-8 bg-border" />
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="h-px w-8 bg-border" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Every purchase supports our legacy
            </h3>
            <p className="text-sm text-muted-foreground mb-5 text-center">Free shipping on orders over $150</p>
            <Button onClick={handleCheckout} disabled={getTotalItems() === 0} className="rounded-full px-8 py-6 text-lg gap-3 transition-all duration-300 hover:shadow-xl disabled:opacity-50">
              <ShoppingCart className="h-5 w-5" />
              View Cart ({getTotalItems()})
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>;
};