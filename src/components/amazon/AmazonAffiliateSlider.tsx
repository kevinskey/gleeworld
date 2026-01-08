import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface AmazonProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  product_url: string;
  price: string | null;
  category: string | null;
}

interface AmazonAffiliateSliderProps {
  category?: string;
  limit?: number;
  title?: string;
  showTitle?: boolean;
  className?: string;
}

export const AmazonAffiliateSlider = ({
  category,
  limit = 10,
  title = "Recommended Products",
  showTitle = true,
  className = ""
}: AmazonAffiliateSliderProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['amazon-affiliate-products', category, limit],
    queryFn: async () => {
      let query = supabase
        .from('amazon_affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(limit);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AmazonProduct[];
    }
  });

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-48 h-64 bg-muted rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {title}
          <span className="text-xs text-muted-foreground font-normal">(Affiliate)</span>
        </h3>
      )}
      
      <Carousel
        opts={{
          align: "start",
          loop: products.length > 4,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => (
            <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-white p-2">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h4>
                    {product.price && (
                      <p className="text-sm font-bold text-[#FF9900] mt-1">{product.price}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <ExternalLink className="h-3 w-3" />
                      <span>View on Amazon</span>
                    </div>
                  </div>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
        {products.length > 4 && (
          <>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </>
        )}
      </Carousel>
    </div>
  );
};
