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
  Sparkles
} from "lucide-react";
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

const CATEGORIES = [
  { value: "all", label: "All Products" },
  { value: "apparel", label: "Apparel" },
  { value: "digital", label: "Music & Recordings" },
  { value: "accessories", label: "Accessories" },
  { value: "memorabilia", label: "Memorabilia" }
];

export const AlumnaeShop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

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
        .or('tags.cs.{alumnae},tags.cs.{exclusive}')
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
    const savedCart = localStorage.getItem('alumnae-gleeworld-cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  };

  const saveCartToStorage = (cart: { [key: string]: number }) => {
    localStorage.setItem('alumnae-gleeworld-cart', JSON.stringify(cart));
  };

  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.product_type === selectedCategory);
    }

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
            <p className="text-gray-600">Loading exclusive alumnae products...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Hero Banner */}
        <div className="mb-6 p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Alumnae Exclusive Shop</h1>
          </div>
          <p className="text-sm sm:text-base text-purple-100">
            Premium merchandise and exclusive items for our distinguished alumnae family
          </p>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 bg-white rounded-lg shadow-sm">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search exclusive products..."
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
        {selectedCategory === "all" && products.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Featured Exclusive Items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.slice(0, 3).map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group border-purple-200">
                  <CardHeader className="pb-4">
                    <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-4 flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-colors overflow-hidden">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-700">
                          Exclusive
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
                        <div className="text-2xl font-bold text-purple-600">${product.price.toFixed(2)}</div>
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
                          <Button onClick={() => addToCart(product.id)} className="bg-purple-600 hover:bg-purple-700">
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
            {selectedCategory === "all" ? "All Exclusive Products" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
          </h2>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No exclusive products found</h3>
              <p className="text-gray-600">Check back soon for new alumnae-exclusive merchandise!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group border-purple-100">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg mb-4 flex items-center justify-center group-hover:from-purple-100 group-hover:to-blue-100 transition-colors overflow-hidden">
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
                      
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Exclusive</Badge>
                      
                      <div className="flex items-center space-x-1">
                        <div className="flex">{renderStars()}</div>
                        <span className="text-xs text-gray-600">(4.8)</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="font-bold text-purple-600">${product.price.toFixed(2)}</div>
                        
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
                            className="w-full text-xs bg-purple-600 hover:bg-purple-700"
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
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 sm:p-4 border border-purple-200 max-w-[200px]">
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-purple-600">${getTotalPrice().toFixed(2)}</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{getTotalItems()} items</div>
              <Button className="w-full text-xs sm:text-sm bg-purple-600 hover:bg-purple-700" onClick={handleCheckout}>
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
