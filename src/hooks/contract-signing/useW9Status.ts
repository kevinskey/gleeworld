
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { W9Form } from "@/types/contractSigning";

export const useW9Status = () => {
  const [w9Status, setW9Status] = useState<'required' | 'completed' | 'not_required'>('not_required');
  const [w9Form, setW9Form] = useState<W9Form | null>(null);
  const { user } = useAuth();

  const checkW9Status = useCallback(async () => {
    if (!user?.id) {
      console.log('useW9Status - No user for W9 check, setting not_required');
      setW9Status('not_required');
      setW9Form(null);
      return;
    }

    try {
      console.log('useW9Status - Checking W9 status for user:', user.id);
      
      // Force a fresh query by adding a timestamp to avoid any caching
      const { data: w9Forms, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('useW9Status - Error checking W9 status:', error);
        setW9Status('required'); // Default to required if there's an error
        setW9Form(null);
        return;
      }

      console.log('useW9Status - W9 forms query result:', w9Forms);
      console.log('useW9Status - W9 forms count:', w9Forms?.length || 0);

      if (!w9Forms || w9Forms.length === 0) {
        console.log('useW9Status - No W9 forms found, status: required');
        setW9Status('required');
        setW9Form(null);
      } else {
        console.log('useW9Status - W9 form found, status: completed');
        setW9Status('completed');
        setW9Form(w9Forms[0]);
      }
    } catch (error) {
      console.error('useW9Status - Unexpected error in W9 check:', error);
      setW9Status('required');
      setW9Form(null);
    }
  }, [user?.id]);

  return {
    w9Status,
    w9Form,
    checkW9Status
  };
};
