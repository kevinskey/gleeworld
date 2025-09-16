import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      console.log('About to call sync-usccb-liturgical function...');

      // First attempt: standard invoke
      const { data, error: functionError } = await supabase.functions.invoke('sync-usccb-liturgical', {
        body: { date }
      });

      console.log('Invoke response:', { data, functionError });

      let result = data as any;

      // Fallback to direct fetch if invoke fails to send
      if (functionError || !result) {
        console.warn('Invoke failed or returned no data, attempting direct fetch fallback...');
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          const resp = await fetch('https://oopmlreysjzuxzylyheb.functions.supabase.co/sync-usccb-liturgical', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': (supabase as any).headers?.['x-client-info'] ? '' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ date })
          });

          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Direct fetch failed: ${resp.status} ${txt}`);
          }
          result = await resp.json();
        } catch (fallbackErr) {
          console.error('Direct fetch fallback failed:', fallbackErr);
          throw functionError || fallbackErr;
        }
      }

      console.log('Function data details:', JSON.stringify(result, null, 2));

      const payload = result?.data ?? result; // support both shapes

      if (!result?.success && !payload?.season) {
        throw new Error(result?.error || 'Failed to fetch liturgical data');
      }

      console.log('Successfully synced liturgical data:', payload);
      setLiturgicalData(payload);

      toast({
        title: "Liturgical Data Loaded",
        description: `Successfully loaded liturgical calendar for ${new Date(date).toLocaleDateString()}`,
      });

      return payload;
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