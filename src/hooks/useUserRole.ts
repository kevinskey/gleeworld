import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, full_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const canDownloadPDF = () => {
    if (!profile) return false;
    return ['admin', 'super-admin', 'librarian'].includes(profile.role);
  };

  const canDownloadMP3 = () => {
    if (!profile) return false;
    return profile.role === 'super-admin';
  };

  const isAdmin = () => {
    if (!profile) return false;
    return ['admin', 'super-admin'].includes(profile.role);
  };

  const isSuperAdmin = () => {
    if (!profile) return false;
    return profile.role === 'super-admin';
  };

  return {
    profile,
    loading,
    canDownloadPDF,
    canDownloadMP3,
    isAdmin,
    isSuperAdmin,
  };
};