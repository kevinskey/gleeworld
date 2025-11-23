import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  conversation_id: string;
  sender_phone?: string;
  sender_user_id?: string;
  sender_name?: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
}

const highlightMentions = (text: string) => {
  // Highlight @mentions with GroupMe-style formatting
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="font-semibold text-[hsl(var(--message-header))] bg-[hsl(var(--message-header))]/10 px-1 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';
  const isDelivered = message.status === 'delivered';
  const isFailed = message.status === 'failed';

  const senderInitials = message.sender_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className={cn(
      'flex gap-2 mb-3',
      isOutbound ? 'justify-end' : 'justify-start'
    )}>
      {/* Avatar for received messages */}
      {!isOutbound && (
        <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
          <AvatarFallback className="bg-[hsl(var(--message-header))]/20 text-[hsl(var(--message-header))] text-xs font-medium">
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5',
        isOutbound 
          ? 'bg-[hsl(var(--message-sent))] text-white' 
          : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-fg))]'
      )}>
        {/* Sender name for inbound messages */}
        {!isOutbound && message.sender_name && (
          <div className="text-xs font-semibold text-[hsl(var(--message-header))] mb-1">
            {message.sender_name}
          </div>
        )}

        {/* Message content with @mention highlighting */}
        <div className="text-sm leading-relaxed break-words">
          {highlightMentions(message.message_body)}
        </div>

        {/* Message footer */}
        <div className={cn(
          'flex items-center justify-end gap-1 mt-1.5 text-xs',
          isOutbound ? 'text-white/70' : 'text-muted-foreground'
        )}>
          <span>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          
          {/* Delivery status for outbound messages */}
          {isOutbound && (
            <>
              {isFailed ? (
                <span className="text-white/90 ml-1">Failed</span>
              ) : isDelivered ? (
                <CheckCheck className="w-3.5 h-3.5 ml-1" />
              ) : (
                <Check className="w-3.5 h-3.5 ml-1" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;