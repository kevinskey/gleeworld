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
  isLastInGroup?: boolean;
  onReply: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isFirstInGroup,
  isLastInGroup = true,
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
        "group flex gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 hover:bg-accent/20 -mx-1 sm:-mx-2 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg transition-colors",
        isOwnMessage && "flex-row-reverse"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar - only show for first message in group and not own messages */}
      {isFirstInGroup && !isOwnMessage && (
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-0.5 sm:mt-1">
          <AvatarImage src={message.user_profile?.avatar_url} />
          <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Spacer for grouped messages */}
      {!isFirstInGroup && !isOwnMessage && <div className="w-7 sm:w-8" />}

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", isOwnMessage ? "flex flex-col items-end" : "flex flex-col items-start")}>
        {/* User name and timestamp - only for first message in group */}
        {isFirstInGroup && !isOwnMessage && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <span className="text-xs sm:text-sm font-medium text-foreground truncate">
              {userName}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
              {formatMessageTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Reply indicator */}
        {message.reply_to && (
          <div className={cn(
            "mb-1 sm:mb-2 text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-lg bg-muted/50 max-w-[200px] sm:max-w-xs border-l-2 border-primary",
            isOwnMessage && "text-right border-r-2 border-l-0"
          )}>
            <div className="font-medium text-primary truncate">
              {message.reply_to.user_profile?.full_name || 'Unknown User'}
            </div>
            <div className="text-muted-foreground truncate">
              {message.reply_to.content}
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative flex items-center gap-1 sm:gap-2">
          <div 
            className={cn(
              "relative inline-block max-w-[240px] sm:max-w-xs lg:max-w-md px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm break-words",
              isOwnMessage 
                ? cn(
                    "bg-primary text-white",
                    isFirstInGroup ? "rounded-2xl" : 
                    isLastInGroup ? "rounded-t-2xl rounded-bl-2xl rounded-br-md" : 
                    "rounded-l-2xl rounded-r-md"
                  )
                : cn(
                    "bg-muted text-foreground",
                    isFirstInGroup ? "rounded-2xl" : 
                    isLastInGroup ? "rounded-t-2xl rounded-br-2xl rounded-bl-md" : 
                    "rounded-r-2xl rounded-l-md"
                  )
            )}
          >
            {message.content}
            
            {/* Timestamp for own messages */}
            {isOwnMessage && isLastInGroup && (
              <div className="text-[10px] sm:text-xs text-white/70 mt-0.5 sm:mt-1 text-right">
                {formatMessageTime(message.created_at)}
              </div>
            )}
          </div>

          {/* Message actions */}
          {showActions && message.message_type !== 'system' && (
            <div className={cn(
              "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur rounded-lg border border-border p-1 shadow-lg z-10",
              isOwnMessage ? "order-first" : "order-last"
            )}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Smile className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto">
                  <div className="flex gap-1 p-1">
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="p-1 hover:bg-muted rounded text-base transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReply}
                className="h-7 w-7 p-0"
              >
                <Reply className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isOwnMessage ? "justify-end" : "justify-start")}>
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs bg-background border border-border rounded-full hover:bg-muted transition-colors",
                  reactions.some(r => r.user_id === user?.id) && "bg-primary/20 border-primary text-primary"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{reactions.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};