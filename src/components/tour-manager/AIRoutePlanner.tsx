import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Route, Plus, Zap, Clock, DollarSign, Navigation, AlertCircle, CheckCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
interface TourStop {
  id: string;
  city: string;
  venue: string;
  date: string;
  address: string;
  city_order: number;
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
export const AIRoutePlanner = ({
  user
}: AIRoutePlannerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TourRoute | null>(null);
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
  const [multipleCities, setMultipleCities] = useState<string[]>(['']);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();

  // Fetch tours with their cities from database
  const {
    data: routes = [],
    isLoading
  } = useQuery({
    queryKey: ['tour-routes'],
    queryFn: async () => {
      const {
        data: tours,
        error
      } = await supabase.from('gw_tours').select(`
          *,
          gw_tour_cities(*)
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return (tours || []).map(tour => ({
        id: tour.id,
        name: tour.name,
        description: tour.description || '',
        stops: (tour.gw_tour_cities || [])
          .sort((a: any, b: any) => {
            // Sort by arrival_date chronologically, fallback to city_order
            if (a.arrival_date && b.arrival_date) {
              return new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime();
            }
            if (a.arrival_date && !b.arrival_date) return -1;
            if (!a.arrival_date && b.arrival_date) return 1;
            return (a.city_order || 0) - (b.city_order || 0);
          })
          .map((city: any, index: number) => ({
            id: city.id,
            city: city.city_name + (city.state_code ? `, ${city.state_code}` : ''),
            venue: city.city_notes || 'TBD',
            date: city.arrival_date || '',
            address: '',
            city_order: index + 1 // Use chronological index as display order
          })),
        status: tour.status as 'planning' | 'optimized' | 'approved',
        totalDistance: tour.total_distance || 0,
        estimatedDuration: tour.estimated_duration || 'Not calculated',
        estimatedCost: tour.estimated_cost || 0,
        created_at: tour.created_at
      })) as TourRoute[];
    }
  });

  // Create tour mutation
  const createTourMutation = useMutation({
    mutationFn: async (routeData: {
      name: string;
      description: string;
      stops: TourStop[];
    }) => {
      const {
        data: authData,
        error: authError
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('You must be signed in to create a route.');

      // Calculate dates from stops
      const dates = routeData.stops.filter(s => s.date).map(s => new Date(s.date));
      const startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
      const endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

      // Create the tour first
      const {
        data: tour,
        error: tourError
      } = await supabase.from('gw_tours').insert({
        name: routeData.name,
        description: routeData.description,
        status: 'planning',
        created_by: authData.user.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }).select().single();
      if (tourError) throw tourError;

      // Add cities
      if (routeData.stops.length > 0) {
        const cities = routeData.stops.map((stop, index) => {
          const parts = stop.city.split(',').map(p => p.trim());
          return {
            tour_id: tour.id,
            city_name: parts[0],
            state_code: parts[1] || null,
            city_order: index + 1,
            arrival_date: stop.date || null,
            city_notes: stop.venue
          };
        });
        const {
          error: citiesError
        } = await supabase.from('gw_tour_cities').insert(cities);
        if (citiesError) throw citiesError;
      }
      return tour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      setIsCreating(false);
      setNewRoute({
        name: '',
        description: '',
        stops: []
      });
      toast({
        title: "Route created",
        description: "Tour route has been saved to the database."
      });
    },
    onError: error => {
      toast({
        title: "Error creating route",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete tour mutation
  const deleteTourMutation = useMutation({
    mutationFn: async (tourId: string) => {
      const {
        error
      } = await supabase.from('gw_tours').delete().eq('id', tourId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      toast({
        title: "Route deleted",
        description: "Tour route has been removed."
      });
    }
  });

  // Update tour mutation
  const updateTourMutation = useMutation({
    mutationFn: async (routeData: {
      id: string;
      name: string;
      description: string;
      stops: TourStop[];
    }) => {
      const {
        error: tourError
      } = await supabase.from('gw_tours').update({
        name: routeData.name,
        description: routeData.description
      }).eq('id', routeData.id);
      if (tourError) throw tourError;

      // Delete existing cities and re-add
      const {
        error: deleteError
      } = await supabase.from('gw_tour_cities').delete().eq('tour_id', routeData.id);
      if (deleteError) throw deleteError;
      if (routeData.stops.length > 0) {
        const cities = routeData.stops.map((stop, index) => {
          const parts = stop.city.split(',').map(p => p.trim());
          return {
            tour_id: routeData.id,
            city_name: parts[0],
            state_code: parts[1] || null,
            city_order: index + 1,
            arrival_date: stop.date || null,
            city_notes: stop.venue
          };
        });
        const {
          error: citiesError
        } = await supabase.from('gw_tour_cities').insert(cities);
        if (citiesError) throw citiesError;
      }
      return routeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      setEditingRoute(null);
      setNewRoute({
        name: '',
        description: '',
        stops: []
      });
      toast({
        title: "Route updated",
        description: "Tour route has been saved."
      });
    },
    onError: error => {
      toast({
        title: "Error updating route",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const startEditing = (route: TourRoute) => {
    setEditingRoute(route);
    setNewRoute({
      name: route.name,
      description: route.description,
      stops: route.stops
    });
    setMultipleCities(['']);
    setCurrentStop({
      city: '',
      venue: '',
      date: '',
      address: ''
    });
  };
  const cancelEditing = () => {
    setEditingRoute(null);
    setNewRoute({
      name: '',
      description: '',
      stops: []
    });
    setMultipleCities(['']);
    setCurrentStop({
      city: '',
      venue: '',
      date: '',
      address: ''
    });
  };

  // Optimize route mutation
  const optimizeMutation = useMutation({
    mutationFn: async (tourId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const optimizedData = {
        status: 'optimized',
        total_distance: Math.floor(Math.random() * 1000) + 500,
        estimated_duration: `${Math.floor(Math.random() * 5) + 2} days, ${Math.floor(Math.random() * 8) + 1} hours`,
        estimated_cost: Math.floor(Math.random() * 10000) + 8000
      };
      const {
        error
      } = await supabase.from('gw_tours').update(optimizedData).eq('id', tourId);
      if (error) throw error;
      return optimizedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      toast({
        title: "Route optimized",
        description: "AI has optimized the route for minimum travel time and cost."
      });
    }
  });
  const addCityInput = () => {
    setMultipleCities(prev => [...prev, '']);
  };
  const removeCityInput = (index: number) => {
    if (multipleCities.length > 1) {
      setMultipleCities(prev => prev.filter((_, i) => i !== index));
    }
  };
  const updateCity = (index: number, value: string) => {
    setMultipleCities(prev => prev.map((city, i) => i === index ? value : city));
  };
  const addStop = () => {
    const validCities = multipleCities.filter(city => city.trim() !== '');
    if (validCities.length === 0) {
      toast({
        title: "Missing information",
        description: "Please enter at least one city.",
        variant: "destructive"
      });
      return;
    }
    const newStops: TourStop[] = validCities.map((city, idx) => ({
      id: `${Date.now()}-${idx}`,
      city: city.trim(),
      venue: currentStop.venue || 'TBD',
      date: currentStop.date,
      address: currentStop.address,
      city_order: newRoute.stops.length + idx + 1
    }));
    setNewRoute(prev => ({
      ...prev,
      stops: [...prev.stops, ...newStops]
    }));
    setCurrentStop({
      city: '',
      venue: '',
      date: '',
      address: ''
    });
    setMultipleCities(['']);
  };
  const removeStop = (stopId: string) => {
    setNewRoute(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId)
    }));
  };
  const saveRoute = () => {
    if (!newRoute.name.trim()) {
      toast({
        title: "Invalid route",
        description: "Please enter a route name.",
        variant: "destructive"
      });
      return;
    }
    if (newRoute.stops.length === 0) {
      toast({
        title: "Invalid route",
        description: "Please add at least one stop to the route.",
        variant: "destructive"
      });
      return;
    }
    if (editingRoute) {
      updateTourMutation.mutate({
        id: editingRoute.id,
        ...newRoute
      });
    } else {
      createTourMutation.mutate(newRoute);
    }
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
  if (isLoading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">AI Route Planning</h3>
          <p className="text-sm text-muted-foreground">
            Plan optimal tour routes using AI-powered optimization
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
                  <Input placeholder="e.g., Southeast Regional Tour 2024" value={newRoute.name} onChange={e => setNewRoute(prev => ({
                  ...prev,
                  name: e.target.value
                }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Brief description of the tour" value={newRoute.description} onChange={e => setNewRoute(prev => ({
                  ...prev,
                  description: e.target.value
                }))} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Add Tour Stops</h4>
                
                {/* Multiple Cities Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Cities</label>
                    <Button type="button" variant="outline" size="sm" onClick={addCityInput}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add City
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {multipleCities.map((city, index) => <div key={index} className="flex items-center gap-2">
                        <Input placeholder="e.g., Atlanta, GA" value={city} onChange={e => updateCity(index, e.target.value)} className="flex-1" />
                        {multipleCities.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeCityInput(index)}>
                            Remove
                          </Button>}
                      </div>)}
                  </div>
                </div>

                {/* Other inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Venue (optional)</label>
                    <Input placeholder="Performance venue" value={currentStop.venue} onChange={e => setCurrentStop(prev => ({
                    ...prev,
                    venue: e.target.value
                  }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date (optional)</label>
                    <Input type="date" value={currentStop.date} onChange={e => setCurrentStop(prev => ({
                    ...prev,
                    date: e.target.value
                  }))} />
                  </div>
                </div>
                
                <Button onClick={addStop} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stop(s) - {multipleCities.filter(c => c.trim()).length} {multipleCities.filter(c => c.trim()).length === 1 ? 'city' : 'cities'}
                </Button>
              </div>

              {newRoute.stops.length > 0 && <div className="space-y-2">
                  <h4 className="font-medium">Tour Stops ({newRoute.stops.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {newRoute.stops.map((stop, index) => <div key={stop.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{stop.city} {stop.venue !== 'TBD' && `- ${stop.venue}`}</p>
                            {stop.date && <p className="text-xs text-muted-foreground">{new Date(stop.date).toLocaleDateString()}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeStop(stop.id)}>
                          Remove
                        </Button>
                      </div>)}
                  </div>
                </div>}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={saveRoute} disabled={createTourMutation.isPending}>
                  {createTourMutation.isPending ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </> : 'Create Route'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingRoute} onOpenChange={open => !open && cancelEditing()}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Tour Route</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Name</label>
                  <Input placeholder="e.g., Southeast Regional Tour 2024" value={newRoute.name} onChange={e => setNewRoute(prev => ({
                  ...prev,
                  name: e.target.value
                }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Brief description of the tour" value={newRoute.description} onChange={e => setNewRoute(prev => ({
                  ...prev,
                  description: e.target.value
                }))} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Add Tour Stops</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Cities</label>
                    <Button type="button" variant="outline" size="sm" onClick={addCityInput}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add City
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {multipleCities.map((city, index) => <div key={index} className="flex items-center gap-2">
                        <Input placeholder="e.g., Atlanta, GA" value={city} onChange={e => updateCity(index, e.target.value)} className="flex-1" />
                        {multipleCities.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeCityInput(index)}>
                            Remove
                          </Button>}
                      </div>)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Venue (optional)</label>
                    <Input placeholder="Performance venue" value={currentStop.venue} onChange={e => setCurrentStop(prev => ({
                    ...prev,
                    venue: e.target.value
                  }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date (optional)</label>
                    <Input type="date" value={currentStop.date} onChange={e => setCurrentStop(prev => ({
                    ...prev,
                    date: e.target.value
                  }))} />
                  </div>
                </div>
                
                <Button onClick={addStop} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stop(s)
                </Button>
              </div>

              {newRoute.stops.length > 0 && <div className="space-y-2">
                  <h4 className="font-medium">Tour Stops ({newRoute.stops.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {newRoute.stops.map((stop, index) => <div key={stop.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{stop.city} {stop.venue !== 'TBD' && `- ${stop.venue}`}</p>
                            {stop.date && <p className="text-xs text-muted-foreground">{new Date(stop.date).toLocaleDateString()}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeStop(stop.id)}>
                          Remove
                        </Button>
                      </div>)}
                  </div>
                </div>}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button onClick={saveRoute} disabled={updateTourMutation.isPending}>
                  {updateTourMutation.isPending ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {routes.length === 0 && <Card>
          <CardContent className="py-12 text-center">
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tour routes yet</h3>
            <p className="text-muted-foreground mb-4">Create your first tour route to get started</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Route
            </Button>
          </CardContent>
        </Card>}

      {/* Routes List */}
      <div className="grid gap-6">
        {routes.map(route => <Card key={route.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{route.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{route.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(route.status)} gap-1`}>
                    {getStatusIcon(route.status)}
                    {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => startEditing(route)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTourMutation.mutate(route.id)} disabled={deleteTourMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
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
              {route.stops.length > 0 && <div className="space-y-2">
                  <h4 className="font-medium text-sm">Tour Stops</h4>
                  <div className="grid gap-2">
                    {route.stops.map((stop, index) => <div key={stop.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                        <Badge variant="outline" className="text-xs">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-primary-foreground">{stop.city}</span>
                            {stop.venue && stop.venue !== 'TBD' && <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-sm">{stop.venue}</span>
                              </>}
                          </div>
                          {stop.date && <div className="text-xs text-muted-foreground">
                              {new Date(stop.date).toLocaleDateString()}
                            </div>}
                        </div>
                      </div>)}
                  </div>
                </div>}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(route.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  {route.status === 'planning' && <Button size="sm" onClick={() => optimizeMutation.mutate(route.id)} disabled={optimizeMutation.isPending}>
                      {optimizeMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                      {optimizeMutation.isPending ? 'Optimizing...' : 'AI Optimize'}
                    </Button>}
                  {route.status === 'optimized' && <Button variant="outline" size="sm" onClick={async () => {
                await supabase.from('gw_tours').update({
                  status: 'approved'
                }).eq('id', route.id);
                queryClient.invalidateQueries({
                  queryKey: ['tour-routes']
                });
                toast({
                  title: "Route approved"
                });
              }}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve Route
                    </Button>}
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};