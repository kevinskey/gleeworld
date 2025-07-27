import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCurrentUserAvatar = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-user-avatar", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to get avatar from profiles table first
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.avatar_url) {
        return {
          avatar_url: profileData.avatar_url,
          full_name: profileData.full_name
        };
      }

      // If not found in profiles, try gw_profiles
      const { data: gwProfileData, error: gwProfileError } = await supabase
        .from("gw_profiles")
        .select("avatar_url, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gwProfileData?.avatar_url) {
        return {
          avatar_url: gwProfileData.avatar_url,
          full_name: gwProfileData.full_name
        };
      }

      return null;
    },
    enabled: !!user?.id,
  });
};