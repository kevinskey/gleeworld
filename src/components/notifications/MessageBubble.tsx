import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

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

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';
  const isDelivered = message.status === 'delivered';
  const isFailed = message.status === 'failed';

  return (
    <div className={cn(
      'flex mb-4',
      isOutbound ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-2 relative',
        isOutbound 
          ? 'bg-primary text-primary-foreground rounded-br-md' 
          : 'bg-muted text-foreground rounded-bl-md'
      )}>
        {/* Sender name for inbound messages */}
        {!isOutbound && message.sender_name && (
          <div className="text-xs font-medium text-primary mb-1">
            {message.sender_name}
          </div>
        )}

        {/* Message content */}
        <div className="text-sm leading-relaxed">
          {message.message_body}
        </div>

        {/* Message footer */}
        <div className={cn(
          'flex items-center justify-end gap-1 mt-1 text-xs',
          isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          <span>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          
          {/* Delivery status for outbound messages */}
          {isOutbound && (
            <>
              {isFailed ? (
                <span className="text-destructive ml-1">Failed</span>
              ) : isDelivered ? (
                <CheckCheck className="w-3 h-3 ml-1" />
              ) : (
                <Check className="w-3 h-3 ml-1" />
              )}
            </>
          )}
        </div>

        {/* Message tail */}
        <div className={cn(
          'absolute top-0 w-0 h-0',
          isOutbound 
            ? 'right-0 border-l-[6px] border-l-primary border-t-[6px] border-t-transparent transform translate-x-full'
            : 'left-0 border-r-[6px] border-r-muted border-t-[6px] border-t-transparent transform -translate-x-full'
        )} />
      </div>
    </div>
  );
};

export default MessageBubble;