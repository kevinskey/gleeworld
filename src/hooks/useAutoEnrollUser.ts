
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
    contract_id?: string
  ): Promise<AutoEnrollResult> => {
    setEnrolling(true);
    
    try {
      console.log('Auto-enrolling user:', email);
      
      const { data, error } = await supabase.functions.invoke('auto-enroll-user', {
        body: {
          email,
          full_name,
          contract_id
        }
      });

      if (error) {
        console.error('Error auto-enrolling user:', error);
        throw new Error(error.message || 'Failed to auto-enroll user');
      }

      console.log('Auto-enroll result:', data);

      if (data.enrolled) {
        toast({
          title: "User Auto-Enrolled",
          description: `${email} has been automatically enrolled in the system.`,
        });
      }

      return data;
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
