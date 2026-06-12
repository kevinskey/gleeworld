// Registers this device for APNs push (native app only) and stores the token
// in gw_push_tokens. Tapping a notification navigates to its route.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useNativePush() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const listeners: Array<{ remove: () => void }> = [];

    (async () => {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted' || cancelled) return;

        listeners.push(await PushNotifications.addListener('registration', async (token) => {
          await supabase.from('gw_push_tokens').upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'token' },
          );
        }));

        listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const route = (action.notification.data as any)?.route;
          if (typeof route === 'string' && route.startsWith('/')) navigate(route);
        }));

        await PushNotifications.register();
      } catch (e) {
        console.error('Push registration failed', e);
      }
    })();

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

export function NativePushBridge() {
  useNativePush();
  return null;
}
