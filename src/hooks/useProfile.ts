import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  phone_number?: string;
  student_number?: string;
  workplace?: string;
  school_address?: string;
  home_address?: string;
  voice_part?: "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2" | null;
  can_dance?: boolean;
  instruments_played?: string[];
  preferred_payment_method?: "zelle" | "cashapp" | "venmo" | "apple_pay" | "check" | null;
  social_media_links?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  
  // Wardrobe & Identity fields
  dress_size?: string;
  shoe_size?: string;
  hair_color?: string;
  has_tattoos?: boolean;
  visible_piercings?: boolean;
  
  // Wardrobe measurements (stored in JSONB column in database)
  measurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    height_cm?: number;
    shoe_size?: number;
    height_feet?: number;
    height_inches?: number;
    chest?: number;
  };
  
  // Legacy fields for backward compatibility
  bust_measurement?: number;
  waist_measurement?: number;
  hips_measurement?: number;
  height_measurement?: number;
  
  // Additional wardrobe sizes from CSV import
  shirt_size?: string;
  pants_size?: string;
  
  // Student classification from CSV import
  classification?: string;
  
  // Academic & Personal fields
  academic_major?: string;
  pronouns?: string;
  class_year?: number;
  
  // Health & Safety fields
  emergency_contact?: string;
  dietary_restrictions?: string[];
  allergies?: string;
  parent_guardian_contact?: string;
  
  // Glee Club specific fields
  graduation_year?: number;
  join_date?: string;
  mentor_opt_in?: boolean;
  reunion_rsvp?: boolean;
  
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("gw_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        id: data.user_id, // Map user_id to id for interface compatibility
        voice_part: data.voice_part as "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2" | null,
        social_media_links: (data.social_media_links as any) || {},
        preferred_payment_method: data.preferred_payment_method as "zelle" | "cashapp" | "venmo" | "apple_pay" | "check" | null,
        measurements: (data.measurements as any) || {}
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<ProfileData>) => {
    if (!user) return false;

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from("gw_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error('Profile update error:', error.message);
        throw error;
      }

      // Refetch profile to get updated data
      await fetchProfile();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      const success = await updateProfile({ avatar_url: data.publicUrl });
      
      if (success) {
        toast({
          title: "Success",
          description: "Avatar updated successfully",
        });
        return data.publicUrl;
      }
      
      return null;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAvatarUrl = async (avatarUrl: string) => {
    if (!user) return false;
    
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from("gw_profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      // Also update gw_profiles table to keep data in sync
      const { error: gwError } = await supabase
        .from("gw_profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (gwError) {
        // Don't throw error since profiles update succeeded
      }
      
      // Update local state immediately without full refetch
      if (profile) {
        setProfile({ ...profile, avatar_url: avatarUrl });
      }
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
    updateAvatarUrl,
    refetchProfile: fetchProfile,
  };
};