import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Star, 
  Heart,
  Plus,
  Minus,
  ShoppingBag
} from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  rating?: number;
  is_featured: boolean;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Spelman College Glee Club T-Shirt",
    description: "Classic cotton t-shirt with our iconic logo",
    price: 25.00,
    category: "apparel",
    stock_quantity: 50,
    rating: 4.8,
    is_featured: true
  },
  {
    id: "2", 
    name: "Concert Recording - Spring 2024",
    description: "Professional recording of our latest spring concert",
    price: 15.00,
    category: "music",
    stock_quantity: 100,
    rating: 4.9,
    is_featured: true
  },
  {
    id: "3",
    name: "Glee Club Hoodie",
    description: "Warm and comfortable hoodie perfect for Atlanta's cooler days",
    price: 45.00,
    category: "apparel", 
    stock_quantity: 30,
    rating: 4.7,
    is_featured: false
  },
  {
    id: "4",
    name: "Alumni Collection Polo",
    description: "Professional polo shirt for our distinguished alumni",
    price: 35.00,
    category: "apparel",
    stock_quantity: 25,
    rating: 4.6,
    is_featured: false
  },
  {
    id: "5",
    name: "Sheet Music Collection",
    description: "Digital sheet music of our most popular arrangements",
    price: 10.00,
    category: "music",
    stock_quantity: 999,
    rating: 4.9,
    is_featured: true
  },
  {
    id: "6",
    name: "Spelman College Glee Club Mug",
    description: "Ceramic mug perfect for your morning coffee",
    price: 18.00,
    category: "accessories",
    stock_quantity: 75,
    rating: 4.5,
    is_featured: false
  }
];

const CATEGORIES = [
  { value: "all", label: "All Products" },
  { value: "apparel", label: "Apparel" },
  { value: "music", label: "Music & Recordings" },
  { value: "accessories", label: "Accessories" }
];

export const Shop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentQuantity = cartItems[productId] || 0;
    if (currentQuantity >= product.stock_quantity) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock.",
        variant: "destructive"
      });
      return;
    }

    setCartItems(prev => ({
      ...prev,
      [productId]: currentQuantity + 1
    }));

    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart.`
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => {
      const newItems = { ...prev };
      if (newItems[productId] > 1) {
        newItems[productId]--;
      } else {
        delete newItems[productId];
      }
      return newItems;
    });
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GleeWorld Shop</h1>
            <p className="text-gray-600">Official Spelman College Glee Club merchandise and recordings</p>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button variant="outline" className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart ({getTotalItems()})</span>
                </Button>
                {getTotalItems() > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {getTotalItems()}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total:</div>
                <div className="font-bold text-lg">${getTotalPrice().toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-white rounded-lg shadow-sm">
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
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.is_featured).map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group">
                  <CardHeader className="pb-4">
                    <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                      <ShoppingBag className="h-16 w-16 text-blue-600" />
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {CATEGORIES.find(c => c.value === product.category)?.label}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="p-1">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{product.description}</CardDescription>
                    
                    {product.rating && (
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex">{renderStars(product.rating)}</div>
                        <span className="text-sm text-gray-600">({product.rating})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{product.stock_quantity} in stock</div>
                      </div>
                      
                      {user ? (
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
                      ) : (
                        <Link to="/auth">
                          <Button>Sign In to Purchase</Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory === "all" ? "All Products" : CATEGORIES.find(c => c.value === selectedCategory)?.label}
          </h2>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow group">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-colors">
                      <ShoppingBag className="h-12 w-12 text-gray-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <Heart className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      
                      {product.rating && (
                        <div className="flex items-center space-x-1">
                          <div className="flex">{renderStars(product.rating)}</div>
                          <span className="text-xs text-gray-600">({product.rating})</span>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="font-bold text-blue-600">${product.price.toFixed(2)}</div>
                        
                        {user ? (
                          cartItems[product.id] ? (
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
                          )
                        ) : (
                          <Link to="/auth">
                            <Button size="sm" className="w-full text-xs">
                              Sign In
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        {user && getTotalItems() > 0 && (
          <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 border">
            <div className="text-center">
              <div className="text-lg font-bold">${getTotalPrice().toFixed(2)}</div>
              <div className="text-sm text-gray-600 mb-3">{getTotalItems()} items</div>
              <Button className="w-full">
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};