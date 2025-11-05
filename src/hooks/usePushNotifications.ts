import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BNxzVPFJL_Sk-6GqH9QjKmFq2bvHWqQ9vJ4rR_iVLhXKPNzU6JXh9n8bGsYmQ3qL5fPjKd7wN2xRt1sW4vE8mHk';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check current permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [user]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Service workers are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notification permission granted');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const subscribe = async () => {
    if (!user) {
      toast.error('You must be logged in to enable notifications');
      return;
    }

    setLoading(true);

    try {
      // Request permission first
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return;
        }
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      console.log('Service worker registered');

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('Push subscription created:', subscription);

      // Convert subscription to JSON
      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
