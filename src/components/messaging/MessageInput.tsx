import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...'
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border p-2">
        <EnhancedTooltip content="Attach file">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0"
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </EnhancedTooltip>
        
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-32 resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />
        </div>
        
        <EnhancedTooltip content="Send message">
          <Button 
            type="submit" 
            disabled={disabled || !message.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90 flex-shrink-0"
          >
            {disabled ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </EnhancedTooltip>
      </div>
    </form>
  );
};