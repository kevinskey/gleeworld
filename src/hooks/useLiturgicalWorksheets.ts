import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface LiturgicalWorksheet {
  id: string;
  user_id: string;
  liturgical_date: string;
  liturgical_season: string;
  readings: {
    first_reading?: string;
    psalm?: string;
    second_reading?: string;
    gospel?: string;
  };
  responsorial_psalm_musicxml?: string;
  music_selections: {
    entrance_hymn?: string;
    responsorial_psalm?: string;
    alleluia?: string;
    offertory?: string;
    communion?: string;
    closing_hymn?: string;
  };
  special_instructions?: string;
  theme?: string;
  notes?: string;
  status: 'draft' | 'completed' | 'published';
  created_at: string;
  updated_at: string;
}

export const useLiturgicalWorksheets = () => {
  const [worksheets, setWorksheets] = useState<LiturgicalWorksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchWorksheets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liturgical_worksheets')
        .select('*')
        .order('liturgical_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(worksheet => ({
        ...worksheet,
        readings: (worksheet.readings as any) || {},
        music_selections: (worksheet.music_selections as any) || {},
      })) as LiturgicalWorksheet[];

      setWorksheets(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching liturgical worksheets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch worksheets');
      toast({
        title: "Error",
        description: "Failed to load liturgical worksheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorksheet = async (worksheetData: Partial<LiturgicalWorksheet>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create worksheets",
        variant: "destructive",
      });
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Prepare the data for insertion
      const insertData = {
        user_id: user.id,
        liturgical_date: worksheetData.liturgical_date || '',
        liturgical_season: worksheetData.liturgical_season || '',
        readings: worksheetData.readings || {},
        responsorial_psalm_musicxml: worksheetData.responsorial_psalm_musicxml,
        music_selections: worksheetData.music_selections || {},
        special_instructions: worksheetData.special_instructions,
        theme: worksheetData.theme,
        notes: worksheetData.notes,
        status: worksheetData.status || 'draft',
      };

      const { data, error } = await supabase
        .from('liturgical_worksheets')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        readings: (data.readings as any) || {},
        music_selections: (data.music_selections as any) || {},
      } as LiturgicalWorksheet;

      setWorksheets(prev => [transformedData, ...prev]);
      toast({
        title: "Success",
        description: "Liturgical worksheet created successfully",
      });

      return { success: true, data };
    } catch (err) {
      console.error('Error creating worksheet:', err);
      toast({
        title: "Error",
        description: "Failed to create worksheet",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  const updateWorksheet = async (id: string, updates: Partial<LiturgicalWorksheet>) => {
    try {
      const { data, error } = await supabase
        .from('liturgical_worksheets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        readings: (data.readings as any) || {},
        music_selections: (data.music_selections as any) || {},
      } as LiturgicalWorksheet;

      setWorksheets(prev => 
        prev.map(worksheet => 
          worksheet.id === id ? { ...worksheet, ...transformedData } : worksheet
        )
      );

      toast({
        title: "Success",
        description: "Worksheet updated successfully",
      });

      return { success: true, data };
    } catch (err) {
      console.error('Error updating worksheet:', err);
      toast({
        title: "Error",
        description: "Failed to update worksheet",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  const deleteWorksheet = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liturgical_worksheets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorksheets(prev => prev.filter(worksheet => worksheet.id !== id));
      toast({
        title: "Success",
        description: "Worksheet deleted successfully",
      });

      return { success: true };
    } catch (err) {
      console.error('Error deleting worksheet:', err);
      toast({
        title: "Error",
        description: "Failed to delete worksheet",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchWorksheets();
  }, []);

  return {
    worksheets,
    loading,
    error,
    createWorksheet,
    updateWorksheet,
    deleteWorksheet,
    refetch: fetchWorksheets,
  };
};