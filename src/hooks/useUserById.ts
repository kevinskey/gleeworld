import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  exec_board_role?: string;
  is_exec_board?: boolean;
  avatar_url?: string;
}

export const useUserById = (userId: string | undefined) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setError("No user ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch from gw_profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('gw_profiles')
          .select('user_id as id, email, full_name, role, created_at, avatar_url, exec_board_role, is_exec_board')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to fetch user profile');
          return;
        }

        if (!profileData) {
          setError('User not found');
          setUser(null);
          setLoading(false);
          return;
        }

        // Data is already combined from gw_profiles
        const combinedUser: User = {
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          role: profileData.role,
          created_at: profileData.created_at,
          avatar_url: profileData.avatar_url,
          exec_board_role: profileData.exec_board_role || undefined,
          is_exec_board: profileData.is_exec_board || false,
        };

        setUser(combinedUser);
      } catch (err) {
        console.error('Error in fetchUser:', err);
        setError('An unexpected error occurred');
        toast({
          title: "Error",
          description: "Failed to fetch user information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, toast]);

  return { user, loading, error };
};