import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MapPin, GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TourCity {
  id: string;
  city_name: string;
  state_code: string;
  country_code: string;
  city_order: number;
  arrival_date: string | null;
  departure_date: string | null;
  city_notes: string | null;
}

interface TourCitiesProps {
  tourId: string | null;
  tour?: any;
}

export const TourCities: React.FC<TourCitiesProps> = ({ tourId, tour }) => {
  const [newCityName, setNewCityName] = useState('');
  const [isAddingCity, setIsAddingCity] = useState(false);
  const queryClient = useQueryClient();

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['tour-cities', tourId],
    queryFn: async () => {
      if (!tourId) return [];
      
      const { data, error } = await supabase
        .from('gw_tour_cities')
        .select('*')
        .eq('tour_id', tourId)
        .order('city_order');

      if (error) throw error;
      return data as TourCity[];
    },
    enabled: !!tourId,
  });

  const addCityMutation = useMutation({
    mutationFn: async (cityName: string) => {
      if (!tourId) throw new Error('No tour selected');

      // Simple city parsing - in a real app, you'd use Google Places API
      const parts = cityName.split(',').map(p => p.trim());
      const city = parts[0];
      const state = parts[1] || '';

      const { data, error } = await supabase
        .from('gw_tour_cities')
        .insert({
          tour_id: tourId,
          city_name: city,
          state_code: state,
          city_order: cities.length + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-cities', tourId] });
      setNewCityName('');
      setIsAddingCity(false);
      toast.success('City added successfully!');
    },
    onError: (error) => {
      console.error('Error adding city:', error);
      toast.error('Failed to add city');
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: async (cityId: string) => {
      const { error } = await supabase
        .from('gw_tour_cities')
        .delete()
        .eq('id', cityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-cities', tourId] });
      toast.success('City removed successfully!');
    },
    onError: (error) => {
      console.error('Error removing city:', error);
      toast.error('Failed to remove city');
    },
  });

  const handleAddCity = () => {
    if (newCityName.trim()) {
      addCityMutation.mutate(newCityName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCityName.trim()) {
      handleAddCity();
    }
  };

  if (!tourId) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Save the tour overview first to add cities</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tour Cities</CardTitle>
            <Button
              onClick={() => setIsAddingCity(true)}
              disabled={isAddingCity}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add City
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingCity && (
            <div className="flex gap-2 p-4 border border-dashed rounded-lg">
              <Input
                placeholder="Enter city, state (e.g. Atlanta, GA)"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <Button 
                onClick={handleAddCity} 
                disabled={!newCityName.trim() || addCityMutation.isPending}
                size="sm"
              >
                Add
              </Button>
              <Button 
                onClick={() => {
                  setIsAddingCity(false);
                  setNewCityName('');
                }} 
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : cities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No cities added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cities.map((city, index) => (
                <div
                  key={city.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  
                  <Badge variant="outline" className="min-w-[2rem] justify-center">
                    {index + 1}
                  </Badge>

                  <div className="flex-1">
                    <div className="font-medium">
                      {city.city_name}
                      {city.state_code && `, ${city.state_code}`}
                    </div>
                    {city.city_notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {city.city_notes}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => deleteCityMutation.mutate(city.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Route Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Interactive map and route optimization</p>
              <p className="text-sm">Google Maps integration will be implemented in the next phase</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};