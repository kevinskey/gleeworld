import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface USCCBReading {
  title: string;
  citation: string;
  content: string;
}

export interface USCCBLiturgicalData {
  date: string;
  season: string;
  week: string;
  readings: {
    first_reading?: USCCBReading;
    responsorial_psalm?: USCCBReading;
    second_reading?: USCCBReading;
    gospel?: USCCBReading;
  };
  saint_of_day?: string;
  liturgical_color?: string;
  title?: string;
}

export const useUSCCBSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [liturgicalData, setLiturgicalData] = useState<USCCBLiturgicalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const syncLiturgicalData = useCallback(async (date: string) => {
    if (!date) {
      setError('Date is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Syncing liturgical data for date:', date);

      const { data, error: functionError } = await supabase.functions.invoke('sync-usccb-liturgical', {
        body: { date }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Failed to sync liturgical data');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch liturgical data');
      }

      console.log('Successfully synced liturgical data:', data.data);
      setLiturgicalData(data.data);

      toast({
        title: "Liturgical Data Synced",
        description: `Successfully loaded readings for ${new Date(date).toLocaleDateString()}`,
      });

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync liturgical data';
      console.error('Error syncing liturgical data:', err);
      setError(errorMessage);
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearData = useCallback(() => {
    setLiturgicalData(null);
    setError(null);
  }, []);

  return {
    syncLiturgicalData,
    liturgicalData,
    isLoading,
    error,
    clearData
  };
};