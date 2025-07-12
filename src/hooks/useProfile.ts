import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website_url: string;
  phone_number: string;
  student_number: string;
  workplace: string;
  school_address: string;
  home_address: string;
  voice_part: "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2" | null;
  can_dance: boolean;
  instruments_played: string[];
  preferred_payment_method: "zelle" | "cashapp" | "venmo" | "apple_pay" | "check" | null;
  social_media_links: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  role: string;
  created_at: string;
  updated_at: string;
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
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        social_media_links: (data.social_media_links as any) || {}
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
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
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Refetch profile to get updated data
      await fetchProfile();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
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
      console.error('Error uploading avatar:', error);
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

    console.log("updateAvatarUrl called with:", avatarUrl);
    
    try {
      setUpdating(true);
      console.log("Updating avatar in database for user:", user.id);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Database update error:", error);
        throw error;
      }

      console.log("Database update successful, updating local state");
      
      // Update local state immediately without full refetch
      if (profile) {
        setProfile({ ...profile, avatar_url: avatarUrl });
        console.log("Local state updated with new avatar URL");
      } else {
        console.warn("Profile is null, cannot update local state");
      }
      
      return true;
    } catch (error) {
      console.error("Error updating avatar:", error);
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