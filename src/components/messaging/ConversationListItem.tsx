import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface ConversationListItemProps {
  name: string;
  avatar?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  name,
  avatar,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isSelected = false,
  onClick,
  onDelete
}) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      const date = new Date(time);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  const content = (
    <div onClick={onClick} className={cn('flex items-center gap-1.5 md:gap-3 cursor-pointer transition-colors border-b border-border/50', 'hover:bg-accent/5', isSelected ? 'bg-[hsl(var(--message-header))]/15 border-l-[3px] md:border-l-4 border-l-[hsl(var(--message-header))] p-2 md:p-3 pl-2.5 md:pl-4' : 'p-1.5 md:p-3')}>
      <Avatar className="h-8 w-8 md:h-11 md:w-11 flex-shrink-0">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-[hsl(var(--message-header))]/20 text-[hsl(var(--message-header))] font-medium text-[5px] md:text-[7px]">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 md:gap-2 mb-0.5">
          <h3 className="font-semibold text-foreground truncate text-[3px] md:text-[8px]">{name}</h3>
          {timestamp && <span className="text-[4.5px] md:text-[6px] text-muted-foreground flex-shrink-0">
              {formatTime(timestamp)}
            </span>}
        </div>
        {lastMessage && <p className="text-[5px] md:text-[7px] text-muted-foreground truncate">{lastMessage}</p>}
      </div>

      {unreadCount > 0 && <div className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-[hsl(var(--message-header))] text-white text-[4.5px] md:text-[6px] font-medium flex items-center justify-center">
          {unreadCount}
        </div>}
    </div>
  );

  if (onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Group
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
};