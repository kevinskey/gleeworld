import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, Package, Calendar, User, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { FittingScheduleDialog } from '@/components/wardrobe/FittingScheduleDialog';
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
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-pink-100 text-pink-600">
            <Shirt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Wardrobe</h1>
            <p className="text-muted-foreground">Manage your costumes and uniform fittings</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-bold">{wardrobeItems.length}</p>
                  <p className="text-xs text-muted-foreground">Active inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Checked Out</p>
                  <p className="text-2xl font-bold">{wardrobeItems.filter(item => item.status === 'checked_out').length}</p>
                  <p className="text-xs text-muted-foreground">Currently borrowed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Overdue</p>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Past return date</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium">Low Stock</p>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Need restocking</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shirt className="h-4 w-4 text-info" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-2xl font-bold">{needsFittingCount}</p>
                  <p className="text-xs text-muted-foreground">Unread alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Wardrobe */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>My Wardrobe Items</CardTitle>
              </CardHeader>
              <CardContent>
                {wardrobeItems.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    No wardrobe items assigned yet.
                  </div> : <div className="space-y-4">
                     {wardrobeItems.map(item => <div key={item.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                         <div className="flex-shrink-0">
                           <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.category === 'formal' ? 'bg-purple-100 text-purple-600' : item.category === 'casual' ? 'bg-blue-100 text-blue-600' : item.category === 'costume' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'}`}>
                            <Shirt className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                             <div>
                               <h4 className="font-semibold">{item.name}</h4>
                               <p className="text-sm text-muted-foreground">
                                 {item.size && `Size: ${item.size}`}
                                 {item.color && ` • Color: ${item.color}`}
                               </p>
                               <p className="text-xs text-muted-foreground mt-1">
                                 {item.checked_out_at ? `Checked out: ${new Date(item.checked_out_at).toLocaleDateString()}` : `Added: ${new Date(item.created_at).toLocaleDateString()}`}
                                 {item.due_date && ` • Due: ${new Date(item.due_date).toLocaleDateString()}`}
                               </p>
                               <div className="flex items-center gap-2 mt-2">
                                 <Badge variant={item.status === 'checked_out' ? 'default' : item.status === 'needs_fitting' ? 'destructive' : 'secondary'} className="text-xs">
                                   {item.status.replace('_', ' ')}
                                 </Badge>
                                 <Badge variant="outline" className="text-xs capitalize">
                                   {item.category}
                                 </Badge>
                               </div>
                            </div>
                             <div className="flex gap-2 ml-4">
                                {item.status === 'needs_fitting' && <Button size="sm" className="text-xs" onClick={() => {
                          setSelectedFittingItem({
                            id: item.id,
                            name: item.name
                          });
                          setIsFittingDialogOpen(true);
                        }}>
                                   Schedule Fitting
                                 </Button>}
                              <Button size="sm" variant="outline" className="text-xs">
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                setSelectedFittingItem(null);
                setIsFittingDialogOpen(true);
              }}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule with us!
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Update Measurements
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="h-4 w-4 mr-2" />
                  Photo Reference
                </Button>
              </CardContent>
            </Card>

            {/* Sizing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Measurements</CardTitle>
              </CardHeader>
              <CardContent>
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
                <Button size="sm" variant="outline" className="w-full mt-4">
                  Update Measurements
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Fittings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Fittings</CardTitle>
              </CardHeader>
              <CardContent>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Care Instructions</CardTitle>
              </CardHeader>
              <CardContent>
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

        {/* Fitting Schedule Dialog */}
        <FittingScheduleDialog isOpen={isFittingDialogOpen} onClose={() => {
        setIsFittingDialogOpen(false);
        setSelectedFittingItem(null);
      }} wardrobeItemId={selectedFittingItem?.id} wardrobeItemName={selectedFittingItem?.name} />
      </div>
    </div>;
};
export default WardrobePage;