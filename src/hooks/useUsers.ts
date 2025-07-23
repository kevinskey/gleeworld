
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
      
      // First get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Then get gw_profiles data for executive board info and avatar
      const { data: gwProfilesData, error: gwProfilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, exec_board_role, is_exec_board, avatar_url');

      if (gwProfilesError) {
        console.error('Error fetching gw_profiles:', gwProfilesError);
        // Don't throw error here, just continue without exec board data
      }

      // Create a map of gw_profiles data
      const gwProfilesMap = new Map();
      (gwProfilesData || []).forEach(gwProfile => {
        gwProfilesMap.set(gwProfile.user_id, gwProfile);
      });

      // Transform and merge data
      const transformedUsers: User[] = (profilesData || []).map(user => {
        const gwProfile = gwProfilesMap.get(user.id);
        return {
          id: user.id,
          email: user.email || null,
          full_name: user.full_name || null,
          role: user.role || 'user',
          created_at: user.created_at,
          exec_board_role: gwProfile?.exec_board_role || null,
          is_exec_board: gwProfile?.is_exec_board || false,
          avatar_url: gwProfile?.avatar_url || null,
        };
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
      toast({
        title: "Error",
        description: "Failed to load users",
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
