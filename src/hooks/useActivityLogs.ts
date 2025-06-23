
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

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

      // Then fetch user profiles separately
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles by user_id
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Transform the data to match our interface
      const transformedData: ActivityLog[] = (logsData || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: typeof log.details === 'object' && log.details !== null ? log.details as Record<string, any> : {},
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent,
        created_at: log.created_at,
        user_profile: profilesMap.get(log.user_id) ? {
          full_name: profilesMap.get(log.user_id)!.full_name,
          email: profilesMap.get(log.user_id)!.email
        } : undefined
      }));

      setLogs(transformedData);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  };
};
