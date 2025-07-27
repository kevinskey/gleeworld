import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useArtisticDirectorAvatar = () => {
  return useQuery({
    queryKey: ["artistic-director-avatar"],
    queryFn: async () => {
      // Get the artistic director's avatar (super-admin or admin)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("role", "super-admin")
        .maybeSingle();

      if (profileData?.avatar_url) {
        return {
          avatar_url: profileData.avatar_url,
          full_name: profileData.full_name
        };
      }

      // If no super-admin found, try admin
      const { data: adminData, error: adminError } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (adminData?.avatar_url) {
        return {
          avatar_url: adminData.avatar_url,
          full_name: adminData.full_name
        };
      }

      // Try gw_profiles for super-admin
      const { data: gwSuperAdmin, error: gwError } = await supabase
        .from("gw_profiles")
        .select("avatar_url, full_name")
        .eq("is_super_admin", true)
        .maybeSingle();

      if (gwSuperAdmin?.avatar_url) {
        return {
          avatar_url: gwSuperAdmin.avatar_url,
          full_name: gwSuperAdmin.full_name
        };
      }

      return null;
    },
  });
};