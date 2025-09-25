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
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto gap-2 bg-muted p-2 mb-12 sticky top-0 z-20">
            <TabsTrigger 
              value="inventory" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <Package className="h-6 w-6" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <Users className="h-6 w-6" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger 
              value="checkout" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <ClipboardCheck className="h-6 w-6" />
              <span>Check In/Out</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger 
              value="announcements" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <MessageSquare className="h-6 w-6" />
              <span>Communications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex flex-col items-center gap-2 p-4 min-h-[80px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <FileText className="h-6 w-6" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content with Significant Spacing to Prevent Overlap */}
          <div className="pt-12 mt-12 border-t relative z-10">
            <TabsContent value="inventory" className="mt-0">
              <WardrobeInventoryDashboard />
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <MemberManagementPanel />
            </TabsContent>

            <TabsContent value="checkout" className="mt-0">
              <WardrobeCheckoutSystem />
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="announcements" className="mt-0">
              <WardrobeAnnouncements />
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <WardrobeReports />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};