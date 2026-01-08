import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

interface AmazonProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  product_url: string;
  price: string | null;
}

interface AmazonAffiliateBannerProps {
  category?: string;
  className?: string;
}

export const AmazonAffiliateBanner = ({
  category,
  className = ""
}: AmazonAffiliateBannerProps) => {
  const { data: product, isLoading } = useQuery({
    queryKey: ['amazon-affiliate-featured', category],
    queryFn: async () => {
      let query = supabase
        .from('amazon_affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.[0] as AmazonProduct | undefined;
    }
  });

  if (isLoading || !product) {
    return null;
  }

  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block group ${className}`}
    >
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-r from-[#FF9900]/10 to-transparent hover:shadow-md transition-shadow">
        <img
          src={product.image_url}
          alt={product.title}
          className="w-16 h-16 object-contain bg-white rounded p-1"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Recommended for you</p>
          <h4 className="font-medium line-clamp-1 group-hover:text-[#FF9900] transition-colors">
            {product.title}
          </h4>
          {product.price && (
            <p className="text-sm font-bold text-[#FF9900]">{product.price}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </a>
  );
};
