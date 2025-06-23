
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser);
      
      if (!currentUser) {
        setError('User not authenticated');
        console.log('No authenticated user found');
        return;
      }
      
      // Check current user's profile and role
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      console.log('Current user profile:', currentProfile);
      console.log('Profile error:', profileError);
      
      // Use the get_all_user_profiles function which handles RLS properly
      const { data, error } = await supabase.rpc('get_all_user_profiles');

      console.log('RPC response data:', data);
      console.log('RPC response error:', error);

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers
  };
};
