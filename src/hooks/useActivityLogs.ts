
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
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_profile:profiles!user_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
      }

      // Transform the data to match our interface
      const transformedLogs: ActivityLog[] = (data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: log.details || {},
        ip_address: log.ip_address ? String(log.ip_address) : null,
        user_agent: log.user_agent || null,
        created_at: log.created_at,
        user_profile: Array.isArray(log.user_profile) && log.user_profile.length > 0 
          ? log.user_profile[0] 
          : log.user_profile || null
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
