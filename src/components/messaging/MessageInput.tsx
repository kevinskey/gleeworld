import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File, sendViaSMS?: boolean) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
  smsEnabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled = false,
  placeholder = 'Type a message...',
  smsEnabled = true
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sendViaSMS, setSendViaSMS] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), undefined, sendViaSMS);
      setMessage('');
      handleStopTyping();
      
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
    
    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onStopTyping();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-end gap-2 bg-background rounded-lg border border-border p-1">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleStopTyping}
            placeholder={sendViaSMS ? `${placeholder} (SMS)` : placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-32 resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg px-4 py-2 placeholder:text-muted-foreground"
            rows={1}
          />
        </div>
        
        <div className="flex gap-1 pr-1 items-center">
          {smsEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={sendViaSMS}
                    onPressedChange={setSendViaSMS}
                    size="sm"
                    className="h-8 w-8 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    disabled={disabled}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sendViaSMS ? 'Send as SMS' : 'Send as app message'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button 
            type="submit" 
            disabled={disabled || !message.trim()}
            size="icon"
            className="h-8 w-8 rounded-full"
          >
            {disabled ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {sendViaSMS && message.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 px-1">
          SMS: {message.length}/160 characters
        </div>
      )}
    </form>
  );
};