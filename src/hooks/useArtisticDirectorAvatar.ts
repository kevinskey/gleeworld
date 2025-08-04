import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useArtisticDirectorAvatar = () => {
  return useQuery({
    queryKey: ["artistic-director-avatar"],
    queryFn: async () => {
      // Get the artistic director's avatar from gw_profiles
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

      // If no super-admin found, try admin
      const { data: adminData, error: adminError } = await supabase
        .from("gw_profiles")
        .select("avatar_url, full_name")
        .eq("is_admin", true)
        .limit(1)
        .maybeSingle();

      if (adminData?.avatar_url) {
        return {
          avatar_url: adminData.avatar_url,
          full_name: adminData.full_name
        };
      }

      return null;
    },
  });
};