import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface MergedProfile {
  // Core fields (from both tables)
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  
  // Basic profile fields
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  
  // Glee Club specific
  voice_part?: string;
  class_year?: number;
  join_date?: string;
  status?: string;
  dues_paid?: boolean;
  notes?: string;
  
  // Admin roles
  is_super_admin?: boolean;
  is_admin?: boolean;
  is_section_leader?: boolean;
  disabled?: boolean;
  role_tags?: string[];
  title?: string;
  special_roles?: string[];
  
  // Executive board
  is_exec_board?: boolean;
  exec_board_role?: string;
  music_role?: string;
  
  // Organization
  org?: string;
  
  // E-commerce
  ecommerce_enabled?: boolean;
  account_balance?: number;
  current_cart_id?: string;
  default_shipping_address?: any;
  design_history_ids?: string[];
  
  // System fields
  last_sign_in_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseProfileReturn {
  profile: MergedProfile | null;
  displayName: string;
  firstName: string;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<MergedProfile>) => Promise<{ data: MergedProfile | null; error: string | null }>;
  refetch: () => Promise<void>;
}

export const useMergedProfile = (user: User | null): UseProfileReturn => {
  const [profile, setProfile] = useState<MergedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: gwProfile, error: gwError } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, role, is_admin, is_super_admin, class_year, voice_part, exec_board_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (gwError) {
        throw new Error(`Profile query failed: ${gwError.message}`);
      }

      if (gwProfile) {
        const mergedProfile: MergedProfile = {
          id: gwProfile.user_id || user.id,
          user_id: user.id,
          email: gwProfile.email || user.email || '',
          full_name: gwProfile.full_name || '',
          role: gwProfile.role || 'user',
          is_admin: gwProfile.is_admin || false,
          is_super_admin: gwProfile.is_super_admin || false,
          class_year: gwProfile.class_year,
          voice_part: gwProfile.voice_part,
          exec_board_role: gwProfile.exec_board_role,
        };
        setProfile(mergedProfile);
      } else {
        const minimalProfile: MergedProfile = {
          id: user.id,
          user_id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          role: 'user',
        };
        setProfile(minimalProfile);
      }
    } catch (err) {
      console.error('useMergedProfile error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<MergedProfile>) => {
    if (!user?.id || !profile) {
      return { data: null, error: 'No user or profile found' };
    }

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        return { data: updatedProfile, error: null };
      }

      return { data: null, error: 'No data returned' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const displayName = profile?.full_name || 
                     (() => {
                       const parts = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean);
                       return parts.length > 0 ? parts.join(' ') : '';
                     })() ||
                     user?.email?.split('@')[0] || 
                     'User';

  const firstName = profile?.first_name || 
                   (profile?.full_name ? profile.full_name.split(' ')[0] : '') ||
                   user?.email?.split('@')[0] || 
                   'User';

  return {
    profile,
    displayName,
    firstName,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};
