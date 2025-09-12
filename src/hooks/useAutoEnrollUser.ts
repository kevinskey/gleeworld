
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AutoEnrollResult {
  success: boolean;
  user_id?: string;
  profile?: any;
  temp_password?: string;
  message?: string;
  enrolled: boolean;
  error?: string;
}

export const useAutoEnrollUser = () => {
  const { toast } = useToast();
  const [enrolling, setEnrolling] = useState(false);

  const autoEnrollUser = async (
    email: string, 
    full_name?: string, 
    contract_id?: string,
    role?: string
  ): Promise<AutoEnrollResult> => {
    setEnrolling(true);
    
    try {
      console.log('Auto-enrolling user:', email);
      
      // Get current session for explicit Authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      let result: AutoEnrollResult | null = null;

      try {
        // Primary path: standard Supabase invoke
        const { data, error } = await supabase.functions.invoke('auto-enroll-user', {
          body: { email, full_name, contract_id, role },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (error) {
          console.error('Error auto-enrolling user (invoke):', { error, data });
          const detail = (data as any)?.error || (data as any)?.message || error.message || 'Failed to auto-enroll user';
          throw new Error(detail);
        }

        result = data as AutoEnrollResult;
      } catch (invokeErr: any) {
        // Fallback path: direct fetch to Edge Function endpoint (handles rare invoke transport issues)
        const msg = invokeErr?.message || '';
        if (msg.includes('Failed to send a request to the Edge Function') || msg.includes('Load failed')) {
          console.warn('Falling back to direct Edge Function call...');
          const resp = await fetch('https://oopmlreysjzuxzylyheb.functions.supabase.co/auto-enroll-user', {
            method: 'POST',
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, full_name, contract_id, role }),
          });

          const json = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            const detail = (json as any)?.error || (json as any)?.message || `HTTP ${resp.status}`;
            throw new Error(detail);
          }
          result = json as AutoEnrollResult;
        } else {
          throw invokeErr;
        }
      }

      console.log('Auto-enroll result:', result);

      if (result?.enrolled) {
        toast({
          title: "User Auto-Enrolled",
          description: `${email} has been automatically enrolled in the system.`,
        });
      }

      return result as AutoEnrollResult;
    } catch (error: any) {
      console.error('Auto-enroll error:', error);
      toast({
        title: "Auto-Enrollment Failed",
        description: error.message || "Failed to auto-enroll user",
        variant: "destructive",
      });
      
      return {
        success: false,
        enrolled: false,
        error: error.message
      };
    } finally {
      setEnrolling(false);
    }
  };

  return {
    autoEnrollUser,
    enrolling
  };
};
