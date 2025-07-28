
import { useState, useEffect, useRef } from "react";
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
  category: string | null;
  is_read: boolean;
  action_url: string | null;
  action_label: string | null;
  priority: number;
  metadata: any;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useUserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track subscription state and prevent duplicates
  const subscriptionsRef = useRef<{
    paymentsChannel?: any;
    notificationsChannel?: any;
    isSubscribed: boolean;
  }>({ isSubscribed: false });

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

      // Fetch notifications from gw_notifications table
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('gw_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

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
        .from('gw_notifications')
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

  // Clean up any existing subscriptions
  const cleanupSubscriptions = () => {
    const { paymentsChannel, notificationsChannel } = subscriptionsRef.current;
    
    if (paymentsChannel) {
      console.log('Removing payments channel');
      supabase.removeChannel(paymentsChannel);
    }
    
    if (notificationsChannel) {
      console.log('Removing notifications channel');
      supabase.removeChannel(notificationsChannel);
    }
    
    subscriptionsRef.current = { isSubscribed: false };
  };

  // Set up real-time subscriptions for immediate updates
  useEffect(() => {
    if (!user || subscriptionsRef.current.isSubscribed) {
      return;
    }

    console.log('Setting up dashboard subscriptions for user:', user.id);

    // Create unique channel names
    const paymentsChannelName = `dashboard-payments-${user.id}`;
    const notificationsChannelName = `dashboard-notifications-${user.id}`;

    // Create channels
    const paymentsChannel = supabase.channel(paymentsChannelName);
    const notificationsChannel = supabase.channel(notificationsChannelName);

    // Configure payments channel
    paymentsChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_payments',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('User payments changed:', payload);
        fetchDashboardData();
      }
    );

    // Configure notifications channel
    notificationsChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gw_notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('User notifications changed:', payload);
        fetchDashboardData();
      }
    );

    // Subscribe to channels
    paymentsChannel.subscribe((status) => {
      console.log('Payments channel status:', status);
    });

    notificationsChannel.subscribe((status) => {
      console.log('Notifications channel status:', status);
    });

    // Store channels in ref
    subscriptionsRef.current = {
      paymentsChannel,
      notificationsChannel,
      isSubscribed: true
    };

    return cleanupSubscriptions;
  }, [user?.id]); // Only depend on user.id

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
