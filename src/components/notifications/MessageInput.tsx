import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile } from 'lucide-react';
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
    <div className={cn(
      'flex items-end gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors',
      isFocused ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'
    )}>
      <div className="flex-1 relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="min-h-0 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent"
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
        
        {/* Character count for SMS */}
        <div className="absolute bottom-1 right-1 sm:right-2 text-xs text-muted-foreground">
          {message.length}/160
        </div>
      </div>

      {/* Emoji button (placeholder for future enhancement) */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0 hidden sm:flex"
        disabled={disabled}
      >
        <Smile className="h-4 w-4" />
      </Button>

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="sm"
        className="h-8 px-2 sm:px-3 flex-shrink-0"
      >
        <Send className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
};

export default MessageInput;