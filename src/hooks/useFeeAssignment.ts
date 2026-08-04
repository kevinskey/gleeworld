import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeeAssignment = () => {
  const assign = useCallback(async (templateId: string, userIds: string[]): Promise<number> => {
    const { data, error } = await supabase.rpc('assign_fee_template', {
      p_template_id: templateId,
      p_user_ids: userIds,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  }, []);

  return { assign };
};
