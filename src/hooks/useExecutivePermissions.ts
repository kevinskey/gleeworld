import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EXECUTIVE_MODULE_IDS } from '@/config/executive-modules';
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
  { value: 'chief_of_staff', label: 'Chief of Staff' },
  { value: 'alumnae_liaison', label: 'Alumnae Liaison' },
  { value: 'choreographer', label: 'Choreographer' }
];

export const useExecutivePermissions = () => {
  const [appFunctions, setAppFunctions] = useState<AppFunction[]>([]);
  const [positionFunctions, setPositionFunctions] = useState<PositionFunction[]>([]);
  const [loading, setLoading] = useState(false); // Config-based system - no loading
  const { toast } = useToast();

  // Config-based system - use EXECUTIVE_MODULE_IDS instead of database
  const fetchAppFunctions = async () => {
    // Return config-based functions instead of database
    setLoading(false);
  };

  const fetchPositionFunctions = async (position: ExecutivePositionType) => {
    // Config-based system - all positions get all executive modules
    setLoading(false);
  };

  const updatePermission = async (
    position: ExecutivePositionType,
    functionId: string,
    permissionType: 'can_access' | 'can_manage',
    value: boolean
  ) => {
    // Config-based system - no database updates needed
    toast({
      title: "Success",
      description: "Permission updated (config-based system)"
    });
    return true;
  };

  const getPermissionForFunction = (functionId: string) => {
    // All executive board members have access to all modules in config
    return {
      can_access: true,
      can_manage: true
    };
  };

  useEffect(() => {
    setLoading(false);
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