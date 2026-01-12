import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AmazonProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  product_url: string;
  price: string | null;
  category: string | null;
}

interface AmazonAffiliateSidebarProps {
  limit?: number;
  title?: string;
  className?: string;
}

export const AmazonAffiliateSidebar = ({
  limit = 6,
  title = "Shop & Support",
  className = ""
}: AmazonAffiliateSidebarProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['amazon-affiliate-sidebar', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amazon_affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data as AmazonProduct[];
    }
  });

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 rounded w-3/4" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-16 h-16 bg-neutral-200 rounded flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-200 rounded w-full" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-[#003666] px-4 py-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          {title}
        </h3>
        <p className="text-white/70 text-xs mt-0.5">Support us with your purchases</p>
      </div>

      {/* Products */}
      <ScrollArea className="h-auto max-h-[600px]">
        <div className="p-3 space-y-3">
          {products.map((product) => (
            <a
              key={product.id}
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors group border border-transparent hover:border-neutral-200"
            >
              {/* Product Image */}
              <div className="w-16 h-16 flex-shrink-0 bg-white rounded-md overflow-hidden border border-neutral-100">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-[#003666] line-clamp-2 group-hover:text-[#002244] transition-colors">
                  {product.title}
                </h4>
                {product.price && (
                  <p className="text-sm font-bold text-[#FF9900] mt-1">{product.price}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>Amazon</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
        <p className="text-[10px] text-neutral-500 text-center">
          As an Amazon Associate, we earn from qualifying purchases
        </p>
      </div>
    </div>
  );
};
