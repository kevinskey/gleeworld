import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Heart, Plus, Minus, ShoppingBag, CreditCard, Music, Shirt, FileMusic, Sparkles, ArrowRight, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  useEffect(() => {
    loadProducts();
    loadCartFromStorage();
  }, []);
  const loadProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_products').select('*').eq('is_active', true).order('title');
      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
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
  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const currentQuantity = cartItems[productId] || 0;
    if (currentQuantity >= product.inventory_quantity) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock.",
        variant: "destructive"
      });
      return;
    }
    const newCart = {
      ...cartItems,
      [productId]: currentQuantity + 1
    };
    setCartItems(newCart);
    saveCartToStorage(newCart);
    toast({
      title: "Added to Cart",
      description: `${product.title} added to your cart.`
    });
  };
  const removeFromCart = (productId: string) => {
    const newCart = {
      ...cartItems
    };
    if (newCart[productId] > 1) {
      newCart[productId]--;
    } else {
      delete newCart[productId];
    }
    setCartItems(newCart);
    saveCartToStorage(newCart);
  };
  const getTotalItems = () => {
    return Object.values(cartItems).reduce((sum, quantity) => sum + quantity, 0);
  };
  const getTotalPrice = () => {
    return Object.entries(cartItems).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return total + (product ? product.price * quantity : 0);
    }, 0);
  };
  const getCartItems = (): CartItem[] => {
    return Object.entries(cartItems).map(([productId, quantity]) => {
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
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <Music className="h-16 w-16 text-stone-300 mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-stone-500 font-light tracking-wide">Loading boutique...</p>
          </div>
        </div>
      </PublicLayout>;
  }
  return <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50">
        {/* Hero Section - Elegant & Musical */}
        <div className="relative overflow-hidden bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30">
          {/* Musical Notes Decorative Pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="musical-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <text x="5" y="15" fontSize="12" fill="currentColor">♪</text>
                <text x="15" y="8" fontSize="8" fill="currentColor">♫</text>
              </pattern>
              <rect width="100%" height="100%" fill="url(#musical-pattern)" />
            </svg>
          </div>
          
          {/* Subtle gradient orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-stone-200/30 to-transparent rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-32 relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Decorative musical element */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-stone-300" />
                <Music className="h-6 w-6 text-stone-400" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-stone-300" />
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-stone-800 mb-4 tracking-tight" style={{
              fontFamily: "'Playfair Display', serif"
            }}>
                The GleeWorld
                <span className="block font-medium bg-gradient-to-r from-stone-700 via-amber-700 to-stone-700 bg-clip-text text-transparent">
                  Boutique
                </span>
              </h1>
              
              <p className="text-lg text-stone-500 mb-10 max-w-xl mx-auto leading-relaxed font-light">
                Curated accessories, apparel, and digital sheet music for the discerning music lover.
              </p>
              
              {/* Category Pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.value;
                return <button key={category.value} onClick={() => setSelectedCategory(category.value)} className={`
                        group flex items-center gap-2 px-5 py-2.5 rounded-full 
                        transition-all duration-300 ease-out
                        ${isActive ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'bg-white/80 text-stone-600 hover:bg-white hover:shadow-md border border-stone-200/50'}
                      `}>
                      <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>;
              })}
              </div>
              
              {/* Search Bar - Elegant */}
              <div className="max-w-md mx-auto relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-stone-400" />
                </div>
                <Input placeholder="Search our collection..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-6 bg-white/90 backdrop-blur-sm border-stone-200 rounded-full text-stone-700 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-200 focus:border-amber-300 shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Summary Bar */}
        {getTotalItems() > 0 && <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-stone-600">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">{getTotalItems()} items</span>
                  </div>
                  <div className="h-4 w-px bg-stone-200" />
                  <span className="text-lg font-semibold text-stone-800">${getTotalPrice().toFixed(2)}</span>
                </div>
                <Button onClick={handleCheckout} className="bg-stone-800 hover:bg-stone-900 text-white rounded-full px-6 gap-2 transition-all duration-300 hover:shadow-lg">
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>}

        {/* Products Section */}
        <div className="container mx-auto px-4 py-12 sm:py-16">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-light text-stone-800" style={{
              fontFamily: "'Playfair Display', serif"
            }}>
                {selectedCategory === "all" ? "Our Collection" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </h2>
              <p className="text-stone-500 text-sm mt-1">{filteredProducts.length} pieces</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? <div className="text-center py-20">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music className="h-10 w-10 text-stone-300" />
              </div>
              <h3 className="text-xl font-light text-stone-700 mb-2">No items found</h3>
              <p className="text-stone-500">Try adjusting your search or browse all categories.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => {
            setSelectedCategory("all");
            setSearchQuery("");
          }}>
                View All Products
              </Button>
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filteredProducts.map(product => <Card key={product.id} className={`
                    group overflow-hidden border-0 bg-white shadow-sm 
                    transition-all duration-500 ease-out cursor-pointer
                    hover:shadow-xl hover:-translate-y-1
                  `} onMouseEnter={() => setHoveredProduct(product.id)} onMouseLeave={() => setHoveredProduct(null)}>
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-stone-100 to-stone-50">
                      <img src={getProductImage(product)} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                      
                      {/* Overlay gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Wishlist Button */}
                      <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110">
                        <Heart className="h-5 w-5 text-stone-500 hover:text-rose-500 transition-colors" />
                      </button>
                      
                      {/* Quick Add Button */}
                      {!cartItems[product.id] ? <button onClick={e => {
                  e.stopPropagation();
                  addToCart(product.id);
                }} className="absolute bottom-4 left-4 right-4 py-3 bg-white/95 backdrop-blur-sm rounded-lg font-medium text-stone-800 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-white shadow-lg flex items-center justify-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add to Cart
                        </button> : <div className="absolute bottom-4 left-4 right-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                          <div className="flex items-center justify-between px-4">
                            <button onClick={e => {
                      e.stopPropagation();
                      removeFromCart(product.id);
                    }} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors">
                              <Minus className="h-4 w-4 text-stone-700" />
                            </button>
                            <span className="font-medium text-stone-800">{cartItems[product.id]}</span>
                            <button onClick={e => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-900 flex items-center justify-center transition-colors">
                              <Plus className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        </div>}
                      
                      {/* Category Badge */}
                      <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-stone-700 border-0 text-xs font-medium">
                        {CATEGORIES.find(c => c.value === product.product_type)?.label || product.product_type}
                      </Badge>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-5">
                      <h3 className="font-medium text-stone-800 mb-1 group-hover:text-amber-700 transition-colors" style={{
                  fontFamily: "'Playfair Display', serif"
                }}>
                        {product.title}
                      </h3>
                      
                      <p className="text-stone-500 text-sm mb-3 line-clamp-2 font-light">
                        {product.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-stone-800">
                          ${product.price.toFixed(2)}
                        </span>
                        
                        {product.inventory_quantity < 5 && product.inventory_quantity > 0 && <span className="text-xs text-amber-600 font-medium">
                            Only {product.inventory_quantity} left
                          </span>}
                        
                        {product.inventory_quantity === 0 && <span className="text-xs text-stone-400 font-medium">
                            Sold out
                          </span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </div>

        {/* Bottom CTA Section */}
        <div className="bg-gradient-to-br from-stone-100 to-stone-50 py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-stone-300" />
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div className="h-px w-8 bg-stone-300" />
            </div>
            <h3 className="text-2xl font-light text-stone-700 mb-2" style={{
            fontFamily: "'Playfair Display', serif"
          }}>
              Every purchase supports our legacy
            </h3>
            <p className="text-stone-500 mb-6 text-center">Free shipping on orders over $150</p>
            <Button onClick={handleCheckout} disabled={getTotalItems() === 0} className="bg-stone-800 hover:bg-stone-900 text-white rounded-full px-8 py-6 text-lg gap-3 transition-all duration-300 hover:shadow-xl disabled:opacity-50">
              <ShoppingCart className="h-5 w-5" />
              View Cart ({getTotalItems()})
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>;
};