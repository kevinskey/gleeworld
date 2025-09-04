import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, Package, Calendar, User, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { FittingScheduleDialog } from '@/components/wardrobe/FittingScheduleDialog';
import { HairNailSubmission } from '@/components/wardrobe/HairNailSubmission';
const WardrobePage = () => {
  const {
    wardrobeItems,
    loading,
    getMeasurements
  } = useWardrobeItems();
  const [isFittingDialogOpen, setIsFittingDialogOpen] = useState(false);
  const [selectedFittingItem, setSelectedFittingItem] = useState<{
    id: string;
    name: string;
  } | null>(null);
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  const measurements = getMeasurements();
  const formalCount = wardrobeItems.filter(item => item.category === 'formal').length;
  const costumeCount = wardrobeItems.filter(item => item.category === 'costume').length;
  const needsFittingCount = wardrobeItems.filter(item => item.status === 'needs_fitting').length;
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Mobile-first responsive container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="rounded-xl p-3 sm:p-4 bg-gradient-to-br from-pink-100 to-pink-50 text-pink-600 shadow-sm">
            <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Wardrobe</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your costumes and uniform fittings</p>
          </div>
        </div>

        {/* Responsive Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{wardrobeItems.length}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Active inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Checked Out</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{wardrobeItems.filter(item => item.status === 'checked_out').length}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Currently borrowed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Past return date</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30 col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Need restocking</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30 col-span-2 sm:col-span-2 lg:col-span-1">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Shirt className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Notifications</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{needsFittingCount}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Unread alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responsive Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-3">
          {/* Main Content - Full width on mobile, 2/3 on desktop */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* My Wardrobe Items */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">My Wardrobe Items</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {wardrobeItems.length === 0 ? <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <Shirt className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No wardrobe items assigned yet.</p>
                  </div> : <div className="space-y-3 sm:space-y-4">
                     {wardrobeItems.map(item => <div key={item.id} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 sm:p-6 bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border border-muted/30 hover:shadow-md transition-all duration-200">
                          <div className="flex-shrink-0 self-start">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm ${item.category === 'formal' ? 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600' : item.category === 'casual' ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600' : item.category === 'costume' ? 'bg-gradient-to-br from-pink-100 to-pink-50 text-pink-600' : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600'}`}>
                             <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />
                           </div>
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm sm:text-base truncate">{item.name}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  {item.size && `Size: ${item.size}`}
                                  {item.color && ` • Color: ${item.color}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.checked_out_at ? `Checked out: ${new Date(item.checked_out_at).toLocaleDateString()}` : `Added: ${new Date(item.created_at).toLocaleDateString()}`}
                                  {item.due_date && ` • Due: ${new Date(item.due_date).toLocaleDateString()}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge variant={item.status === 'checked_out' ? 'default' : item.status === 'needs_fitting' ? 'destructive' : 'secondary'} className="text-xs">
                                    {item.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {item.category}
                                  </Badge>
                                </div>
                             </div>
                              <div className="flex flex-wrap gap-2 self-start">
                                 {item.status === 'needs_fitting' && <Button size="sm" className="text-xs h-8" onClick={() => {
                           setSelectedFittingItem({
                             id: item.id,
                             name: item.name
                           });
                           setIsFittingDialogOpen(true);
                         }}>
                                    Schedule Fitting
                                  </Button>}
                               <Button size="sm" variant="outline" className="text-xs h-8">
                                 Details
                               </Button>
                             </div>
                          </div>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Full width on mobile, 1/3 on desktop */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Button variant="outline" className="w-full justify-start h-11 sm:h-12 text-sm" onClick={() => {
                setSelectedFittingItem(null);
                setIsFittingDialogOpen(true);
              }}>
                  <Calendar className="h-4 w-4 mr-3 text-blue-500" />
                  Schedule with us!
                </Button>
                <Button variant="outline" className="w-full justify-start h-11 sm:h-12 text-sm">
                  <User className="h-4 w-4 mr-3 text-green-500" />
                  Update Measurements
                </Button>
                <Button variant="outline" className="w-full justify-start h-11 sm:h-12 text-sm">
                  <Camera className="h-4 w-4 mr-3 text-purple-500" />
                  Hair & Nail Approval
                </Button>
              </CardContent>
            </Card>

            {/* Sizing Information */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">My Measurements</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {measurements ? <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Dress Size</span>
                      <span className="font-semibold">{measurements.dressSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shoe Size</span>
                      <span className="font-semibold">{measurements.shoeSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height</span>
                      <span className="font-semibold">{measurements.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated</span>
                      <span className="font-semibold">{measurements.lastUpdated}</span>
                    </div>
                  </div> : <div className="text-center py-4 text-muted-foreground">
                    No measurements recorded yet.
                  </div>}
                <Button size="sm" variant="outline" className="w-full mt-4 h-10">
                  Update Measurements
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Fittings */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Upcoming Fittings</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <div>
                      <span className="font-medium">Spring Costume Fitting</span>
                      <p className="text-muted-foreground">March 8, 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <span className="font-medium">Uniform Check</span>
                      <p className="text-muted-foreground">March 12, 4:00 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Care Instructions */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Care Instructions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <p><strong>Concert Dress:</strong> Dry clean only</p>
                  <p><strong>White Blouse:</strong> Machine wash cold</p>
                  <p><strong>Black Skirt:</strong> Dry clean preferred</p>
                  <p><strong>Costumes:</strong> Follow specific care tags</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hair & Nail Submission - Full width section */}
        <div className="w-full">
          <HairNailSubmission />
        </div>

        {/* Fitting Schedule Dialog */}
        <FittingScheduleDialog isOpen={isFittingDialogOpen} onClose={() => {
        setIsFittingDialogOpen(false);
        setSelectedFittingItem(null);
      }} wardrobeItemId={selectedFittingItem?.id} wardrobeItemName={selectedFittingItem?.name} />
      </div>
    </div>;
};
export default WardrobePage;