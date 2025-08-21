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
  middle_name?: string;
  display_name?: string;
  preferred_name?: string;
  pronouns?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  voice_part?: string;
  voice_part_preference?: string;
  graduation_year?: number;
  academic_year?: string;
  academic_major?: string;
  // Measurements (stored as JSON in existing measurements field)
  measurements?: {
    height_cm?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    shoe_size?: number;
  };
  // Wardrobe info (using existing fields)
  dress_size?: string;
  shoe_size?: string;
  // Consent and agreements (using existing fields)
  photo_consent?: boolean;
  media_consent?: boolean;
  data_consent?: boolean;
  media_release_signed_at?: string;
  media_release_signature?: string;
  // Additional existing fields
  emergency_contact?: string;
  dietary_restrictions?: string[];
  allergies?: string;
  parent_guardian_contact?: string;
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
        // Profile exists, parse measurements if it's a string
        const profileData = {
          ...data,
          measurements: typeof data.measurements === 'string' 
            ? JSON.parse(data.measurements) 
            : data.measurements || {}
        };
        setProfile(profileData);
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

        const profileData = {
          ...createdProfile,
          measurements: typeof createdProfile.measurements === 'string' 
            ? JSON.parse(createdProfile.measurements) 
            : createdProfile.measurements || {}
        };
        setProfile(profileData);
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
      uniform: !!(profile.measurements?.height_cm && profile.measurements?.chest && profile.measurements?.waist && profile.measurements?.hips),
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