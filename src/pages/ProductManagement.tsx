import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductManager } from '@/components/products/ProductManager';
import { CategoryManager } from '@/components/products/CategoryManager';
import { OrdersManager } from '@/components/products/OrdersManager';
import { CustomersManager } from '@/components/products/CustomersManager';
import { Package, Tag, ShoppingCart, Users } from 'lucide-react';
export const ProductManagement = () => {
  return <div className="min-h-screen bg-background">
      {/* Navy header strip - #003666 */}
      <div className="w-full h-2" style={{
      backgroundColor: '#003666'
    }} />
      
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="mb-4">
          <h1 className="font-bold mb-1 text-xl bg-[#003666] text-primary-foreground py-[20px] px-[20px] pl-[20px] pt-[20px] pb-[25px]">Merch Store Management</h1>
          
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-[#003666]">
            <TabsTrigger value="products" className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#003666] !text-white data-[state=active]:bg-white data-[state=active]:!text-[#003666]">
              <Package className="w-3.5 h-3.5" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#003666] !text-white data-[state=active]:bg-white data-[state=active]:!text-[#003666]">
              <Tag className="w-3.5 h-3.5" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#003666] !text-white data-[state=active]:bg-white data-[state=active]:!text-[#003666]">
              <ShoppingCart className="w-3.5 h-3.5" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#003666] !text-white data-[state=active]:bg-white data-[state=active]:!text-[#003666]">
              <Users className="w-3.5 h-3.5" />
              Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManager />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersManager />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};