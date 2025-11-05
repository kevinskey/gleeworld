import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationToggle = () => {
  const { isSubscribed, loading, subscribe, unsubscribe, permission } = usePushNotifications();

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notifications blocked</span>
      </div>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <Bell className="h-4 w-4" />
          Notifications On
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
};
