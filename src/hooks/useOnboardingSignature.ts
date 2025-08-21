import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveSignatureParams {
  signatureData: string;
  fullName: string;
  onboardingStep?: string;
  signatureType?: string;
}

export const useOnboardingSignature = () => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveSignature = async ({
    signatureData,
    fullName,
    onboardingStep = 'initial_agreement',
    signatureType = 'digital'
  }: SaveSignatureParams) => {
    setSaving(true);
    
    try {
      // Get client IP and user agent
      const userAgent = navigator.userAgent;
      
      // First, let's validate the data
      if (!signatureData || signatureData.length < 10) {
        throw new Error('Invalid signature data');
      }
      
      if (!fullName || fullName.trim().length < 2) {
        throw new Error('Full name must be at least 2 characters');
      }

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to save your signature');
      }

      console.log('Saving signature for user:', user.id);
      console.log('Signature data length:', signatureData.length);
      console.log('Full name:', fullName);

      // Use the secure function to save the signature
      const { data, error } = await supabase.rpc('save_onboarding_signature', {
        p_signature_data: signatureData,
        p_full_name: fullName.trim(),
        p_onboarding_step: onboardingStep,
        p_signature_type: signatureType,
        p_ip_address: null, // We can't get real IP from client-side
        p_user_agent: userAgent
      });

      if (error) {
        console.error('Database error saving signature:', error);
        throw new Error(error.message || 'Failed to save signature');
      }

      console.log('Signature saved successfully with ID:', data);
      setSaved(true);
      toast.success('Signature saved successfully!');
      
      return data; // Returns the signature ID
      
    } catch (error) {
      console.error('Error saving signature:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save signature';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const checkExistingSignature = async (onboardingStep: string = 'initial_agreement') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('onboarding_signatures')
        .select('*')
        .eq('user_id', user.id)
        .eq('onboarding_step', onboardingStep)
        .eq('is_valid', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing signature:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error checking existing signature:', error);
      return null;
    }
  };

  return {
    saveSignature,
    checkExistingSignature,
    saving,
    saved
  };
};