import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ShippingSettings } from '@/components/products/ShippingSettings';
import { SubscriptionsManager } from '@/components/products/SubscriptionsManager';
import { OrderDetailDrawer } from '@/components/products/OrderDetailDrawer';
import { StoreConnectPrompt } from '@/components/products/StoreConnectPrompt';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Package, Tag, ShoppingCart, Users, Truck, CreditCard, Percent, Receipt, Boxes, BarChart3, Settings, RefreshCw, Store, ExternalLink, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

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
  value: 'shipping-easypost',
  label: 'EasyPost',
  icon: Plane
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
  const { hasAccess: hasStore, isLoading: moduleLoading } = useModuleAccess('store');
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrderDrawerOpen(true);
  };
  const handleCloseOrderDrawer = () => {
    setIsOrderDrawerOpen(false);
    setSelectedOrderId(null);
  };

  if (moduleLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  // Store builder is gated behind the `store` add-on. A tenant that
  // reaches /dashboard/shop without it (stale link, sidebar hidden but
  // URL bookmarked) gets an upsell instead of the full product/order
  // management surface. Mirrors BoxOfficePage's !hasAccess state.
  if (!hasStore) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Card>
          <CardHeader>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-status-warning-bg text-status-warning-fg mb-2">
              <Store className="w-6 h-6" />
            </div>
            <CardTitle>Store</CardTitle>
            <CardDescription>
              Sell merchandise and digital products from your own storefront. Order payments
              land in your own Stripe account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This add-on isn't enabled for your tenant yet. Activate it from the Modules page.
            </p>
            <Button asChild>
              <Link to="/settings/modules">Open Modules</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <DashboardPageShell
      title="Merch Store Management"
      subtitle="Manage products, orders, and customers"
      icon={Store}
      maxWidth="7xl"
      actions={
        // Same-tab router navigation — target="_blank" is a no-op
        // inside the iOS app's webview. ?from=admin tells Shop to
        // render a "Back to Store admin" pill for the way back.
        <Button asChild variant="secondary" size="sm" className="shrink-0">
          <Link to="/shop?from=admin">
            View public store <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      }
    >
        <StoreConnectPrompt />
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
                        data-[state=active]:bg-[#150d26] data-[state=active]:text-white
                        data-[state=active]:shadow-sm transition-all whitespace-nowrap
                      ">
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </TabsTrigger>;
              })}
                {FEATURE_SUBSCRIPTIONS_ENABLED && <TabsTrigger value="subscriptions" className="
                      flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium
                      text-muted-foreground hover:text-foreground hover:bg-muted/50
                      data-[state=active]:bg-[#150d26] data-[state=active]:text-white
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
              <OrdersManager onSelectOrder={handleViewOrder} />
            </TabsContent>

            <TabsContent value="customers" className="m-0">
              <CustomersManager />
            </TabsContent>

            <TabsContent value="shipping" className="m-0">
              <ShippingManager />
            </TabsContent>

            <TabsContent value="shipping-easypost" className="m-0">
              <ShippingSettings />
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

      {/* Order Detail Drawer */}
      <OrderDetailDrawer orderId={selectedOrderId} isOpen={isOrderDrawerOpen} onClose={handleCloseOrderDrawer} />
    </DashboardPageShell>;
};