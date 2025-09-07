import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  is_visible: boolean;
  is_default: boolean;
}

export const useCalendars = () => {
  return useQuery({
    queryKey: ['calendars'],
    queryFn: async (): Promise<CalendarInfo[]> => {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('*')
        .eq('is_visible', true)
        .order('name');

      if (error) {
        console.error('Error fetching calendars:', error);
        throw error;
      }

      return data || [];
    }
  });
};