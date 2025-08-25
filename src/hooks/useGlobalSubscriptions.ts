import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Global subscription manager to prevent duplicate subscriptions
class SubscriptionManager {
  private static instance: SubscriptionManager;
  private activeSubscriptions: Map<string, RealtimeChannel> = new Map();
  private subscriptionCounts: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  async subscribe(
    subscriptionId: string,
    setupFunction: () => RealtimeChannel
  ): Promise<RealtimeChannel | null> {
    // If subscription already exists, increment count and return existing
    if (this.activeSubscriptions.has(subscriptionId)) {
      const count = this.subscriptionCounts.get(subscriptionId) || 0;
      this.subscriptionCounts.set(subscriptionId, count + 1);
      console.log(`Reusing existing subscription: ${subscriptionId}, count: ${count + 1}`);
      return this.activeSubscriptions.get(subscriptionId)!;
    }

    try {
      // Create new subscription
      const channel = setupFunction();
      await channel.subscribe();
      
      this.activeSubscriptions.set(subscriptionId, channel);
      this.subscriptionCounts.set(subscriptionId, 1);
      console.log(`Created new subscription: ${subscriptionId}`);
      
      return channel;
    } catch (error) {
      console.error(`Failed to create subscription ${subscriptionId}:`, error);
      return null;
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const count = this.subscriptionCounts.get(subscriptionId) || 0;
    
    if (count <= 1) {
      // Last subscriber, clean up the subscription
      const channel = this.activeSubscriptions.get(subscriptionId);
      if (channel) {
        await supabase.removeChannel(channel);
        this.activeSubscriptions.delete(subscriptionId);
        this.subscriptionCounts.delete(subscriptionId);
        console.log(`Cleaned up subscription: ${subscriptionId}`);
      }
    } else {
      // Decrement count
      this.subscriptionCounts.set(subscriptionId, count - 1);
      console.log(`Decremented subscription count: ${subscriptionId}, count: ${count - 1}`);
    }
  }

  // Force cleanup all subscriptions (for debugging)
  async cleanupAll(): Promise<void> {
    console.log('Force cleaning up all subscriptions...');
    for (const [id, channel] of this.activeSubscriptions.entries()) {
      await supabase.removeChannel(channel);
    }
    this.activeSubscriptions.clear();
    this.subscriptionCounts.clear();
  }
}

// Hook to manage global subscriptions
export const useGlobalSubscriptions = () => {
  const { user } = useAuth();
  const manager = useRef(SubscriptionManager.getInstance());

  // Cleanup on unmount or user change
  useEffect(() => {
    return () => {
      // Don't cleanup on user change, let individual hooks manage their subscriptions
    };
  }, []);

  const subscribeToNotifications = async (userId: string, callback: (payload: any) => void) => {
    if (!userId) return null;

    const subscriptionId = `notifications-${userId}`;
    return manager.current.subscribe(subscriptionId, () => {
      const channel = supabase.channel(`notifications-global-${userId}-${Date.now()}`);
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gw_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => callback({ ...payload, eventType: 'INSERT' })
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'gw_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => callback({ ...payload, eventType: 'UPDATE' })
        );

      return channel;
    });
  };

  const unsubscribeFromNotifications = async (userId: string) => {
    if (!userId) return;
    const subscriptionId = `notifications-${userId}`;
    await manager.current.unsubscribe(subscriptionId);
  };

  const subscribeToEvents = async (callback: (payload: any) => void) => {
    const subscriptionId = 'events-global';
    return manager.current.subscribe(subscriptionId, () => {
      const channel = supabase.channel(`events-global-${Date.now()}`);
      
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gw_events'
          },
          callback
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gw_appointments'
          },
          callback
        );

      return channel;
    });
  };

  const unsubscribeFromEvents = async () => {
    const subscriptionId = 'events-global';
    await manager.current.unsubscribe(subscriptionId);
  };

  return {
    subscribeToNotifications,
    unsubscribeFromNotifications,
    subscribeToEvents,
    unsubscribeFromEvents,
    cleanupAll: () => manager.current.cleanupAll()
  };
};