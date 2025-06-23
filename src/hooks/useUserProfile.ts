
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  full_name: string | null;
  role: string | null;
  display_name: string;
}

export const useUserProfile = (user: User | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          // Prioritize full_name from profile, then from user metadata, then fall back to email
          const displayName = data.full_name || 
                             user?.user_metadata?.full_name || 
                             user?.user_metadata?.name || 
                             user?.email || 
                             'User';

          setUserProfile({
            full_name: data.full_name,
            role: data.role,
            display_name: displayName
          });
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Prioritize full_name from profile, then from user metadata, then fall back to email
  const displayName = userProfile?.display_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email || 
                     'User';

  return { userProfile, displayName };
};
