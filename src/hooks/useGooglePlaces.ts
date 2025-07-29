import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  city_name: string;
  state: string;
  country: string;
}

export interface GooglePlacesResponse {
  predictions: PlacePrediction[];
}

export const useGooglePlaces = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCities = useCallback(async (query: string): Promise<PlacePrediction[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Searching cities with query:', query);
      
      const { data, error: functionError } = await supabase.functions.invoke('google-places-lookup', {
        body: { query: query.trim() }
      });

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(functionError.message || 'Failed to search cities');
      }

      console.log('Google Places API response:', data);
      
      return data?.predictions || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search cities';
      console.error('Error searching cities:', err);
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchCities,
    isLoading,
    error
  };
};