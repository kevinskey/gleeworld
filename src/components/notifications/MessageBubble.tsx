import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, Download, FileIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageReactions } from '@/components/messaging/features/MessageReactions';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  conversation_id: string;
  sender_phone?: string;
  sender_user_id?: string | null;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  message_body?: string | null;
  content?: string | null;
  direction?: 'inbound' | 'outbound';
  status?: string;
  created_at: string;
  message_type?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

interface MessageBubbleProps {
  message: Message;
}

const highlightMentions = (text: string | undefined) => {
  if (!text) return null;

  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="rounded px-1 font-semibold text-primary bg-primary/10">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const senderId = message.sender_user_id ?? message.sender_id;
  const isOutbound = message.direction ? message.direction === 'outbound' : senderId === user?.id;
  const isDelivered = message.status ? message.status === 'delivered' : true;
  const isFailed = message.status === 'failed';
  const messageText = message.message_body ?? message.content ?? '';
  const hasAttachment = Boolean(message.file_url);
  const shouldShowText = Boolean(messageText) && (message.message_type === 'text' || !hasAttachment || messageText !== message.file_name);

  const senderInitials = message.sender_name
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className={cn('mb-2 flex gap-1.5 md:mb-3 md:gap-2', isOutbound ? 'justify-end' : 'justify-start')}>
      {!isOutbound && (
        <Avatar className="mt-0.5 h-6 w-6 flex-shrink-0 md:h-9 md:w-9">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="bg-primary/15 text-[9px] font-medium text-primary md:text-xs">
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-2.5 py-1.5 md:max-w-[75%] md:px-4 md:py-2.5',
          isOutbound ? 'bg-[hsl(var(--message-sent))] text-white' : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-fg))]',
        )}
      >
        {!isOutbound && message.sender_name && (
          <div className="mb-0.5 text-[10px] font-semibold text-primary md:mb-1 md:text-xs">
            {message.sender_name}
          </div>
        )}

        {shouldShowText && (
          <div className="break-words text-[11px] leading-relaxed md:text-sm">
            {highlightMentions(messageText)}
          </div>
        )}

        {message.message_type === 'image' && message.file_url && (
          <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
            <img
              src={message.file_url}
              alt={message.file_name || 'Image attachment'}
              className="max-w-[240px] rounded-xl object-cover"
            />
          </a>
        )}

        {message.message_type === 'audio' && message.file_url && (
          <div className="mt-2">
            <audio controls preload="metadata" className="w-full max-w-[240px]">
              <source src={message.file_url} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {message.file_url && (!message.message_type || message.message_type === 'file') && (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 transition-colors hover:bg-background/60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{message.file_name || 'Attachment'}</p>
              <p className="text-xs text-muted-foreground">Tap to open</p>
            </div>
            <Download className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </a>
        )}

        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-0.5 text-[9px] md:mt-1.5 md:gap-1 md:text-xs',
            isOutbound ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>

          {isOutbound && (
            <>
              {isFailed ? (
                <span className="ml-0.5 text-white/90 md:ml-1">Failed</span>
              ) : isDelivered ? (
                <CheckCheck className="ml-0.5 h-2.5 w-2.5 md:ml-1 md:h-3.5 md:w-3.5" />
              ) : (
                <Check className="ml-0.5 h-2.5 w-2.5 md:ml-1 md:h-3.5 md:w-3.5" />
              )}
            </>
          )}
        </div>

        <MessageReactions messageId={message.id} />
      </div>
    </div>
  );
};

export default MessageBubble;