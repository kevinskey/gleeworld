import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RegistrationData {
  role: 'fan' | 'alumna';
  graduationYear?: number;
  voicePart?: string;
}

export const useRegistrationRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRegistrationRequest = async (
    userId: string,
    email: string,
    fullName: string,
    data: RegistrationData
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Create the registration request
      const { data: requestData, error: insertError } = await supabase
        .from('registration_requests')
        .insert({
          user_id: userId,
          email,
          full_name: fullName,
          requested_role: data.role,
          graduation_year: data.graduationYear || null,
          voice_part: data.voicePart || null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Send notification to webmaster
      try {
        await supabase.functions.invoke('gw-registration-notification', {
          body: {
            requestId: requestData.id,
            email,
            fullName,
            requestedRole: data.role,
            graduationYear: data.graduationYear,
            voicePart: data.voicePart
          }
        });
      } catch (notifyError) {
        // Log but don't fail the registration if notification fails
        console.error('Failed to send notification:', notifyError);
      }

      return { success: true, requestId: requestData.id };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create registration request';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRequest = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking existing request:', err);
      return null;
    }
  };

  return {
    createRegistrationRequest,
    checkExistingRequest,
    loading,
    error
  };
};
