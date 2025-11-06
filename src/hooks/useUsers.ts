
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
  verified?: boolean;
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
      
      // 1) Load comprehensive profile data
      const { data: gwProfilesData, error: gwProfilesError } = await supabase
        .from('gw_profiles')
        .select(`
          id, user_id, email, full_name, first_name, last_name, role,
          exec_board_role, is_exec_board, avatar_url, phone, voice_part, 
          class_year, join_date, status, dues_paid, notes, is_admin, 
          is_super_admin, title, bio, graduation_year, verified, created_at
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

      // 2) Load roles from secure user_roles table and merge (source of truth for non-admin roles)
      const userIds = (gwProfilesData || []).map((p: any) => p.user_id).filter(Boolean);
      let rolesByUser = new Map<string, string[]>();

      if (userIds.length > 0) {
        const { data: roleRows, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (rolesError) {
          console.error('Error fetching user_roles:', rolesError);
          // Do not throw; proceed with gw_profiles roles as fallback
        } else {
          rolesByUser = roleRows?.reduce((acc: Map<string, string[]>, row: any) => {
            const arr = acc.get(row.user_id) ?? [];
            arr.push(row.role);
            acc.set(row.user_id, arr);
            return acc;
          }, new Map<string, string[]>()) || new Map();
        }

        console.log('useUsers: fetched user_roles summary:', {
          usersWithRoles: rolesByUser.size,
          sample: Array.from(rolesByUser.entries()).slice(0, 3)
        });
      }

      // 3) Transform and compute effective role
      const transformedUsers: User[] = (gwProfilesData || [])
        .filter((profile: any) => profile.user_id)
        .map((profile: any) => {
          const assignedRoles = new Set(rolesByUser.get(profile.user_id) || []);

          // Prioritize admin flags from profile
          let effectiveRole = profile.role || 'user';
          if (profile.is_super_admin) {
            effectiveRole = 'super-admin';
          } else if (profile.is_admin) {
            effectiveRole = 'admin';
          } else {
            // Then prefer roles from user_roles in priority order
            if (assignedRoles.has('member')) effectiveRole = 'member';
            else if (assignedRoles.has('alumna')) effectiveRole = 'alumna';
            else if (assignedRoles.has('student')) effectiveRole = 'student';
            else if (assignedRoles.has('fan')) effectiveRole = 'fan';
            else if (assignedRoles.has('guest')) effectiveRole = 'guest';
          }

          return {
            id: profile.user_id,
            email: profile.email || null,
            full_name: profile.full_name || (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : null),
            role: effectiveRole,
            created_at: profile.created_at,
            exec_board_role: profile.exec_board_role || null,
            is_exec_board: profile.is_exec_board || false,
            avatar_url: profile.avatar_url || null,
            verified: profile.verified || false,
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
        adminUsers: transformedUsers.filter(u => u.is_admin || u.is_super_admin).length,
        alumnaeCount: transformedUsers.filter(u => u.role === 'alumna').length,
        sampleUsers: transformedUsers.slice(0, 3).map(u => ({ 
          id: u.id, 
          email: u.email, 
          full_name: u.full_name,
          role: u.role 
        }))
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
