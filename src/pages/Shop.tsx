import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Star, 
  Heart,
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  CheckCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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

const CATEGORIES = [
  { value: "all", label: "All Products" },
  { value: "apparel", label: "Apparel" },
  { value: "digital", label: "Music & Recordings" },
  { value: "accessories", label: "Accessories" }
];

export const Shop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  // Load products from database
  useEffect(() => {
    loadProducts();
    loadCartFromStorage();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_products')
        .select('*')
        .eq('is_active', true)
        .order('title');

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

  const saveCartToStorage = (cart: { [key: string]: number }) => {
    localStorage.setItem('gleeworld-cart', JSON.stringify(cart));
  };

  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.product_type === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
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
    const newCart = { ...cartItems };
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
      return { product: product!, quantity };
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

    // Navigate to checkout with cart data
    navigate('/checkout', { 
      state: { 
        cartItems: getCartItems(),
        totalAmount: getTotalPrice()
      }
    });
  };

  const renderStars = (rating: number = 4.8) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const getProductImage = (product: Product) => {
    return product.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary-glow to-accent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-6">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-4 py-1">
                Official Merchandise
              </Badge>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              GleeWorld Shop
            </h1>
            
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Celebrate 100+ years of musical excellence with exclusive Spelman College Glee Club merchandise, 
              recordings, and collectibles. Every purchase supports our legacy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-xl min-w-[200px]"
                onClick={() => {
                  const productsSection = document.getElementById('products-section');
                  productsSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm min-w-[200px]"
                onClick={handleCheckout}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({getTotalItems()})
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-white" />
                <span>Free Shipping Over $150</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-white fill-white" />
                <span>Premium Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-white fill-white" />
                <span>Supporting Our Legacy</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12 sm:h-16">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-background"></path>
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <div className="text-sm text-muted-foreground mb-2">Total: <span className="font-bold text-lg text-foreground">${getTotalPrice().toFixed(2)}</span></div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex items-center justify-center space-x-2 w-full sm:w-auto min-w-[120px]"
                onClick={handleCheckout}
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Cart ({getTotalItems()})</span>
              </Button>
              {getTotalItems() > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full p-0 flex items-center justify-center text-xs">
                  {getTotalItems()}
                </Badge>
              )}
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-600">Total:</div>
              <div className="font-bold text-base sm:text-lg">${getTotalPrice().toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div id="products-section" className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 bg-white rounded-lg shadow-sm">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Featured Products */}
        {selectedCategory === "all" && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Featured Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.slice(0, 3).map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group">
                  <CardHeader className="pb-4">
                    <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-colors overflow-hidden">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {CATEGORIES.find(c => c.value === product.product_type)?.label}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="p-1">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{product.description}</CardDescription>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="flex">{renderStars()}</div>
                      <span className="text-sm text-gray-600">(4.8)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{product.inventory_quantity} in stock</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {cartItems[product.id] ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(product.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{cartItems[product.id]}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addToCart(product.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={() => addToCart(product.id)}>
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            {selectedCategory === "all" ? "All Products" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
          </h2>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-colors overflow-hidden">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">{product.title}</h3>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <Heart className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Badge variant="secondary" className="text-xs">{product.product_type}</Badge>
                      
                      <div className="flex items-center space-x-1">
                        <div className="flex">{renderStars()}</div>
                        <span className="text-xs text-gray-600">(4.8)</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="font-bold text-blue-600">${product.price.toFixed(2)}</div>
                        
                        {cartItems[product.id] ? (
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(product.id)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm">{cartItems[product.id]}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addToCart(product.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => addToCart(product.id)}
                          >
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Button */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 sm:p-4 border max-w-[200px]">
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold">${getTotalPrice().toFixed(2)}</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{getTotalItems()} items</div>
              <Button className="w-full text-xs sm:text-sm" onClick={handleCheckout}>
                <CreditCard className="h-4 w-4 mr-2" />
                Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};