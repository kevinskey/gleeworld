import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Star, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  product_type: string;
  images: string[] | null;
  tags: string[] | null;
  is_active: boolean | null;
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
  const { toast } = useToast();

  useEffect(() => {
    loadFeaturedProducts();
  }, [limit]);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_products')
        .select('*')
        .eq('is_active', true)
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
      return product.images[0];
    }
    return '/placeholder.svg';
  };

  const getProductTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'tshirts': 'T-Shirts',
      'hoodies': 'Hoodies',
      'sweatshirts': 'Sweatshirts',
      'jackets': 'Jackets',
      'hats': 'Hats',
      'polos': 'Polos',
      'drinkware': 'Drinkware',
      'keepsakes': 'Keepsakes',
      'sheet_music': 'Sheet Music',
      'recordings': 'Recordings',
      'performances': 'Performances',
      'musical_lessons': 'Musical Lessons'
    };
    return typeMap[type] || type;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
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
    );
  }

  if (products.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        {showTitle && (
          <h2 className="text-3xl font-bold text-primary mb-4">Featured Products</h2>
        )}
        <p className="text-muted-foreground">No products available at the moment.</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <div className="relative aspect-square overflow-hidden bg-muted">
              <img
                src={getProductImage(product)}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-white/90 text-primary">
                  {getProductTypeLabel(product.product_type)}
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(product.price)}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>New</span>
                </div>
              </div>
              
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{product.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              <Button className="w-full group/btn" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
                <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {products.length >= limit && (
        <div className="text-center">
          <Button variant="outline" size="lg" className="group">
            View All Products
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
};