
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface StipendRecord {
  amount: number;
  description: string;
  user_name: string;
  user_email: string;
  date: string;
  category: string;
  reference?: string;
}

interface StipendSummary {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  uniqueUsers: number;
}

export const useAdminStipends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stipends, setStipends] = useState<StipendRecord[]>([]);
  const [summary, setSummary] = useState<StipendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStipends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'super-admin'].includes(profile.role)) {
        throw new Error('Access denied: Admin privileges required');
      }

      // Fetch stipend records from finance_records
      const { data: financeRecords } = await supabase
        .from('finance_records')
        .select(`
          amount,
          description,
          date,
          category,
          reference,
          user_id
        `)
        .eq('type', 'stipend')
        .order('date', { ascending: false });

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const userMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Process stipend records
      const processedStipends = financeRecords?.map(record => {
        const user = userMap.get(record.user_id);
        return {
          amount: record.amount || 0,
          description: record.description,
          user_name: user?.full_name || '',
          user_email: user?.email || '',
          date: record.date,
          category: record.category,
          reference: record.reference
        };
      }) || [];

      setStipends(processedStipends);

      // Calculate summary
      const totalAmount = processedStipends.reduce((sum, record) => sum + record.amount, 0);
      const totalCount = processedStipends.length;
      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
      const uniqueUsers = new Set(financeRecords?.map(r => r.user_id)).size;

      setSummary({
        totalAmount,
        totalCount,
        averageAmount,
        uniqueUsers
      });

    } catch (err) {
      console.error('Error fetching stipends:', err);
      setError('Failed to load stipend data');
      toast({
        title: "Error",
        description: "Failed to load stipend data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStipends();
  }, [user]);

  return {
    stipends,
    summary,
    loading,
    error,
    refetch: fetchStipends
  };
};
