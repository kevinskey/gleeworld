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
      // Fetch from gw_profiles which is now the source of truth
      const { data: gwProfile, error: gwError } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (gwError) {
        throw gwError;
      }

      if (gwProfile) {
        // Also get the role from profiles table for completeness
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const mergedProfile: MergedProfile = {
          id: gwProfile.id,
          user_id: gwProfile.user_id,
          email: gwProfile.email,
          full_name: gwProfile.full_name || '',
          role: profileData?.role || 'user',
          first_name: gwProfile.first_name,
          last_name: gwProfile.last_name,
          phone: gwProfile.phone,
          avatar_url: gwProfile.avatar_url,
          voice_part: gwProfile.voice_part,
          class_year: gwProfile.class_year,
          join_date: gwProfile.join_date,
          status: gwProfile.status,
          dues_paid: gwProfile.dues_paid,
          notes: gwProfile.notes,
          is_super_admin: gwProfile.is_super_admin,
          is_admin: gwProfile.is_admin,
          is_section_leader: gwProfile.is_section_leader,
          disabled: gwProfile.disabled,
          role_tags: gwProfile.role_tags,
          title: gwProfile.title,
          special_roles: gwProfile.special_roles,
          is_exec_board: gwProfile.is_exec_board,
          exec_board_role: gwProfile.exec_board_role,
          music_role: gwProfile.music_role,
          org: gwProfile.org,
          ecommerce_enabled: gwProfile.ecommerce_enabled,
          account_balance: gwProfile.account_balance,
          current_cart_id: gwProfile.current_cart_id,
          default_shipping_address: gwProfile.default_shipping_address,
          design_history_ids: gwProfile.design_history_ids,
          last_sign_in_at: gwProfile.last_sign_in_at,
          created_at: gwProfile.created_at,
          updated_at: gwProfile.updated_at,
        };

        setProfile(mergedProfile);
      } else {
        // No profile found - create a minimal one from auth user
        console.log('No profile found for user, creating minimal profile');
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
      console.error('Error fetching merged profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<MergedProfile>) => {
    if (!user?.id || !profile) {
      return { data: null, error: 'No user or profile found' };
    }

    try {
      // Update gw_profiles (triggers will sync to profiles)
      const { data, error } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update local state
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
                     profile?.first_name && profile?.last_name ? 
                     `${profile.first_name} ${profile.last_name}` : 
                     user?.email?.split('@')[0] || 
                     'User';

  return {
    profile,
    displayName,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};