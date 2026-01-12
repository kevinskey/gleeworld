import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductManager } from '@/components/products/ProductManager';
import { CategoryManager } from '@/components/products/CategoryManager';
import { OrdersManager } from '@/components/products/OrdersManager';
import { CustomersManager } from '@/components/products/CustomersManager';
import { ShippingManager } from '@/components/products/ShippingManager';
import { PaymentsManager } from '@/components/products/PaymentsManager';
import { DiscountsManager } from '@/components/products/DiscountsManager';
import { TaxManager } from '@/components/products/TaxManager';
import { InventoryManager } from '@/components/products/InventoryManager';
import { ReportsManager } from '@/components/products/ReportsManager';
import { StoreSettingsManager } from '@/components/products/StoreSettingsManager';
import { SubscriptionsManager } from '@/components/products/SubscriptionsManager';
import { OrderDetailDrawer } from '@/components/products/OrderDetailDrawer';
import { 
  Package, Tag, ShoppingCart, Users, Truck, CreditCard, 
  Percent, Receipt, Boxes, BarChart3, Settings, RefreshCw 
} from 'lucide-react';

// Feature flag for subscriptions
const FEATURE_SUBSCRIPTIONS_ENABLED = false;

export const ProductManagement = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrderDrawerOpen(true);
  };

  const handleCloseOrderDrawer = () => {
    setIsOrderDrawerOpen(false);
    setSelectedOrderId(null);
  };

  const tabTriggerClass = "flex items-center gap-1.5 text-sm px-4 py-2.5 bg-[#003666] !text-white data-[state=active]:bg-white data-[state=active]:!text-[#003666]";

  return (
    <div className="min-h-screen bg-background">
      {/* Navy header strip - #003666 */}
      <div className="w-full h-2" style={{ backgroundColor: '#003666' }} />
      
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="mb-4">
          <h1 className="font-bold mb-1 text-xl bg-[#003666] text-primary-foreground py-5 px-5">
            Merch Store Management
          </h1>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-[#003666]">
            <TabsTrigger value="products" className={tabTriggerClass}>
              <Package className="w-3.5 h-3.5" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className={tabTriggerClass}>
              <Tag className="w-3.5 h-3.5" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="orders" className={tabTriggerClass}>
              <ShoppingCart className="w-3.5 h-3.5" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="customers" className={tabTriggerClass}>
              <Users className="w-3.5 h-3.5" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="shipping" className={tabTriggerClass}>
              <Truck className="w-3.5 h-3.5" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="payments" className={tabTriggerClass}>
              <CreditCard className="w-3.5 h-3.5" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="discounts" className={tabTriggerClass}>
              <Percent className="w-3.5 h-3.5" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="tax" className={tabTriggerClass}>
              <Receipt className="w-3.5 h-3.5" />
              Tax
            </TabsTrigger>
            <TabsTrigger value="inventory" className={tabTriggerClass}>
              <Boxes className="w-3.5 h-3.5" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="reports" className={tabTriggerClass}>
              <BarChart3 className="w-3.5 h-3.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className={tabTriggerClass}>
              <Settings className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
            {FEATURE_SUBSCRIPTIONS_ENABLED && (
              <TabsTrigger value="subscriptions" className={tabTriggerClass}>
                <RefreshCw className="w-3.5 h-3.5" />
                Subscriptions
              </TabsTrigger>
            )}
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

          <TabsContent value="shipping">
            <ShippingManager />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsManager />
          </TabsContent>

          <TabsContent value="discounts">
            <DiscountsManager />
          </TabsContent>

          <TabsContent value="tax">
            <TaxManager />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManager />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsManager />
          </TabsContent>

          <TabsContent value="settings">
            <StoreSettingsManager />
          </TabsContent>

          {FEATURE_SUBSCRIPTIONS_ENABLED && (
            <TabsContent value="subscriptions">
              <SubscriptionsManager />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={selectedOrderId}
        isOpen={isOrderDrawerOpen}
        onClose={handleCloseOrderDrawer}
      />
    </div>
  );
};
