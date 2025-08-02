
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  exec_board_role?: string | null;
  is_exec_board?: boolean;
  avatar_url?: string | null;
  // Additional profile fields
  phone?: string | null;
  voice_part?: string | null;
  class_year?: number | null;
  join_date?: string | null;
  status?: string | null;
  dues_paid?: boolean;
  notes?: string | null;
  is_admin?: boolean;
  is_super_admin?: boolean;
  title?: string | null;
  graduation_year?: number | null;
  bio?: string | null;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('useUsers: Starting to fetch users...');
      
      // Use a more robust approach - get all user data from gw_profiles first
      // since it contains the most comprehensive user information
      const { data: gwProfilesData, error: gwProfilesError } = await supabase
        .from('gw_profiles')
        .select(`
          id, user_id, email, full_name, first_name, last_name, role,
          exec_board_role, is_exec_board, avatar_url, phone, voice_part, 
          class_year, join_date, status, dues_paid, notes, is_admin, 
          is_super_admin, title, bio, graduation_year, created_at
        `)
        .order('created_at', { ascending: false });

      console.log('useUsers: gw_profiles query result:', { 
        dataCount: gwProfilesData?.length, 
        error: gwProfilesError 
      });

      if (gwProfilesError) {
        console.error('Error fetching gw_profiles:', gwProfilesError);
        throw gwProfilesError;
      }

      // Transform gw_profiles data into User format
      const transformedUsers: User[] = (gwProfilesData || []).map(profile => {
        // Determine the effective role - prioritize admin flags
        let effectiveRole = profile.role || 'user';
        if (profile.is_super_admin) {
          effectiveRole = 'super-admin';
        } else if (profile.is_admin) {
          effectiveRole = 'admin';
        }

        return {
          id: profile.user_id, // Use user_id as the primary key
          email: profile.email || null,
          full_name: profile.full_name || 
                    (profile.first_name && profile.last_name ? 
                     `${profile.first_name} ${profile.last_name}` : null),
          role: effectiveRole,
          created_at: profile.created_at,
          exec_board_role: profile.exec_board_role || null,
          is_exec_board: profile.is_exec_board || false,
          avatar_url: profile.avatar_url || null,
          phone: profile.phone || null,
          voice_part: profile.voice_part || null,
          class_year: profile.class_year || null,
          join_date: profile.join_date || null,
          status: profile.status || null,
          dues_paid: profile.dues_paid || false,
          notes: profile.notes || null,
          is_admin: profile.is_admin || false,
          is_super_admin: profile.is_super_admin || false,
          title: profile.title || null,
          graduation_year: profile.graduation_year || null,
          bio: profile.bio || null,
        };
      });

      console.log('useUsers: Transformed users:', { 
        count: transformedUsers.length,
        adminUsers: transformedUsers.filter(u => u.is_admin || u.is_super_admin).length
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
      toast({
        title: "Error",
        description: "Failed to load users. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const refetch = () => {
    fetchUsers();
  };

  return {
    users,
    loading,
    error,
    refetch,
  };
};
