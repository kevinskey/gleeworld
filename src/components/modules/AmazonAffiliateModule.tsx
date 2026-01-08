import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  Plus, 
  ExternalLink, 
  Check, 
  ShoppingCart,
  Trash2,
  Edit,
  GripVertical,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { AmazonAffiliateSlider, AmazonAffiliateBanner } from '@/components/amazon';

interface AmazonProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  product_url: string;
  price: string | null;
  category: string | null;
  asin: string | null;
  is_active: boolean;
  display_order: number | null;
}

interface ProductSuggestion {
  title: string;
  description: string;
  searchUrl: string;
  imageUrl?: string;
  price?: string;
  asin?: string;
  added?: boolean;
}

export const AmazonAffiliateModule = () => {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  // Fetch existing products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['amazon-affiliate-products-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amazon_affiliate_products')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as AmazonProduct[];
    }
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('amazon_affiliate_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amazon-affiliate-products-admin'] });
      toast.success('Product deleted');
    },
    onError: () => {
      toast.error('Failed to delete product');
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('amazon_affiliate_products')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amazon-affiliate-products-admin'] });
    }
  });

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
        setSuggestions(data.suggestions.map((s: ProductSuggestion) => ({ ...s, added: false })));
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
        queryClient.invalidateQueries({ queryKey: ['amazon-affiliate-products-admin'] });
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

  const categories = [...new Set(products?.map(p => p.category).filter(Boolean) || [])];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#FF9900]" />
            Amazon Affiliate Manager
          </h1>
          <p className="text-muted-foreground">
            Manage Amazon affiliate products that appear across your site
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products ({products?.length || 0})</TabsTrigger>
          <TabsTrigger value="add">Add Products</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {productsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium">No products yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the "Add Products" tab to get AI-powered suggestions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {products?.map((product) => (
                <Card key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <img 
                        src={product.image_url} 
                        alt={product.title}
                        className="w-16 h-16 object-contain rounded border bg-white flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium line-clamp-1">{product.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {product.price && (
                                <span className="text-sm font-semibold text-[#FF9900]">{product.price}</span>
                              )}
                              {product.category && (
                                <Badge variant="outline" className="text-xs">{product.category}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.is_active}
                              onCheckedChange={(checked) => 
                                toggleActiveMutation.mutate({ id: product.id, is_active: checked })
                              }
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(product.product_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF9900]" />
                AI Product Suggester
              </CardTitle>
              <CardDescription>
                Get AI-powered Amazon product suggestions. Products will be added with your affiliate tag.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="flex flex-wrap gap-2">
                {['Voice Training', 'Sheet Music', 'Performance Wear', 'Music Theory', 'HBCU Merch', 'Choir Accessories'].map((cat) => (
                  <Badge 
                    key={cat}
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setCategory(cat);
                    }}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>

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
                                className={product.added ? "text-green-600 border-green-600" : ""}
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Component Preview
              </CardTitle>
              <CardDescription>
                See how the Amazon affiliate components will look on your site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h4 className="font-medium mb-3">Slider Component</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  <code className="bg-muted px-1 rounded">{`<AmazonAffiliateSlider />`}</code>
                </p>
                <AmazonAffiliateSlider />
              </div>

              <div>
                <h4 className="font-medium mb-3">Banner Component</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  <code className="bg-muted px-1 rounded">{`<AmazonAffiliateBanner />`}</code>
                </p>
                <AmazonAffiliateBanner />
              </div>

              {categories.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Filtered by Category</h4>
                  <div className="space-y-4">
                    {categories.slice(0, 2).map((cat) => (
                      <div key={cat}>
                        <p className="text-sm text-muted-foreground mb-2">
                          <code className="bg-muted px-1 rounded">{`<AmazonAffiliateSlider category="${cat}" />`}</code>
                        </p>
                        <AmazonAffiliateSlider category={cat} title={`${cat} Products`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AmazonAffiliateModule;
