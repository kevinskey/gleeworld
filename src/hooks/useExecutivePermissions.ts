import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ExecutivePositionType = Database['public']['Enums']['executive_position'];

export interface AppFunction {
  id: string;
  name: string;
  description: string;
  category: string;
  module: string;
  is_active: boolean;
}

export interface PositionFunction {
  id: string;
  position: ExecutivePositionType;
  function_id: string;
  can_access: boolean;
  can_manage: boolean;
  function: AppFunction;
}

export interface ExecutivePosition {
  value: ExecutivePositionType;
  label: string;
}

export const EXECUTIVE_POSITIONS: ExecutivePosition[] = [
  { value: 'president', label: 'President' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'tour_manager', label: 'Tour Manager' },
  { value: 'wardrobe_manager', label: 'Wardrobe Manager' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'historian', label: 'Historian' },
  { value: 'pr_coordinator', label: 'PR Coordinator' },
  { value: 'chaplain', label: 'Chaplain' },
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'assistant_chaplain', label: 'Assistant Chaplain' },
  { value: 'pr_manager', label: 'PR Manager' },
  { value: 'student_conductor', label: 'Student Conductor' },
  { value: 'set_up_crew_manager', label: 'Set Up Crew Manager' },
  { value: 'chief_of_staff', label: 'Chief of Staff' }
];

export const useExecutivePermissions = () => {
  const [appFunctions, setAppFunctions] = useState<AppFunction[]>([]);
  const [positionFunctions, setPositionFunctions] = useState<PositionFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppFunctions = async () => {
    const { data, error } = await supabase
      .from('gw_app_functions')
      .select('*')
      .eq('is_active', true)
      .order('category, name');

    if (error) {
      console.error('Error fetching app functions:', error);
      toast({
        title: "Error",
        description: "Failed to load app functions",
        variant: "destructive"
      });
      return;
    }

    setAppFunctions(data || []);
  };

  const fetchPositionFunctions = async (position: ExecutivePositionType) => {
    const { data, error } = await supabase
      .from('gw_executive_position_functions')
      .select(`
        *,
        function:gw_app_functions!inner(*)
      `)
      .eq('position', position);

    if (error) {
      console.error('Error fetching position functions:', error);
      toast({
        title: "Error",
        description: "Failed to load position functions",
        variant: "destructive"
      });
      return;
    }

    setPositionFunctions(data || []);
  };

  const updatePermission = async (
    position: ExecutivePositionType,
    functionId: string,
    permissionType: 'can_access' | 'can_manage',
    value: boolean
  ) => {
    try {
      // First, try to update existing record
      const { data: existingData, error: selectError } = await supabase
        .from('gw_executive_position_functions')
        .select('id')
        .eq('position', position)
        .eq('function_id', functionId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('gw_executive_position_functions')
          .update({ [permissionType]: value })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('gw_executive_position_functions')
          .insert({
            position,
            function_id: functionId,
            [permissionType]: value,
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchPositionFunctions(position);

      toast({
        title: "Success",
        description: "Permission updated successfully"
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    }
  };

  const getPermissionForFunction = (functionId: string) => {
    return positionFunctions.find(pf => pf.function_id === functionId) || {
      can_access: false,
      can_manage: false
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAppFunctions();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    appFunctions,
    positionFunctions,
    loading,
    fetchPositionFunctions,
    updatePermission,
    getPermissionForFunction
  };
};