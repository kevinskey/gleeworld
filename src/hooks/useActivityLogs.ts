
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_profile?: {
    full_name?: string;
    email?: string;
  };
}

export const useActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_profile:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent 100 logs for performance

      if (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
      }

      // Transform the data to match our interface
      const transformedLogs = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address ? String(log.ip_address) : undefined,
        user_agent: log.user_agent || undefined,
        resource_id: log.resource_id || undefined,
        user_profile: Array.isArray(log.user_profile) ? log.user_profile[0] : log.user_profile
      }));

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
    fetchActivityLogs();
  }, []);

  return {
    logs,
    loading,
    error,
    refetch: fetchActivityLogs,
  };
};
