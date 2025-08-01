import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  category_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  images?: ProductImage[];
  category?: {
    name: string;
  };
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface FeaturedProductsProps {
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export const FeaturedProducts = ({ 
  limit = 8, 
  showTitle = true, 
  className = "" 
}: FeaturedProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadFeaturedProducts();
  }, [limit]);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name),
          images:product_images(*)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading featured products:', error);
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0].image_url;
    }
    return '/placeholder.svg';
  };

  const getCurrentPrice = (product: Product) => {
    if (product.sale_price && product.sale_price < product.price) {
      return product.sale_price;
    }
    return product.price;
  };

  const hasDiscount = (product: Product) => {
    return product.sale_price && product.sale_price < product.price;
  };

  const scrollLeft = () => {
    const container = document.getElementById('products-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 288 : 320; // Card width + gap
      container.scrollBy({ 
        left: -cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('products-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 288 : 320; // Card width + gap  
      container.scrollBy({ 
        left: cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showTitle && (
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-primary">Featured Products</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our exclusive collection of Spelman College Glee Club merchandise
            </p>
          </div>
        )}
        <div className="relative">
          <div className="flex gap-3 sm:gap-6 overflow-hidden">
            {Array.from({ length: limit }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse flex-shrink-0 w-72 sm:w-80">
                <div className="aspect-square bg-muted"></div>
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        {showTitle && (
          <h2 className="text-3xl font-bold text-primary mb-4">Featured Products</h2>
        )}
        <p className="text-muted-foreground">No featured products available. Use the star icon in Product Management to add favorites!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-primary">Featured Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our exclusive collection of Spelman College Glee Club merchandise
          </p>
        </div>
      )}
      
      {/* Horizontal Product Slider */}
      <div className="relative group">
        {/* Navigation Arrows */}
        {products.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"  
              size="icon"
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Products Container */}
        <div 
          id="products-container"
          className="flex gap-4 overflow-x-scroll pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          style={{ 
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 flex-shrink-0 w-72 md:w-80 snap-start hover-scale"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                
                {/* Featured Star */}
                <div className="absolute top-2 left-2">
                  <div className="bg-yellow-500 text-white p-1 rounded-full">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                
                {product.category && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-white/90 text-primary">
                      {product.category.name}
                    </Badge>
                  </div>
                )}
                
                {/* Hover overlay with quick view */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button size="sm" className="bg-white text-primary hover:bg-white/90 animate-fade-in">
                    Quick View
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  {(product.short_description || product.description) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.short_description || product.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {hasDiscount(product) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(getCurrentPrice(product))}
                        </span>
                        <span className="text-sm line-through text-muted-foreground">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(getCurrentPrice(product))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>Featured</span>
                  </div>
                </div>
                <Button className="w-full group/btn hover-scale" size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                  <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* View All Products Button */}
        {products.length >= limit && (
          <div className="text-center mt-6">
            <Button variant="outline" size="lg" className="group hover-scale">
              View All Products
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};