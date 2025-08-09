import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  exec_board_role?: string;
  is_exec_board: boolean;
  verified?: boolean;
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
          .from('gw_profiles')
          .select('id, user_id, email, role, full_name, is_admin, is_super_admin, exec_board_role, is_exec_board, verified')
          .eq('user_id', user.id)
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
    return profile.is_admin || profile.is_super_admin || profile.role === 'librarian';
  };

  const canDownloadMP3 = () => {
    if (!profile) return false;
    return profile.is_super_admin || profile.role === 'director';
  };

  const isVisitor = () => {
    if (!profile) return true; // No profile means visitor
    return profile.role === 'visitor';
  };

  const isFan = () => {
    if (!profile) return false;
    return profile.role === 'fan';
  };

  const isAuditioner = () => {
    if (!profile) return false;
    return profile.role === 'auditioner';
  };

  const isAlumna = () => {
    if (!profile) return false;
    return profile.role === 'alumna';
  };

  const isMember = () => {
    if (!profile) return false;
    return profile.role === 'member';
  };

  const isAdmin = () => {
    if (!profile) return false;
    return profile.is_admin || profile.is_super_admin;
  };

  const isSuperAdmin = () => {
    if (!profile) return false;
    return profile.is_super_admin || profile.role === 'director';
  };

  const isExecutiveBoard = () => {
    if (!profile) return false;
    return profile.is_exec_board || profile.is_admin || profile.is_super_admin;
  };

  return {
    profile,
    loading,
    canDownloadPDF,
    canDownloadMP3,
    isAdmin,
    isSuperAdmin,
    isExecutiveBoard,
    isVisitor,
    isFan,
    isAuditioner,
    isAlumna,
    isMember,
  };
};