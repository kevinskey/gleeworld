import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

export interface OnboardingProfile {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  preferred_name?: string;
  pronouns?: string;
  email?: string;
  phone?: string;
  voice_part?: string;
  section?: string;
  grad_year?: number;
  height_cm?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  shoe?: number;
  photo_consent?: boolean;
  media_release_signed_at?: string;
}

export const useOnboardingProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch existing profile or create new one
  const fetchOrCreateProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try to fetch existing profile
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data) {
        // Profile exists, use it
        setProfile(data);
      } else {
        // No profile exists, create a new one
        const newProfile = {
          user_id: user.id,
          email: user.email,
          photo_consent: false,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('gw_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        setProfile(createdProfile);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce(async (updates: Partial<OnboardingProfile>) => {
      if (!user || !profile.id) return;

      try {
        setSaving(true);

        const { error } = await supabase
          .from('gw_profiles')
          .update(updates)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
      } catch (error) {
        toast({
          title: "Save Error",
          description: "Failed to save changes",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }, 500),
    [user, profile.id, toast]
  );

  // Update profile field
  const updateField = useCallback((field: keyof OnboardingProfile, value: any) => {
    const updatedProfile = { ...profile, [field]: value };
    setProfile(updatedProfile);
    
    // Only save the changed field to database
    debouncedUpdate({ [field]: value });
  }, [profile, debouncedUpdate]);

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<OnboardingProfile>) => {
    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    debouncedUpdate(updates);
  }, [profile, debouncedUpdate]);

  // Get completion status for each step
  const getStepCompletion = useCallback(() => {
    return {
      profile: !!(profile.first_name && profile.last_name && profile.email),
      uniform: !!(profile.height_cm && profile.chest && profile.waist && profile.hips && profile.shoe),
      agreements: !!(profile.photo_consent && profile.media_release_signed_at),
    };
  }, [profile]);

  useEffect(() => {
    fetchOrCreateProfile();
  }, [fetchOrCreateProfile]);

  return {
    profile,
    loading,
    saving,
    updateField,
    updateFields,
    getStepCompletion,
    refetch: fetchOrCreateProfile,
  };
};