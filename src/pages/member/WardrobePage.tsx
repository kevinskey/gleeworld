import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, Package, Calendar, User, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const WardrobePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 text-center bg-pink-50 border-pink-200">
            <Shirt className="h-8 w-8 mx-auto mb-2 text-pink-600" />
            <h3 className="font-semibold">Uniforms</h3>
            <p className="text-sm text-muted-foreground">3 assigned</p>
          </Card>
          <Card className="p-4 text-center bg-purple-50 border-purple-200">
            <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Costumes</h3>
            <p className="text-sm text-muted-foreground">2 fitted</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Next Fitting</h3>
            <p className="text-sm text-muted-foreground">March 8</p>
          </Card>
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <User className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Size Status</h3>
            <p className="text-sm text-muted-foreground">Updated</p>
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
                <div className="space-y-4">
                  {[
                    {
                      name: "Black Concert Dress",
                      type: "formal",
                      size: "Medium",
                      status: "fitted",
                      lastFitting: "Feb 15, 2024",
                      nextPerformance: "Spring Concert - March 15"
                    },
                    {
                      name: "White Blouse",
                      type: "casual",
                      size: "Medium",
                      status: "assigned",
                      lastFitting: "Jan 20, 2024",
                      nextPerformance: "Community Event - March 22"
                    },
                    {
                      name: "Black Skirt",
                      type: "formal",
                      size: "Medium",
                      status: "fitted",
                      lastFitting: "Feb 15, 2024",
                      nextPerformance: "Spring Concert - March 15"
                    },
                    {
                      name: "Spring Themed Costume",
                      type: "costume",
                      size: "Medium",
                      status: "needs-fitting",
                      lastFitting: "Never",
                      nextPerformance: "Spring Concert - March 15"
                    },
                    {
                      name: "Black Shoes",
                      type: "accessories",
                      size: "8.5",
                      status: "assigned",
                      lastFitting: "Feb 1, 2024",
                      nextPerformance: "All Events"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          item.type === 'formal' ? 'bg-purple-100 text-purple-600' :
                          item.type === 'casual' ? 'bg-blue-100 text-blue-600' :
                          item.type === 'costume' ? 'bg-pink-100 text-pink-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <Shirt className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last fitting: {item.lastFitting}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Next use: {item.nextPerformance}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={
                                  item.status === 'fitted' ? 'default' :
                                  item.status === 'needs-fitting' ? 'destructive' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {item.status.replace('-', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {item.status === 'needs-fitting' && (
                              <Button size="sm" className="text-xs">
                                Schedule Fitting
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs">
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Fitting
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
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Dress Size</span>
                    <span className="font-semibold">Medium</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shoe Size</span>
                    <span className="font-semibold">8.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Height</span>
                    <span className="font-semibold">5'6"</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated</span>
                    <span className="font-semibold">Feb 15, 2024</span>
                  </div>
                </div>
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
      </div>
    </div>
  );
};

export default WardrobePage;