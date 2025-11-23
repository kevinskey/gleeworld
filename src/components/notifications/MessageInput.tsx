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
      'flex items-end gap-2 p-2 rounded-full border transition-all',
      isFocused ? 'border-[hsl(var(--message-header))]/50 bg-background shadow-sm' : 'border-border bg-muted/30'
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
          className="min-h-0 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-4 py-2 text-sm"
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

      {/* Emoji button (placeholder for future enhancement) */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0 hidden sm:flex hover:bg-muted"
        disabled={disabled}
      >
        <Smile className="h-4 w-4 text-muted-foreground" />
      </Button>

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="sm"
        className="h-9 w-9 p-0 flex-shrink-0 rounded-full bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MessageInput;