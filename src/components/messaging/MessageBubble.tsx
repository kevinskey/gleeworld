import React, { useState } from 'react';
import { GroupMessage, useAddReaction } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { Reply, Smile, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface MessageBubbleProps {
  message: GroupMessage;
  isFirstInGroup: boolean;
  onReply: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isFirstInGroup,
  onReply,
}) => {
  const { user } = useAuth();
  const addReaction = useAddReaction();
  const [showActions, setShowActions] = useState(false);
  
  const isOwnMessage = message.user_id === user?.id;
  const userName = message.user_profile?.full_name || 'Unknown User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      await addReaction.mutateAsync({
        messageId: message.id,
        emoji
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof message.reactions>);

  return (
    <div
      className={cn(
        "group flex gap-3 hover:bg-accent/30 -mx-2 px-2 py-1 rounded-lg transition-colors",
        isOwnMessage && "flex-row-reverse"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar (only show for first message in group) */}
      <div className={cn("flex-shrink-0", !isFirstInGroup && "w-8")}>
        {isFirstInGroup && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.user_profile?.avatar_url} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", isOwnMessage && "flex flex-col items-end")}>
        {/* User name and timestamp (only for first message in group) */}
        {isFirstInGroup && (
          <div className={cn("flex items-center gap-2 mb-1", isOwnMessage && "flex-row-reverse")}>
            <span className="text-sm font-medium text-foreground">
              {userName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Reply indicator */}
        {message.reply_to && (
          <div className={cn(
            "flex items-center gap-2 mb-2 p-2 rounded bg-muted/50 border-l-2 border-primary text-sm",
            isOwnMessage && "bg-primary/10"
          )}>
            <Reply className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {message.reply_to.user_profile?.full_name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {message.reply_to.content}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative flex items-center gap-2">
          <div
            className={cn(
              "max-w-lg rounded-2xl px-4 py-2 break-words",
              isOwnMessage
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            {/* System messages */}
            {message.message_type === 'system' ? (
              <div className="text-xs text-muted-foreground italic text-center">
                {message.content}
              </div>
            ) : (
              /* Regular text messages */
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
            )}

            {/* Edited indicator */}
            {message.is_edited && (
              <div className="text-xs opacity-70 mt-1">
                (edited)
              </div>
            )}
          </div>

          {/* Message actions */}
          {showActions && message.message_type !== 'system' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleReaction('👍')}
              >
                <Smile className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={onReply}
              >
                <Reply className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleReaction('😀')}>
                    React with 😀
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleReaction('❤️')}>
                    React with ❤️
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleReaction('🎵')}>
                    React with 🎵
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReply}>
                    Reply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Reactions */}
        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors",
                  reactions.some(r => r.user_id === user?.id)
                    ? "bg-primary/20 border-primary/30 text-primary"
                    : "bg-muted border-border hover:bg-muted/80"
                )}
              >
                <span>{emoji}</span>
                <span>{reactions.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp for non-first messages */}
        {!isFirstInGroup && showActions && (
          <div className={cn("text-xs text-muted-foreground mt-1", isOwnMessage && "text-right")}>
            {formatMessageTime(message.created_at)}
          </div>
        )}
      </div>
    </div>
  );
};