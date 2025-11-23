import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConversationListItemProps {
  name: string;
  avatar?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  name,
  avatar,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isSelected = false,
  onClick,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      const date = new Date(time);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 cursor-pointer transition-colors border-b border-border/50',
        'hover:bg-accent/5',
        isSelected && 'bg-accent/10'
      )}
    >
      <Avatar className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-[hsl(var(--message-header))]/20 text-[hsl(var(--message-header))] font-medium text-xs sm:text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{name}</h3>
          {timestamp && (
            <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
              {formatTime(timestamp)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{lastMessage}</p>
        )}
      </div>

      {unreadCount > 0 && (
        <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[hsl(var(--message-header))] text-white text-[10px] sm:text-xs font-medium flex items-center justify-center">
          {unreadCount}
        </div>
      )}
    </div>
  );
};
