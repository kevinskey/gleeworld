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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border">
        <h1 className="text-2xl font-bold text-purple-800 mb-3">Wardrobe Mistress Hub</h1>
        <p className="text-purple-600">
          Comprehensive wardrobe management for formal dresses, lipstick, pearls, polos, and t-shirts
        </p>
      </div>

      {/* Navigation Tabs - More Space and Better Layout */}
      <div className="bg-white rounded-lg border shadow-sm p-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto gap-1 bg-muted p-1">
            <TabsTrigger 
              value="inventory" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Package className="h-5 w-5" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-5 w-5" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger 
              value="checkout" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <ClipboardCheck className="h-5 w-5" />
              <span>Check In/Out</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger 
              value="announcements" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Communications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex flex-col items-center gap-1 p-3 min-h-[60px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-5 w-5" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content with More Spacing */}
          <TabsContent value="inventory" className="mt-6">
            <WardrobeInventoryDashboard />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <MemberManagementPanel />
          </TabsContent>

          <TabsContent value="checkout" className="mt-6">
            <WardrobeCheckoutSystem />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <WardrobeAnnouncements />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <WardrobeReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};