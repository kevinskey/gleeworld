import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, ChevronDown, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}
const categories = ['(ALL)', 'Apparel', 'Accessories', 'Music'];
export const DashboardStoreSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('(ALL)');
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchProducts = async () => {
      const {
        data,
        error
      } = await supabase.from('gw_products').select('id, title, price, images').eq('is_active', true).limit(9).order('created_at', {
        ascending: false
      });
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);
  const displayedProducts = showMore ? products : products.slice(0, 6);
  if (loading) {
    return <div className="w-full bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="h-24 w-64 bg-muted animate-pulse rounded mb-8" />
          
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      </div>;
  }
  return <div className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pl-[30px] pt-[2px]">
        {/* Section Header */}
        <h2 className="text-2xl font-bold text-foreground mb-6">Shop</h2>
        

        {/* Product Horizontal Scroll */}
        {products.length > 0 ? <>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth flex-nowrap" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
              {products.map(product => <div key={product.id} onClick={() => navigate(`/shop/${product.id}`)} className="group cursor-pointer flex-shrink-0 w-64 snap-start">
                  {/* Product Image */}
                  <div className="relative aspect-[3/4] bg-muted/50 rounded-lg overflow-hidden mb-4">
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
                      </div>}
                    
                    {/* Add Button Overlay */}
                    <button className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-background/80 backdrop-blur-sm border border-border rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background" onClick={e => {
                e.stopPropagation();
                // Add to cart logic
              }}>
                      <Plus className="h-4 w-4 text-foreground" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          Glee Merch
                        </span>
                        {product.images && product.images.length > 1 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <span className="w-3 h-3 border border-muted-foreground/50 rounded-sm" />
                            +{product.images.length - 1}
                          </span>}
                      </div>
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                    </div>
                    <span className="text-foreground font-medium whitespace-nowrap">
                      $ {product.price.toFixed(0)}
                    </span>
                  </div>
                </div>)}
            </div>

            {/* View All & Glee Academy */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              
              <Button onClick={() => navigate('/glee-academy')} className="flex-1 gap-2 py-[100px] text-4xl">
                <GraduationCap className="h-5 w-5" />
                Explore Glee Academy
              </Button>
            </div>
          </> : <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No products available yet</p>
            <Button onClick={() => navigate('/shop')} className="mt-4">
              Visit Shop
            </Button>
          </div>}
      </div>
    </div>;
};