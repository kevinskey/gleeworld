
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface UserDashboardData {
  user_id: string;
  email: string;
  full_name: string | null;
  total_contracts: number;
  signed_contracts: number;
  w9_forms_count: number;
  payments_received: number;
  total_amount_received: number;
  unread_notifications: number;
}

export interface UserPayment {
  id: string;
  contract_id: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_contract_id: string | null;
  created_at: string;
}

export const useUserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard summary
      const { data: summary, error: summaryError } = await supabase
        .from('user_dashboard_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (summaryError) throw summaryError;

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('user_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      setDashboardData(summary);
      setPayments(paymentsData || []);
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscriptions for immediate updates
  useEffect(() => {
    if (!user) return;

    const paymentsChannel = supabase
      .channel('user-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_payments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh payments when user's payments change
          fetchDashboardData();
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('user-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh notifications when user's notifications change
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return {
    dashboardData,
    payments,
    notifications,
    loading,
    error,
    refetch: fetchDashboardData,
    markNotificationAsRead,
  };
};
