
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserRecord {
  user_id: string;
  user_name: string;
  user_email: string;
  totalRecords: number;
  currentBalance: number;
  hasRecords: boolean;
  lastActivity: string | null;
}

export const useAdminUserRecords = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRecords = async () => {
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

      // Fetch all users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      // Fetch all finance records
      const { data: financeRecords } = await supabase
        .from('finance_records')
        .select('user_id, amount, balance, date, created_at');

      // Process user records
      const userRecordsMap = new Map();

      // Initialize all users
      users?.forEach(user => {
        userRecordsMap.set(user.id, {
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          totalRecords: 0,
          currentBalance: 0,
          hasRecords: false,
          lastActivity: null
        });
      });

      // Process finance records
      financeRecords?.forEach(record => {
        const userRecord = userRecordsMap.get(record.user_id);
        if (userRecord) {
          userRecord.totalRecords += 1;
          userRecord.hasRecords = true;
          
          // Update current balance and last activity
          const recordDate = new Date(record.date || record.created_at);
          const lastActivityDate = userRecord.lastActivity ? new Date(userRecord.lastActivity) : null;
          
          if (!lastActivityDate || recordDate >= lastActivityDate) {
            userRecord.currentBalance = Number(record.balance) || 0;
            userRecord.lastActivity = record.date || record.created_at;
          }
        }
      });

      setUserRecords(Array.from(userRecordsMap.values()));

    } catch (err) {
      console.error('Error fetching user records:', err);
      setError('Failed to load user financial records');
      toast({
        title: "Error",
        description: "Failed to load user financial records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRecords();
  }, [user]);

  return {
    userRecords,
    loading,
    error,
    refetch: fetchUserRecords
  };
};
