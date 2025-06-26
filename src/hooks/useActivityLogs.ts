
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export const useActivityLogs = (enabled: boolean = true) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActivityLogs = async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching activity logs...');
      
      // First fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching activity logs:', logsError);
        throw logsError;
      }

      console.log('Activity logs fetched:', logsData?.length);

      // Get unique user IDs from logs
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
          // Don't throw error for profiles, just continue without them
        } else {
          profiles = profilesData || [];
        }
      }

      // Combine logs with profile data
      const transformedLogs: ActivityLog[] = (logsData || []).map(log => {
        const profile = profiles.find(p => p.id === log.user_id);
        return {
          id: log.id,
          user_id: log.user_id,
          action_type: log.action_type,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          details: log.details || {},
          ip_address: log.ip_address ? String(log.ip_address) : null,
          user_agent: log.user_agent || null,
          created_at: log.created_at,
          user_profile: profile ? {
            full_name: profile.full_name,
            email: profile.email
          } : null
        };
      });

      console.log('Transformed logs:', transformedLogs.length);
      setLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setError('Failed to load activity logs');
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchActivityLogs();
    }
  }, [enabled]);

  return {
    logs,
    loading,
    error,
    refetch: fetchActivityLogs,
  };
};
