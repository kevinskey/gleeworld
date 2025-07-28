import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Global subscription manager to prevent duplicates across all hooks
const globalSubscriptions = new Map<string, any>();

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

  // Clean up any existing subscriptions using global manager
  const cleanupSubscriptions = (userId: string) => {
    const paymentsKey = `user-dashboard-payments-${userId}`;
    const notificationsKey = `user-dashboard-notifications-${userId}`;
    
    const paymentsChannel = globalSubscriptions.get(paymentsKey);
    const notificationsChannel = globalSubscriptions.get(notificationsKey);
    
    if (paymentsChannel) {
      console.log('useUserDashboard: Removing global payments channel');
      supabase.removeChannel(paymentsChannel);
      globalSubscriptions.delete(paymentsKey);
    }
    
    if (notificationsChannel) {
      console.log('useUserDashboard: Removing global notifications channel');
      supabase.removeChannel(notificationsChannel);
      globalSubscriptions.delete(notificationsKey);
    }
    
    subscriptionsRef.current = { isSubscribed: false };
  };

  // Set up real-time subscriptions using global manager
  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const paymentsKey = `user-dashboard-payments-${userId}`;
    const notificationsKey = `user-dashboard-notifications-${userId}`;

    console.log('useUserDashboard: Checking subscriptions', { 
      userId,
      paymentsExists: globalSubscriptions.has(paymentsKey),
      notificationsExists: globalSubscriptions.has(notificationsKey),
      localSubscribed: subscriptionsRef.current.isSubscribed
    });

    // Check if subscriptions already exist globally
    if (globalSubscriptions.has(paymentsKey) || globalSubscriptions.has(notificationsKey)) {
      console.log('useUserDashboard: Subscriptions already exist globally, skipping');
      subscriptionsRef.current.isSubscribed = true;
      return () => cleanupSubscriptions(userId);
    }

    console.log('useUserDashboard: Creating new subscriptions');

    // Create unique channel names with timestamps to avoid conflicts
    const timestamp = Date.now();
    const paymentsChannelName = `user-dashboard-payments-${userId}-${timestamp}`;
    const notificationsChannelName = `user-dashboard-notifications-${userId}-${timestamp}`;

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
        filter: `user_id=eq.${userId}`
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
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('User notifications changed:', payload);
        fetchDashboardData();
      }
    );

    // Subscribe to channels and store in global manager
    try {
      paymentsChannel.subscribe((status) => {
        console.log('Payments channel status:', status);
        if (status === 'SUBSCRIBED') {
          globalSubscriptions.set(paymentsKey, paymentsChannel);
        }
      });

      notificationsChannel.subscribe((status) => {
        console.log('Notifications channel status:', status);
        if (status === 'SUBSCRIBED') {
          globalSubscriptions.set(notificationsKey, notificationsChannel);
        }
      });

      subscriptionsRef.current = {
        paymentsChannel,
        notificationsChannel,
        isSubscribed: true
      };

      console.log('useUserDashboard: Subscriptions set up successfully');
    } catch (error) {
      console.error('useUserDashboard: Error setting up subscriptions:', error);
    }

    return () => cleanupSubscriptions(userId);
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