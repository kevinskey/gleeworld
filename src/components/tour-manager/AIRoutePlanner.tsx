import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MapPin, 
  Route, 
  Plus, 
  Zap, 
  Clock, 
  DollarSign,
  Navigation,
  Car,
  Plane,
  Hotel,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TourStop {
  id: string;
  city: string;
  venue: string;
  date: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface TourRoute {
  id: string;
  name: string;
  description: string;
  stops: TourStop[];
  status: 'planning' | 'optimized' | 'approved';
  totalDistance: number;
  estimatedDuration: string;
  estimatedCost: number;
  created_at: string;
}

interface AIRoutePlannerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const AIRoutePlanner = ({ user }: AIRoutePlannerProps) => {
  const [routes, setRoutes] = useState<TourRoute[]>([
    {
      id: '1',
      name: 'Southeast Regional Tour 2024',
      description: 'Spring tour covering major cities in the Southeast',
      stops: [
        { id: '1', city: 'Atlanta, GA', venue: 'Spelman College', date: '2024-04-01', address: '350 Spelman Ln SW, Atlanta, GA 30314' },
        { id: '2', city: 'Birmingham, AL', venue: 'Birmingham Museum of Art', date: '2024-04-03', address: '2000 Rev Abraham Woods Jr Blvd, Birmingham, AL 35203' },
        { id: '3', city: 'Nashville, TN', venue: 'Fisk University', date: '2024-04-05', address: '1000 17th Ave N, Nashville, TN 37208' },
        { id: '4', city: 'Charlotte, NC', venue: 'Johnson C. Smith University', date: '2024-04-07', address: '100 Beatties Ford Rd, Charlotte, NC 28216' }
      ],
      status: 'optimized',
      totalDistance: 892,
      estimatedDuration: '3 days, 4 hours',
      estimatedCost: 12500,
      created_at: '2024-01-15T10:00:00Z'
    }
  ]);

  const [selectedRoute, setSelectedRoute] = useState<TourRoute | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '',
    description: '',
    stops: [] as TourStop[]
  });
  const [currentStop, setCurrentStop] = useState({
    city: '',
    venue: '',
    date: '',
    address: ''
  });
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { toast } = useToast();

  const addStop = () => {
    if (!currentStop.city || !currentStop.venue || !currentStop.date) {
      toast({
        title: "Missing information",
        description: "Please fill in all stop details.",
        variant: "destructive"
      });
      return;
    }

    const stop: TourStop = {
      id: Date.now().toString(),
      ...currentStop
    };

    setNewRoute(prev => ({
      ...prev,
      stops: [...prev.stops, stop]
    }));

    setCurrentStop({ city: '', venue: '', date: '', address: '' });
  };

  const removeStop = (stopId: string) => {
    setNewRoute(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId)
    }));
  };

  const optimizeRoute = async (routeId?: string) => {
    setIsOptimizing(true);
    
    try {
      // Simulate AI optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (routeId) {
        setRoutes(prev => prev.map(route => 
          route.id === routeId 
            ? { 
                ...route, 
                status: 'optimized',
                totalDistance: Math.floor(Math.random() * 1000) + 500,
                estimatedDuration: `${Math.floor(Math.random() * 5) + 2} days, ${Math.floor(Math.random() * 8) + 1} hours`,
                estimatedCost: Math.floor(Math.random() * 10000) + 8000
              }
            : route
        ));
      }

      toast({
        title: "Route optimized",
        description: "AI has optimized the route for minimum travel time and cost.",
      });
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: "Could not optimize route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const createRoute = () => {
    if (!newRoute.name || newRoute.stops.length < 2) {
      toast({
        title: "Invalid route",
        description: "Route must have a name and at least 2 stops.",
        variant: "destructive"
      });
      return;
    }

    const route: TourRoute = {
      id: Date.now().toString(),
      ...newRoute,
      status: 'planning',
      totalDistance: 0,
      estimatedDuration: 'Not calculated',
      estimatedCost: 0,
      created_at: new Date().toISOString()
    };

    setRoutes(prev => [route, ...prev]);
    setIsCreating(false);
    setNewRoute({ name: '', description: '', stops: [] });

    toast({
      title: "Route created",
      description: "Tour route has been created successfully.",
    });
  };

  const getStatusColor = (status: TourRoute['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'optimized':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: TourRoute['status']) => {
    switch (status) {
      case 'planning':
        return <AlertCircle className="h-4 w-4" />;
      case 'optimized':
        return <Zap className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Route className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">AI Route Planning</h3>
          <p className="text-sm text-muted-foreground">
            Plan optimal tour routes using AI-powered optimization with Google Maps integration
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tour Route</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Name</label>
                  <Input
                    placeholder="e.g., Southeast Regional Tour 2024"
                    value={newRoute.name}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Brief description of the tour"
                    value={newRoute.description}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Add Tour Stops</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      placeholder="e.g., Atlanta, GA"
                      value={currentStop.city}
                      onChange={(e) => setCurrentStop(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Venue</label>
                    <Input
                      placeholder="Performance venue"
                      value={currentStop.venue}
                      onChange={(e) => setCurrentStop(prev => ({ ...prev, venue: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={currentStop.date}
                      onChange={(e) => setCurrentStop(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      placeholder="Full address"
                      value={currentStop.address}
                      onChange={(e) => setCurrentStop(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={addStop} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stop
                </Button>
              </div>

              {newRoute.stops.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Tour Stops ({newRoute.stops.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {newRoute.stops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{stop.city} - {stop.venue}</p>
                            <p className="text-xs text-muted-foreground">{new Date(stop.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeStop(stop.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={createRoute}>
                  Create Route
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Routes List */}
      <div className="grid gap-6">
        {routes.map((route) => (
          <Card key={route.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{route.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{route.description}</p>
                </div>
                <Badge className={`${getStatusColor(route.status)} gap-1`}>
                  {getStatusIcon(route.status)}
                  {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Route Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{route.stops.length} stops</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span>{route.totalDistance || 0} miles</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{route.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${route.estimatedCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Route Stops */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tour Stops</h4>
                <div className="grid gap-2">
                  {route.stops.map((stop, index) => (
                    <div key={stop.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{stop.city}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm">{stop.venue}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(stop.date).toLocaleDateString()}</span>
                          <span>{stop.address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(route.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  {route.status === 'planning' && (
                    <Button 
                      size="sm" 
                      onClick={() => optimizeRoute(route.id)}
                      disabled={isOptimizing}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
                    </Button>
                  )}
                  {route.status === 'optimized' && (
                    <>
                      <Button variant="outline" size="sm">
                        <Car className="h-4 w-4 mr-1" />
                        View Map
                      </Button>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {routes.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No routes planned yet</h3>
              <p className="text-muted-foreground">
                Create your first tour route to get started with AI-powered planning.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};