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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Package, Tag, ShoppingCart, Users, Truck, CreditCard, Percent, Receipt, Boxes, BarChart3, Settings, RefreshCw, Store } from 'lucide-react';

// Feature flag for subscriptions
const FEATURE_SUBSCRIPTIONS_ENABLED = false;
const tabs = [{
  value: 'products',
  label: 'Products',
  icon: Package
}, {
  value: 'categories',
  label: 'Categories',
  icon: Tag
}, {
  value: 'orders',
  label: 'Orders',
  icon: ShoppingCart
}, {
  value: 'customers',
  label: 'Customers',
  icon: Users
}, {
  value: 'shipping',
  label: 'Shipping',
  icon: Truck
}, {
  value: 'payments',
  label: 'Payments',
  icon: CreditCard
}, {
  value: 'discounts',
  label: 'Discounts',
  icon: Percent
}, {
  value: 'tax',
  label: 'Tax',
  icon: Receipt
}, {
  value: 'inventory',
  label: 'Inventory',
  icon: Boxes
}, {
  value: 'reports',
  label: 'Reports',
  icon: BarChart3
}, {
  value: 'settings',
  label: 'Settings',
  icon: Settings
}];
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
  return <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-[#003666] text-white">
        <div className="container mx-auto px-6 py-6 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Merch Store Management</h1>
              <p className="text-sm text-primary-foreground pt-[15px]">Manage products, orders, and customers</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Tabs defaultValue="products" className="space-y-6">
          {/* Scrollable Tab Navigation */}
          <Card className="p-1.5 bg-white shadow-sm border-0">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-auto p-0 bg-transparent gap-1 w-max min-w-full">
                {tabs.map(tab => {
                const Icon = tab.icon;
                return <TabsTrigger key={tab.value} value={tab.value} className="
                        flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium
                        text-muted-foreground hover:text-foreground hover:bg-muted/50
                        data-[state=active]:bg-[#003666] data-[state=active]:text-white
                        data-[state=active]:shadow-sm transition-all whitespace-nowrap
                      ">
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </TabsTrigger>;
              })}
                {FEATURE_SUBSCRIPTIONS_ENABLED && <TabsTrigger value="subscriptions" className="
                      flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium
                      text-muted-foreground hover:text-foreground hover:bg-muted/50
                      data-[state=active]:bg-[#003666] data-[state=active]:text-white
                      data-[state=active]:shadow-sm transition-all whitespace-nowrap
                    ">
                    <RefreshCw className="w-4 h-4" />
                    Subscriptions
                  </TabsTrigger>}
              </TabsList>
              <ScrollBar orientation="horizontal" className="h-2" />
            </ScrollArea>
          </Card>

          {/* Tab Content with consistent padding */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <TabsContent value="products" className="m-0">
              <ProductManager />
            </TabsContent>

            <TabsContent value="categories" className="m-0">
              <CategoryManager />
            </TabsContent>

            <TabsContent value="orders" className="m-0">
              <OrdersManager />
            </TabsContent>

            <TabsContent value="customers" className="m-0">
              <CustomersManager />
            </TabsContent>

            <TabsContent value="shipping" className="m-0">
              <ShippingManager />
            </TabsContent>

            <TabsContent value="payments" className="m-0">
              <PaymentsManager />
            </TabsContent>

            <TabsContent value="discounts" className="m-0">
              <DiscountsManager />
            </TabsContent>

            <TabsContent value="tax" className="m-0">
              <TaxManager />
            </TabsContent>

            <TabsContent value="inventory" className="m-0">
              <InventoryManager />
            </TabsContent>

            <TabsContent value="reports" className="m-0">
              <ReportsManager />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <StoreSettingsManager />
            </TabsContent>

            {FEATURE_SUBSCRIPTIONS_ENABLED && <TabsContent value="subscriptions" className="m-0">
                <SubscriptionsManager />
              </TabsContent>}
          </div>
        </Tabs>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer orderId={selectedOrderId} isOpen={isOrderDrawerOpen} onClose={handleCloseOrderDrawer} />
    </div>;
};