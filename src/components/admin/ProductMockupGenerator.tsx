import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Product {
  id: string;
  title: string;
  product_type: string;
  images?: string[];
}

interface MockupStatus {
  productId: string;
  productName: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  imageUrl?: string;
  error?: string;
}

export const ProductMockupGenerator = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [mockupStatuses, setMockupStatuses] = useState<MockupStatus[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_products')
        .select('id, title, product_type, images')
        .order('product_type', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      
      // Initialize mockup statuses
      const statuses: MockupStatus[] = data?.map(product => ({
        productId: product.id,
        productName: product.title,
        status: (product.images && product.images.length > 0) ? 'completed' as const : 'pending' as const,
        imageUrl: product.images?.[0]
      })) || [];
      
      setMockupStatuses(statuses);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateMockup = async (product: Product) => {
    try {
      // Update status to generating
      setMockupStatuses(prev => prev.map(status => 
        status.productId === product.id 
          ? { ...status, status: 'generating' }
          : status
      ));

      const { data, error } = await supabase.functions.invoke('generate-product-mockup', {
        body: {
          productId: product.id,
          productName: product.title,
          productType: product.product_type,
          category: product.product_type
        }
      });

      if (error) throw error;

      if (data.success) {
        // Update status to completed
        setMockupStatuses(prev => prev.map(status => 
          status.productId === product.id 
            ? { 
                ...status, 
                status: 'completed', 
                imageUrl: data.imageUrl 
              }
            : status
        ));

        toast({
          title: "Mockup generated!",
          description: `Created mockup for ${product.title}`,
        });
      } else {
        throw new Error(data.error || 'Failed to generate mockup');
      }
    } catch (error: any) {
      console.error('Error generating mockup:', error);
      
      // Update status to error
      setMockupStatuses(prev => prev.map(status => 
        status.productId === product.id 
          ? { 
              ...status, 
              status: 'error', 
              error: error.message 
            }
          : status
      ));

      toast({
        title: "Error generating mockup",
        description: `Failed to generate mockup for ${product.title}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const generateAllMockups = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    const pendingProducts = products.filter(product => {
      const status = mockupStatuses.find(s => s.productId === product.id);
      return status?.status === 'pending' || status?.status === 'error';
    });

    const total = pendingProducts.length;
    let completed = 0;

    for (const product of pendingProducts) {
      await generateMockup(product);
      completed++;
      setProgress((completed / total) * 100);
      
      // Add delay between generations to avoid rate limiting
      if (completed < total) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);
    
    toast({
      title: "All mockups generated!",
      description: `Successfully generated ${total} product mockups`,
    });
  };

  const getStatusIcon = (status: MockupStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Image className="h-4 w-4 text-muted-foreground" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: MockupStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'Ready to generate';
      case 'generating':
        return 'Generating...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const completedCount = mockupStatuses.filter(s => s.status === 'completed').length;
  const totalCount = mockupStatuses.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Product Mockup Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Generate realistic product mockups with your logo
              </p>
              <p className="text-sm font-medium">
                Progress: {completedCount}/{totalCount} mockups completed
              </p>
            </div>
            <Button 
              onClick={generateAllMockups}
              disabled={isGenerating || completedCount === totalCount}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4" />
                  Generate All Mockups
                </>
              )}
            </Button>
          </div>
          
          {isGenerating && (
            <Progress value={progress} className="w-full" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockupStatuses.map((status) => {
          const product = products.find(p => p.id === status.productId);
          if (!product) return null;

          return (
            <Card key={status.productId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{status.productName}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {product.product_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.status)}
                    <span className="text-xs">
                      {getStatusText(status.status)}
                    </span>
                  </div>
                </div>

                {status.imageUrl && (
                  <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
                    <img 
                      src={status.imageUrl} 
                      alt={`${status.productName} mockup`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {status.status === 'error' && status.error && (
                  <p className="text-xs text-red-500 mb-3">{status.error}</p>
                )}

                {(status.status === 'pending' || status.status === 'error') && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => generateMockup(product)}
                    disabled={false}
                    className="w-full"
                  >
                    <Image className="h-3 w-3 mr-2" />
                    Generate Mockup
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};