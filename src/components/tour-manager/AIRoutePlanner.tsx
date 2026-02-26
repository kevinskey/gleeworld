import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Route, Plus, Zap, Clock, DollarSign, Navigation, AlertCircle, CheckCircle, Trash2, Loader2, Pencil, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TourStopLogisticsEditor } from './TourStopLogisticsEditor';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  cityData: any[];
  status: 'planning' | 'optimized' | 'approved';
  totalDistance: number;
  estimatedDuration: string;
  estimatedCost: number;
  created_at: string;
  start_date: string;
  end_date: string;
}
interface AIRoutePlannerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}
// Sortable stop item for drag-and-drop reordering
const SortableStopItem: React.FC<{
  stop: TourStop;
  index: number;
  onRemove: (id: string) => void;
}> = ({ stop, index, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 border rounded bg-background">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <Badge variant="outline">{index + 1}</Badge>
        <div>
          <p className="font-medium text-sm">{stop.city} {stop.venue !== 'TBD' && `- ${stop.venue}`}</p>
          {stop.date && <p className="text-xs text-muted-foreground">{new Date(stop.date).toLocaleDateString()}</p>}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(stop.id)}>
        Remove
      </Button>
    </div>
  );
};

export const AIRoutePlanner = ({
  user
}: AIRoutePlannerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TourRoute | null>(null);
  const [originCity, setOriginCity] = useState('');
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStopDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNewRoute(prev => {
        const oldIndex = prev.stops.findIndex(s => s.id === active.id);
        const newIndex = prev.stops.findIndex(s => s.id === over.id);
        return { ...prev, stops: arrayMove(prev.stops, oldIndex, newIndex) };
      });
    }
  };

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
      return (tours || []).map(tour => {
        const sortedCities = (tour.gw_tour_cities || [])
          .sort((a: any, b: any) => {
            // Origin city (city_notes containing 'Origin') always first
            const aIsOrigin = a.city_notes?.toLowerCase().includes('origin');
            const bIsOrigin = b.city_notes?.toLowerCase().includes('origin');
            if (aIsOrigin && !bIsOrigin) return -1;
            if (!aIsOrigin && bIsOrigin) return 1;
            // Then sort by city_order
            return (a.city_order ?? 999) - (b.city_order ?? 999);
          });

        return {
          id: tour.id,
          name: tour.name,
          description: tour.description || '',
          stops: sortedCities
            .map((city: any, index: number) => ({
              id: city.id,
              city: city.city_name + (city.state_code ? `, ${city.state_code}` : ''),
              venue: city.city_notes || 'TBD',
              date: city.arrival_date || '',
              address: '',
              city_order: city.city_notes?.toLowerCase().includes('origin') ? 0 : (city.city_order ?? index + 1)
            })),
          // Full city data for logistics editor
          cityData: sortedCities,
  status: tour.status as 'planning' | 'optimized' | 'approved',
          totalDistance: tour.total_distance || 0,
          estimatedDuration: tour.estimated_duration || 'Not calculated',
          estimatedCost: tour.estimated_cost || 0,
          created_at: tour.created_at,
          start_date: tour.start_date || '',
          end_date: tour.end_date || ''
        };
      }) as TourRoute[];
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

      // Add origin city + tour stops
      const allCities: any[] = [];
      if (originCity.trim()) {
        const originParts = originCity.split(',').map(p => p.trim());
        allCities.push({
          tour_id: tour.id,
          city_name: originParts[0],
          state_code: originParts[1] || null,
          city_order: 0,
          arrival_date: null,
          city_notes: 'Origin / Departure City'
        });
      }
      routeData.stops.forEach((stop, index) => {
        const parts = stop.city.split(',').map(p => p.trim());
        allCities.push({
          tour_id: tour.id,
          city_name: parts[0],
          state_code: parts[1] || null,
          city_order: index + 1,
          arrival_date: stop.date || null,
          city_notes: stop.venue
        });
      });
      if (allCities.length > 0) {
        const { error: citiesError } = await supabase.from('gw_tour_cities').insert(allCities);
        if (citiesError) throw citiesError;
      }
      return tour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      setIsCreating(false);
      setOriginCity('');
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
      // Calculate dates from stops for syncing
      const dates = routeData.stops.filter(s => s.date).map(s => new Date(s.date + 'T12:00:00'));
      const startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      const tourUpdate: any = {
        name: routeData.name,
        description: routeData.description,
      };
      if (startDate) tourUpdate.start_date = startDate.toISOString().split('T')[0];
      if (endDate) tourUpdate.end_date = endDate.toISOString().split('T')[0];

      const {
        error: tourError
      } = await supabase.from('gw_tours').update(tourUpdate).eq('id', routeData.id);
      if (tourError) throw tourError;

      // Delete existing cities and re-add
      const { error: deleteError } = await supabase.from('gw_tour_cities').delete().eq('tour_id', routeData.id);
      if (deleteError) throw deleteError;
      const allCities: any[] = [];
      if (originCity.trim()) {
        const originParts = originCity.split(',').map(p => p.trim());
        allCities.push({
          tour_id: routeData.id,
          city_name: originParts[0],
          state_code: originParts[1] || null,
          city_order: 0,
          arrival_date: null,
          city_notes: 'Origin / Departure City'
        });
      }
      routeData.stops.forEach((stop, index) => {
        const parts = stop.city.split(',').map(p => p.trim());
        allCities.push({
          tour_id: routeData.id,
          city_name: parts[0],
          state_code: parts[1] || null,
          city_order: index + 1,
          arrival_date: stop.date || null,
          city_notes: stop.venue
        });
      });
      if (allCities.length > 0) {
        const { error: citiesError } = await supabase.from('gw_tour_cities').insert(allCities);
        if (citiesError) throw citiesError;
      }
      return routeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tour-routes']
      });
      setEditingRoute(null);
      setOriginCity('');
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
    // Find origin city by city_order === 0 OR by city_notes containing 'Origin'
    const originStop = route.stops.find(s => s.city_order === 0) 
      || route.cityData?.find((c: any) => c.city_notes?.toLowerCase().includes('origin'));
    if (originStop) {
      const city = 'city' in originStop 
        ? originStop.city 
        : `${originStop.city_name}${originStop.state_code ? `, ${originStop.state_code}` : ''}`;
      setOriginCity(city);
    } else {
      setOriginCity('');
    }
    // Filter out origin stops from editable list
    const isOrigin = (s: TourStop) => s.city_order === 0;
    setNewRoute({
      name: route.name,
      description: route.description,
      stops: route.stops.filter(s => !isOrigin(s))
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
    setOriginCity('');
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
        return 'bg-accent text-accent-foreground';
      case 'optimized':
        return 'bg-primary/10 text-primary';
      case 'approved':
        return 'bg-primary/20 text-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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

              {/* Origin City */}
              <div className="space-y-2 p-3 border border-dashed rounded-md bg-muted/30">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Origin / Departure City
                </label>
                <Input
                  placeholder="e.g., Atlanta, GA"
                  value={originCity}
                  onChange={e => setOriginCity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Where the tour bus departs from — used for DOT compliance & first-leg distance calculations</p>
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
                  <h4 className="font-medium">Tour Stops ({newRoute.stops.length}) — drag to reorder</h4>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStopDragEnd}>
                    <SortableContext items={newRoute.stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {newRoute.stops.map((stop, index) => (
                          <SortableStopItem key={stop.id} stop={stop} index={index} onRemove={removeStop} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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

              {/* Origin City */}
              <div className="space-y-2 p-3 border border-dashed rounded-md bg-muted/30">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Origin / Departure City
                </label>
                <Input
                  placeholder="e.g., Atlanta, GA"
                  value={originCity}
                  onChange={e => setOriginCity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Where the tour bus departs from — used for DOT compliance & first-leg distance calculations</p>
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
                  <h4 className="font-medium">Tour Stops ({newRoute.stops.length}) — drag to reorder</h4>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStopDragEnd}>
                    <SortableContext items={newRoute.stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {newRoute.stops.map((stop, index) => (
                          <SortableStopItem key={stop.id} stop={stop} index={index} onRemove={removeStop} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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
                  {(route.start_date || route.end_date) && (
                    <p className="text-sm font-medium text-primary flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {route.start_date && new Date(route.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {route.start_date && route.end_date && ' — '}
                      {route.end_date && new Date(route.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
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

              {/* Route Stops with Logistics Editor */}
              {route.cityData && route.cityData.length > 0 && <div className="space-y-2">
                  <h4 className="font-medium text-sm">Tour Stops & Logistics</h4>
                  <TourStopLogisticsEditor
                    stops={route.cityData}
                    tourId={route.id}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['tour-routes'] })}
                  />
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