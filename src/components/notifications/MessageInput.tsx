import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-1 md:gap-2">
      {/* Plus/Attachment button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 rounded-full text-muted-foreground hover:bg-muted"
        disabled={disabled}
      >
        <Plus className="h-4 w-4 md:h-5 md:w-5" />
      </Button>

      <div className={cn(
        'flex-1 flex items-end gap-1 md:gap-2 p-1.5 md:p-2 rounded-full border transition-all',
        isFocused ? 'border-[hsl(var(--message-header))]/50 bg-background shadow-sm' : 'border-border bg-muted/30'
      )}>
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type something..."
            disabled={disabled}
            rows={1}
            className="min-h-0 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm"
            style={{ 
              minHeight: '20px',
              maxHeight: '100px',
              overflow: 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            maxLength={160} // SMS limit
          />
        </div>

        {/* Emoji button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 md:h-8 md:w-8 p-0 flex-shrink-0 hidden sm:flex hover:bg-muted"
          disabled={disabled}
        >
          <Smile className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="sm"
          className="h-8 w-8 md:h-9 md:w-9 p-0 flex-shrink-0 rounded-full bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
        >
          <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;