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
import { Link } from "react-router-dom";
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
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'mock-tee',
    title: 'Concert T-Shirt',
    description: 'Soft cotton tee with the season logo.',
    price: 25,
    product_type: 'apparel',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
    inventory_quantity: 50,
    tags: ['shirt'],
    requires_shipping: true,
  },
  {
    id: 'mock-hoodie',
    title: 'Tour Hoodie',
    description: 'Heavyweight hoodie with embroidered crest.',
    price: 55,
    product_type: 'apparel',
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'],
    inventory_quantity: 30,
    tags: ['hoodie'],
    requires_shipping: true,
  },
  {
    id: 'mock-tote',
    title: 'Canvas Tote',
    description: 'Sturdy tote for rehearsals and concerts.',
    price: 18,
    product_type: 'accessories',
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=400'],
    inventory_quantity: 80,
    tags: ['bag'],
    requires_shipping: true,
  },
  {
    id: 'mock-pin',
    title: 'Enamel Crest Pin',
    description: 'Hard-enamel pin for backpacks and lapels.',
    price: 8,
    product_type: 'accessories',
    images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400'],
    inventory_quantity: 120,
    tags: ['pin'],
    requires_shipping: true,
  },
  {
    id: 'mock-anthem',
    title: 'Sheet Music: Season Anthem',
    description: 'PDF download of this season\'s featured anthem.',
    price: 6,
    product_type: 'digital',
    images: ['https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400'],
    inventory_quantity: 999,
    tags: ['pdf'],
    requires_shipping: false,
  },
  {
    id: 'mock-mug',
    title: 'Ensemble Mug',
    description: 'Ceramic mug — perfect for warm-ups before rehearsal.',
    price: 14,
    product_type: 'accessories',
    images: ['https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=400'],
    inventory_quantity: 60,
    tags: ['mug'],
    requires_shipping: true,
  },
];

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
      const list = data && data.length > 0 ? (data as Product[]) : MOCK_PRODUCTS;
      setProducts(list);
      setFilteredProducts(list);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts(MOCK_PRODUCTS);
      setFilteredProducts(MOCK_PRODUCTS);
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
        {/* Header Banner - Consistent with other pages */}
        <div className="w-full py-4 sm:py-5 relative" style={{ backgroundColor: '#150d26' }}>
          <Link
            to="/"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="container mx-auto px-4 flex items-center justify-center">
            <div>
              <div className="flex items-center justify-center gap-3">
                <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-wide">
                  Boutique
                </h1>
              </div>
              <p className="text-white/80 text-center mt-1 text-xs sm:text-sm max-w-xl mx-auto">
                Curated accessories, apparel & digital sheet music
              </p>
            </div>
          </div>
        </div>

        {/* Boutique Filter Section - Compact for iPad */}
        <div className="bg-gradient-to-b from-stone-50 to-white border-b border-stone-100">
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
                        ${isActive ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'bg-white text-stone-700 hover:bg-stone-50 hover:shadow-md border border-stone-200'}
                      `}>
                      <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>;
              })}
              </div>
              
              {/* Search Bar - Elegant */}
              <div className="max-w-md mx-auto relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-stone-500" />
                </div>
                <Input placeholder="Search our collection..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-5 bg-white border-stone-200 rounded-full text-stone-800 placeholder:text-stone-500 focus:ring-2 focus:ring-amber-200 focus:border-amber-300 shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Summary Bar */}
        {getTotalItems() > 0 && <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-stone-700">
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

        {/* Products Section - Tighter spacing for iPad */}
        <div className="container mx-auto px-4 py-6 sm:py-10">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-light text-stone-800" style={{
              fontFamily: "'Playfair Display', serif"
            }}>
                {selectedCategory === "all" ? "Our Collection" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </h2>
              <p className="text-stone-700 text-sm mt-1">{filteredProducts.length} pieces</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? <div className="text-center py-16">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music className="h-10 w-10 text-stone-400" />
              </div>
              <h3 className="text-xl font-light text-stone-800 mb-2">No items found</h3>
              <p className="text-stone-600">Try adjusting your search or browse all categories.</p>
              <Button variant="outline" className="mt-6 rounded-full border-stone-300 text-stone-800 hover:bg-stone-100" onClick={() => {
            setSelectedCategory("all");
            setSearchQuery("");
          }}>
                View All Products
              </Button>
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
                        <Heart className="h-5 w-5 text-stone-600 hover:text-rose-500 transition-colors" />
                      </button>
                      
                      {/* Quick Add Button - Fixed white-on-white issue */}
                      {!cartItems[product.id] ? <button onClick={e => {
                  e.stopPropagation();
                  addToCart(product.id);
                }} className="absolute bottom-4 left-4 right-4 py-3 bg-stone-800 rounded-lg font-medium text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-stone-900 shadow-lg flex items-center justify-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add to Cart
                        </button> : <div className="absolute bottom-4 left-4 right-4 py-2 bg-stone-800 rounded-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                          <div className="flex items-center justify-between px-4">
                            <button onClick={e => {
                      e.stopPropagation();
                      removeFromCart(product.id);
                    }} className="w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-600 flex items-center justify-center transition-colors">
                              <Minus className="h-4 w-4 text-white" />
                            </button>
                            <span className="font-medium text-white">{cartItems[product.id]}</span>
                            <button onClick={e => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }} className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center transition-colors">
                              <Plus className="h-4 w-4 text-stone-800" />
                            </button>
                          </div>
                        </div>}
                      
                      {/* Category Badge */}
                      <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-stone-800 border-0 text-xs font-medium">
                        {CATEGORIES.find(c => c.value === product.product_type)?.label || product.product_type}
                      </Badge>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-stone-800 mb-1 group-hover:text-amber-700 transition-colors" style={{
                  fontFamily: "'Playfair Display', serif"
                }}>
                        {product.title}
                      </h3>
                      
                      <p className="text-stone-600 text-sm mb-3 line-clamp-2 font-light">
                        {product.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-stone-800">
                          ${product.price.toFixed(2)}
                        </span>
                        
                        {product.inventory_quantity < 5 && product.inventory_quantity > 0 && <span className="text-xs text-amber-600 font-medium">
                            Only {product.inventory_quantity} left
                          </span>}
                        
                        {product.inventory_quantity === 0 && <span className="text-xs text-stone-500 font-medium">
                            Sold out
                          </span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </div>

        {/* Bottom CTA Section - Compact */}
        <div className="bg-gradient-to-br from-stone-100 to-stone-50 py-10 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px w-8 bg-stone-300" />
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div className="h-px w-8 bg-stone-300" />
            </div>
            <h3 className="text-2xl font-light text-stone-800 mb-2" style={{
            fontFamily: "'Playfair Display', serif"
          }}>
              Every purchase supports our legacy
            </h3>
            <p className="text-stone-700 mb-5 text-center">Free shipping on orders over $150</p>
            <Button onClick={handleCheckout} disabled={getTotalItems() === 0} className="bg-stone-800 hover:bg-stone-900 text-white rounded-full px-8 py-6 text-lg gap-3 transition-all duration-300 hover:shadow-xl disabled:opacity-50">
              <ShoppingCart className="h-5 w-5" />
              View Cart ({getTotalItems()})
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>;
};