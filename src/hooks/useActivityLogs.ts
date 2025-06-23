
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

      // Fetch activity logs with user profile information
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          user_id,
          action_type,
          resource_type,
          resource_id,
          details,
          ip_address,
          user_agent,
          created_at,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: ActivityLog[] = (data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: typeof log.details === 'object' && log.details !== null ? log.details as Record<string, any> : {},
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        user_profile: log.profiles ? {
          full_name: log.profiles.full_name,
          email: log.profiles.email
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
