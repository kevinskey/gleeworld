import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AmazonProduct {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
}

interface AmazonProductSliderProps {
  className?: string;
}

export const AmazonProductSlider: React.FC<AmazonProductSliderProps> = ({ className }) => {
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('advertising_hero')
          .select('id, title, description, image_url, link_url')
          .eq('is_active', true)
          .not('link_url', 'is', null)
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        // Filter to only Amazon links
        const amazonProducts = (data || []).filter(p => 
          p.link_url?.includes('amazon.com') || p.link_url?.includes('amzn.to')
        );
        setProducts(amazonProducts);
      } catch (e) {
        console.error('Failed to load Amazon products:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('amazon-products-scroll');
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className={cn("w-full py-4 bg-gradient-to-r from-[#FF9900]/10 to-[#FF9900]/5 rounded-xl", className)}>
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="h-5 w-5 text-[#FF9900]" />
            <h3 className="font-semibold text-foreground">Shop on Amazon</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-36 h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full py-4 bg-gradient-to-r from-[#FF9900]/10 to-[#FF9900]/5 rounded-xl relative group", className)}>
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#FF9900]" />
            <h3 className="font-semibold text-foreground">Shop on Amazon</h3>
          </div>
          <span className="text-xs text-muted-foreground">Amazon Associates</span>
        </div>

        <div className="relative">
          {/* Left Arrow */}
          {products.length > 3 && (
            <button
              onClick={() => scrollContainer('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Products Scroll */}
          <div
            id="amazon-products-scroll"
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
          >
            {products.map((product) => (
              <a
                key={product.id}
                href={product.link_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-36 bg-card rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-all hover:scale-[1.02] group/card"
              >
                <div className="h-28 bg-white flex items-center justify-center p-2">
                  <img
                    src={product.image_url}
                    alt={product.title || 'Amazon Product'}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="p-2 bg-card">
                  <h4 className="font-medium text-xs line-clamp-2 text-foreground">
                    {product.title || 'View Product'}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-[#FF9900]">
                    <ExternalLink className="h-3 w-3" />
                    <span className="text-xs font-medium">Shop Now</span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Right Arrow */}
          {products.length > 3 && (
            <button
              onClick={() => scrollContainer('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity translate-x-2"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
