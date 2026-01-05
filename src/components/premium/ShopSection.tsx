/**
 * SHOP SECTION COMPONENT
 * Premium shop header and product carousel with dark theme
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_featured?: boolean;
}

export const ShopSection: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category_id, is_featured')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const getCategoryLabel = (categoryId?: string) => {
    if (!categoryId) return 'MERCHANDISE';
    return 'MERCHANDISE';
  };

  return (
    <section className="w-full bg-[#0A0A0A] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Shop Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-black" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">SHOP GLEEWORLD</h2>
              <p className="text-[#666666] text-sm uppercase tracking-wider">Premium Gear & Exclusive Merchandise</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/shop')}
            className="bg-transparent border-[#333333] text-white hover:bg-[#1A1A1A] hover:border-yellow-500/50 gap-2"
          >
            VIEW ALL PRODUCTS
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Featured Collection Label */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] rounded-full">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="text-yellow-400 text-xs font-semibold tracking-wide">FEATURED COLLECTION</span>
          </div>
          <div className="flex-1 h-px bg-[#1A1A1A]"></div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full border border-[#333333] flex items-center justify-center text-[#666666] hover:text-white hover:border-[#444444] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full border border-[#333333] flex items-center justify-center text-[#666666] hover:text-white hover:border-[#444444] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Products Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px]">
                <Skeleton className="h-[360px] bg-[#1A1A1A] rounded-2xl" />
              </div>
            ))
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/shop/product/${product.id}`)}
                className="flex-shrink-0 w-[280px] bg-[#111111] rounded-2xl border border-[#1A1A1A] overflow-hidden cursor-pointer group hover:border-[#333333] transition-all"
              >
                {/* Image Container */}
                <div className="relative h-[200px] bg-white p-6 flex items-center justify-center">
                  {product.is_featured && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded">
                      FEATURED
                    </div>
                  )}
                  <img
                    src="/placeholder.svg"
                    alt={product.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4">
                  {/* Category */}
                  <span className="text-[#666666] text-xs tracking-wider">
                    {getCategoryLabel(product.category_id)}
                  </span>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-2 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-[#333333]'}`}
                      />
                    ))}
                    <span className="text-[#666666] text-xs ml-1">(128)</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-semibold text-lg mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#666666] text-xs uppercase">Price</span>
                    <span className="text-yellow-400 text-xl font-bold">${product.price}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-12 text-center text-[#666666]">
              No products available
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
