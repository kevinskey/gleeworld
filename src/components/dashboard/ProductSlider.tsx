import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}
export const ProductSlider = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchProducts = async () => {
      const {
        data,
        error
      } = await supabase.from('gw_products').select('id, title, price, images').eq('is_active', true).limit(10).order('created_at', {
        ascending: false
      });
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);
  if (loading) {
    return <div className="w-full py-4 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold mb-3">Shop Glee Merch</h2>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="flex-shrink-0 w-32 h-44 bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      </div>;
  }
  if (products.length === 0) {
    return null;
  }
  return <div className="w-full py-4 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          
          <button onClick={() => navigate('/shop')} className="text-sm text-primary hover:underline">
            View All →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {products.map(product => <div key={product.id} onClick={() => navigate('/shop')} className="flex-shrink-0 w-32 bg-card rounded-lg border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              <div className="h-28 bg-muted flex items-center justify-center">
                {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" /> : <ShoppingBag className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="p-2">
                <h3 className="font-medium text-xs truncate">{product.title}</h3>
                <p className="text-primary text-sm font-semibold">${product.price.toFixed(2)}</p>
              </div>
            </div>)}
        </div>
        
        {/* Glee Academy Button */}
        <div className="mt-4">
          <Button onClick={() => navigate('/glee-academy')} className="w-full gap-2 h-14 text-lg" size="lg">
            <GraduationCap className="h-6 w-6" />
            Explore Glee Academy
          </Button>
        </div>
      </div>
    </div>;
};