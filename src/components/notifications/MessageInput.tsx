import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Send, Smile, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PollCreator } from '@/components/messaging/PollCreator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (message: string, sendSMS?: boolean) => void;
  disabled?: boolean;
  groupId?: string;
  onPollCreated?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  groupId,
  onPollCreated
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [sendSMS, setSendSMS] = useState(true); // Default to sending SMS for group messages

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), groupId ? sendSMS : undefined);
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
    <div className="flex flex-col gap-2">
      {/* SMS Toggle - Only show for group messages */}
      {groupId && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Also send as SMS to group members</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-medium",
                    sendSMS ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}>
                    {sendSMS ? 'SMS On' : 'SMS Off'}
                  </span>
                  <Switch
                    checked={sendSMS}
                    onCheckedChange={setSendSMS}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle to send this message via SMS to all group members with SMS enabled</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* Poll Creator button */}
        {groupId && (
          <PollCreator groupId={groupId} onPollCreated={onPollCreated} />
        )}
        
        {/* Plus/Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full text-muted-foreground hover:bg-muted touch-manipulation"
          disabled={disabled}
        >
          <Plus className="h-5 w-5" />
        </Button>

        <div className={cn(
          'flex-1 flex items-end gap-1.5 p-1.5 rounded-2xl border-2 transition-all',
          isFocused ? 'border-primary bg-background shadow-md' : 'border-border bg-card'
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
              className="min-h-0 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-3 py-2 text-sm touch-manipulation"
              style={{ 
                minHeight: '36px',
                maxHeight: '100px',
                overflowY: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              maxLength={160}
            />
          </div>

          {/* Emoji button - hidden on small mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0 hidden sm:flex hover:bg-muted touch-manipulation"
            disabled={disabled}
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="sm"
            className="h-10 w-10 p-0 flex-shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground touch-manipulation"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;