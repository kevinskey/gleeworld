
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  full_name: string | null;
}

export const useUserProfile = (user: User | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Prioritize full_name from profile, then from user metadata, then fall back to email
  const displayName = userProfile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email || 
                     'User';

  return { userProfile, displayName };
};
