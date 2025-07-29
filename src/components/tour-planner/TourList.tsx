import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, DollarSign, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface Tour {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  number_of_singers: number;
  budget: number | null;
  status: 'draft' | 'planning' | 'confirmed' | 'archived';
  created_at: string;
  _count?: {
    cities: number;
  };
}

interface TourListProps {
  onSelectTour: (tourId: string) => void;
}

export const TourList: React.FC<TourListProps> = ({ onSelectTour }) => {
  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tours')
        .select(`
          *,
          gw_tour_cities!inner(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include city count
      return data.map(tour => ({
        ...tour,
        _count: {
          cities: tour.gw_tour_cities?.length || 0
        }
      }));
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'planning':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'archived':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tours.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tours yet</h3>
            <p className="text-muted-foreground">
              Create your first tour to start planning your next adventure
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map((tour) => (
            <Card key={tour.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {tour.name}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(tour.status)}>
                    {tour.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(tour.start_date), 'MMM d')} - {format(new Date(tour.end_date), 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{tour._count?.cities || 0} cities</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{tour.number_of_singers} singers</span>
                </div>

                {tour.budget && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${tour.budget.toLocaleString()}</span>
                  </div>
                )}

                <Button 
                  onClick={() => onSelectTour(tour.id)}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Edit className="h-4 w-4" />
                  Edit Tour
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};