import React, { useState } from 'react';
import { Plus, MessageSquare, Heart, Activity, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  activeTab: string;
  onAction: (action: 'announcement' | 'wellness' | 'love' | 'message') => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  activeTab,
  onAction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getContextualAction = () => {
    switch (activeTab) {
      case 'feed':
        return { icon: Megaphone, label: 'Announce', action: 'announcement' as const };
      case 'wellness':
        return { icon: Activity, label: 'Check-in', action: 'wellness' as const };
      case 'love':
        return { icon: Heart, label: 'Send Love', action: 'love' as const };
      case 'messages':
        return { icon: MessageSquare, label: 'Message', action: 'message' as const };
      default:
        return { icon: Megaphone, label: 'Announce', action: 'announcement' as const };
    }
  };

  const allActions = [
    { icon: Megaphone, label: 'Announce', action: 'announcement' as const, color: 'bg-blue-500' },
    { icon: Activity, label: 'Check-in', action: 'wellness' as const, color: 'bg-green-500' },
    { icon: Heart, label: 'Send Love', action: 'love' as const, color: 'bg-pink-500' },
    { icon: MessageSquare, label: 'Message', action: 'message' as const, color: 'bg-purple-500' }
  ];

  const contextualAction = getContextualAction();

  const handleAction = (action: 'announcement' | 'wellness' | 'love' | 'message') => {
    onAction(action);
    setIsExpanded(false);
  };

  if (isExpanded) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
        
        {/* Action buttons */}
        {allActions.map(({ icon: Icon, label, action, color }, index) => (
          <div
            key={action}
            className="flex items-center gap-3 animate-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="bg-background px-3 py-1 rounded-full text-sm font-medium border shadow-sm">
              {label}
            </span>
            <Button
              size="lg"
              onClick={() => handleAction(action)}
              className={cn(
                "w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-all",
                color, "text-white hover:opacity-90"
              )}
            >
              <Icon className="h-6 w-6" />
            </Button>
          </div>
        ))}
        
        {/* Close button */}
        <Button
          size="lg"
          variant="outline"
          onClick={() => setIsExpanded(false)}
          className="w-14 h-14 rounded-full shadow-lg bg-background"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      onClick={() => setIsExpanded(true)}
      className={cn(
        "fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-all",
        "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
    >
      <contextualAction.icon className="h-6 w-6" />
    </Button>
  );
};