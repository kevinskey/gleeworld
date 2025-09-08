import React from 'react';
import { Home, Heart, MessageSquare, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasNotifications?: {
    feed: boolean;
    wellness: boolean;
    love: boolean;
    messages: boolean;
  };
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  hasNotifications = { feed: false, wellness: false, love: false, messages: false }
}) => {
  const tabs = [
    {
      id: 'feed',
      label: 'Feed',
      icon: Home,
      hasNotification: hasNotifications.feed
    },
    {
      id: 'wellness',
      label: 'Wellness',
      icon: Activity,
      hasNotification: hasNotifications.wellness
    },
    {
      id: 'love',
      label: 'Love',
      icon: Heart,
      hasNotification: hasNotifications.love
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      hasNotification: hasNotifications.messages
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-pb">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {tabs.map(({ id, label, icon: Icon, hasNotification }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "relative flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 touch-target",
              activeTab === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {hasNotification && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};