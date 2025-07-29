import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TourOverview } from './TourOverview';
import { TourCities } from './TourCities';
import { TourTasks } from './TourTasks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TourEditorProps {
  tourId: string | null;
  onBack: () => void;
  isCreating: boolean;
}

export const TourEditor: React.FC<TourEditorProps> = ({ tourId, onBack, isCreating }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: async () => {
      if (!tourId) return null;
      
      const { data, error } = await supabase
        .from('gw_tours')
        .select(`
          *,
          gw_tour_cities(*),
          gw_tour_participants(*),
          gw_tour_tasks(*)
        `)
        .eq('id', tourId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tourId && !isCreating,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-muted rounded"></div>
          <div className="h-8 w-48 bg-muted rounded"></div>
        </div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tours
        </Button>
        <h2 className="text-2xl font-semibold">
          {isCreating ? 'Create New Tour' : tour?.name || 'Edit Tour'}
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cities">Cities & Route</TabsTrigger>
          <TabsTrigger value="logistics" disabled={isCreating}>Logistics</TabsTrigger>
          <TabsTrigger value="tasks" disabled={isCreating}>Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TourOverview 
            tour={tour} 
            isCreating={isCreating}
            onSaved={onBack}
          />
        </TabsContent>

        <TabsContent value="cities">
          <TourCities tourId={tourId} tour={tour} />
        </TabsContent>

        <TabsContent value="logistics">
          <div className="text-center py-12 text-muted-foreground">
            Logistics panel will be implemented in the next phase
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TourTasks tourId={tourId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};