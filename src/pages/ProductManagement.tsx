import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductManager } from '@/components/products/ProductManager';
import { CategoryManager } from '@/components/products/CategoryManager';
import { Package, Tag } from 'lucide-react';

export const ProductManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your products, categories, and inventory
          </p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManager />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};