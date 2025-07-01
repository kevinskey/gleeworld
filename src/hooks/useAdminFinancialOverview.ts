
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FinancialOverview {
  totalPayments: number;
  totalPaymentCount: number;
  totalStipends: number;
  totalStipendCount: number;
  outstandingBalance: number;
  activeUsers: number;
  thisMonthPayments: number;
  thisMonthCount: number;
  recentActivity: Array<{
    type: string;
    description: string;
    user: string;
    amount: number;
    date: string;
  }>;
  paymentMethods: Array<{
    method: string;
    total: number;
    count: number;
  }>;
}

export const useAdminFinancialOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
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

      // Fetch payment data
      const { data: payments } = await supabase
        .from('user_payments')
        .select(`
          amount,
          payment_method,
          payment_date,
          created_at,
          user_id
        `);

      // Fetch finance records data
      const { data: financeRecords } = await supabase
        .from('finance_records')
        .select(`
          amount,
          type,
          date,
          user_id,
          balance
        `);

      // Fetch user profiles for names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const userMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculate totals
      const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalPaymentCount = payments?.length || 0;

      const stipendRecords = financeRecords?.filter(r => r.type === 'stipend') || [];
      const totalStipends = stipendRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalStipendCount = stipendRecords.length;

      // Calculate outstanding balance (sum of latest balances per user)
      const userBalances = new Map();
      financeRecords?.forEach(record => {
        const currentBalance = userBalances.get(record.user_id);
        if (!currentBalance || new Date(record.date) > new Date(currentBalance.date)) {
          userBalances.set(record.user_id, { balance: record.balance, date: record.date });
        }
      });
      const outstandingBalance = Array.from(userBalances.values())
        .reduce((sum, { balance }) => sum + (balance || 0), 0);

      const activeUsers = userBalances.size;

      // This month payments
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthPayments = payments?.filter(p => 
        new Date(p.created_at) >= thisMonth
      ).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const thisMonthCount = payments?.filter(p => 
        new Date(p.created_at) >= thisMonth
      ).length || 0;

      // Recent activity (last 10 items)
      const allActivity = [
        ...(payments?.map(p => ({
          type: 'payment',
          description: `Payment via ${p.payment_method}`,
          user: userMap.get(p.user_id)?.full_name || userMap.get(p.user_id)?.email || 'Unknown',
          amount: p.amount || 0,
          date: new Date(p.created_at).toLocaleDateString(),
          timestamp: new Date(p.created_at).getTime()
        })) || []),
        ...(financeRecords?.map(r => ({
          type: r.type,
          description: `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} record`,
          user: userMap.get(r.user_id)?.full_name || userMap.get(r.user_id)?.email || 'Unknown',
          amount: r.amount || 0,
          date: new Date(r.date).toLocaleDateString(),
          timestamp: new Date(r.date).getTime()
        })) || [])
      ];

      const recentActivity = allActivity
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      // Payment methods breakdown
      const methodMap = new Map();
      payments?.forEach(p => {
        const method = p.payment_method || 'unknown';
        const current = methodMap.get(method) || { total: 0, count: 0 };
        methodMap.set(method, {
          total: current.total + (p.amount || 0),
          count: current.count + 1
        });
      });

      const paymentMethods = Array.from(methodMap.entries()).map(([method, data]) => ({
        method,
        ...data
      }));

      setOverview({
        totalPayments,
        totalPaymentCount,
        totalStipends,
        totalStipendCount,
        outstandingBalance,
        activeUsers,
        thisMonthPayments,
        thisMonthCount,
        recentActivity,
        paymentMethods
      });

    } catch (err) {
      console.error('Error fetching financial overview:', err);
      setError('Failed to load financial overview');
      toast({
        title: "Error",
        description: "Failed to load financial overview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user]);

  return {
    overview,
    loading,
    error,
    refetch: fetchOverview
  };
};
