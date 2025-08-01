import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Users, ShoppingCart, ClipboardCheck, MessageSquare, FileText } from 'lucide-react';
import { WardrobeInventoryDashboard } from './wardrobe/WardrobeInventoryDashboard';
import { MemberManagementPanel } from './wardrobe/MemberManagementPanel';
import { WardrobeCheckoutSystem } from './wardrobe/WardrobeCheckoutSystem';
import { OrderManagement } from './wardrobe/OrderManagement';
import { WardrobeAnnouncements } from './wardrobe/WardrobeAnnouncements';
import { WardrobeReports } from './wardrobe/WardrobeReports';

export const WardrobeMistressHub = () => {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
        <h2 className="text-xl font-semibold text-purple-800 mb-2">Wardrobe Mistress Hub</h2>
        <p className="text-purple-600 text-sm">
          Comprehensive wardrobe management for formal dresses, lipstick, pearls, polos, and t-shirts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Check In/Out
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <WardrobeInventoryDashboard />
        </TabsContent>

        <TabsContent value="members">
          <MemberManagementPanel />
        </TabsContent>

        <TabsContent value="checkout">
          <WardrobeCheckoutSystem />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="announcements">
          <WardrobeAnnouncements />
        </TabsContent>

        <TabsContent value="reports">
          <WardrobeReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};