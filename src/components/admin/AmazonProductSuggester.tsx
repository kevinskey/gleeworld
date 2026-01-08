import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Plus, ExternalLink, Check, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductSuggestion {
  title: string;
  description: string;
  searchUrl: string;
  imageUrl?: string;
  price?: string;
  asin?: string;
  added?: boolean;
}

export const AmazonProductSuggester = () => {
  const [category, setCategory] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-amazon-products', {
        body: { 
          action: 'suggest',
          category: category || 'Music and choir supplies for college students'
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions.map((s: any) => ({ ...s, added: false })));
        toast.success(`Found ${data.suggestions.length} product suggestions!`);
      } else {
        throw new Error(data.error || 'Failed to get suggestions');
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (index: number) => {
    const product = suggestions[index];
    setAddingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-amazon-products', {
        body: {
          action: 'add',
          title: product.title,
          description: product.description,
          searchUrl: product.searchUrl,
          imageUrl: product.imageUrl,
          price: product.price,
          asin: product.asin,
          category: category || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        setSuggestions(prev => 
          prev.map((s, i) => i === index ? { ...s, added: true } : s)
        );
        toast.success(`Added "${product.title}" to Amazon Affiliate Products!`);
      } else {
        throw new Error(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setAddingIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#FF9900]" />
          AI Amazon Product Suggester
        </CardTitle>
        <CardDescription>
          Get AI-powered Amazon product suggestions for your Glee Club audience. Products will be added with your affiliate tag (kevinskey-20).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Input */}
        <div className="space-y-2">
          <Label htmlFor="category">Product Category (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="category"
              placeholder="e.g., Voice training, Sheet music, Performance wear..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Button 
              onClick={getSuggestions} 
              disabled={loading}
              className="bg-[#FF9900] hover:bg-[#FF9900]/90"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Get Suggestions</>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Category Buttons */}
        <div className="flex flex-wrap gap-2">
          {['Voice Training', 'Sheet Music', 'Performance Wear', 'Music Theory', 'HBCU Merch', 'Choir Accessories'].map((cat) => (
            <Badge 
              key={cat}
              variant="outline" 
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => {
                setCategory(cat);
                getSuggestions();
              }}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Suggestions List */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Suggested Products
            </h4>
            <div className="grid gap-3">
              {suggestions.map((product, index) => (
                <div 
                  key={index}
                  className={`p-4 border rounded-lg ${product.added ? 'bg-green-50 border-green-200' : 'bg-card'}`}
                >
                  <div className="flex items-start gap-4">
                    {product.imageUrl && (
                      <img 
                        src={product.imageUrl} 
                        alt={product.title}
                        className="w-16 h-16 object-contain rounded border bg-white flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-medium line-clamp-2">{product.title}</h5>
                          {product.price && (
                            <span className="text-sm font-semibold text-[#FF9900]">{product.price}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={product.added ? "outline" : "default"}
                          disabled={product.added || addingIndex === index}
                          onClick={() => addProduct(index)}
                          className={product.added ? "text-green-600 border-green-600 flex-shrink-0" : "flex-shrink-0"}
                        >
                          {addingIndex === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : product.added ? (
                            <><Check className="h-4 w-4 mr-1" /> Added</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-1" /> Add</>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                      <a 
                        href={product.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#FF9900] hover:underline flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Amazon
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
