
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface GleeWorldProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  
  // Glee Club Fields
  role: string | null;
  voice_part: string | null;
  class_year: number | null;
  join_date: string | null;
  status: string | null;
  dues_paid: boolean;
  notes: string | null;
  
  // Admin Fields
  is_super_admin: boolean;
  is_admin: boolean;
  disabled: boolean;
  verified: boolean;
  role_tags: string[] | null;
  title: string | null;
  special_roles: string[] | null;
  
  // Executive Board Fields
  is_exec_board: boolean;
  exec_board_role: string | null;
  music_role: string | null;
  org: string | null;
  
  // E-commerce Fields
  ecommerce_enabled: boolean;
  account_balance: number;
  current_cart_id: string | null;
  default_shipping_address: any;
  design_history_ids: string[] | null;
  
  // System Fields
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

interface UserProfile extends GleeWorldProfile {
  display_name: string;
  graduation_year?: number;
  headshot_url?: string;
  bio?: string;
  mentor_opt_in?: boolean;
  reunion_rsvp?: boolean;
  address?: string;
}

export const useUserProfile = (user: User | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // Create display name with proper name handling
        const displayName = data.full_name || 
                           (() => {
                             const parts = [data.first_name, data.middle_name, data.last_name].filter(Boolean);
                             return parts.length > 0 ? parts.join(' ') : '';
                           })() ||
                           user?.user_metadata?.full_name || 
                           user?.user_metadata?.name || 
                           user?.email || 
                           'User';

        setUserProfile({
          ...data,
          display_name: displayName
        });
      } else {
        // Create basic profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('gw_profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        if (newProfile) {
          const displayName = newProfile.full_name || 
                             user?.user_metadata?.full_name || 
                             user?.user_metadata?.name || 
                             user?.email || 
                             'User';
                             
          setUserProfile({
            ...newProfile,
            display_name: displayName
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching profile';
      setError(errorMessage);
      console.error('Error fetching user profile:', {
        error: err,
        userId: user?.id,
        errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<GleeWorldProfile>) => {
    if (!user || !userProfile) return { error: 'No user or profile found' };
    
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        const displayName = data.full_name || 
                           (() => {
                             const parts = [data.first_name, data.middle_name, data.last_name].filter(Boolean);
                             return parts.length > 0 ? parts.join(' ') : '';
                           })() ||
                           user?.user_metadata?.full_name || 
                           user?.user_metadata?.name || 
                           user?.email || 
                           'User';
                           
        setUserProfile({
          ...data,
          display_name: displayName
        });
      }
      
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating profile';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const displayName = userProfile?.display_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email || 
                     'User';

  const firstName = userProfile?.first_name || 
                   user?.user_metadata?.first_name || 
                   user?.user_metadata?.name?.split(' ')[0] || 
                   displayName.split(' ')[0] || 
                   'User';

  return { 
    userProfile, 
    displayName, 
    firstName,
    loading, 
    error, 
    updateProfile, 
    refetch: fetchUserProfile 
  };
};
