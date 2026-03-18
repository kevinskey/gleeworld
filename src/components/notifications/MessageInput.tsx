import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Send, Smile, Plus, MessageSquare, X, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PollCreator } from '@/components/messaging/PollCreator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (message: string, file?: File, sendSMS?: boolean) => void;
  disabled?: boolean;
  groupId?: string;
  onPollCreated?: () => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_ATTACHMENTS = 'image/*,audio/*,.mp3,.wav,.m4a,.ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  groupId,
  onPollCreated,
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [sendSMS, setSendSMS] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !selectedFile) || disabled) return;

    onSendMessage(trimmedMessage, selectedFile || undefined, groupId ? sendSMS : undefined);
    setMessage('');
    clearSelectedFile();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be under 25MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setFilePreview((event.target?.result as string) || null);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    e.target.value = '';
  };

  const canSend = (message.trim().length > 0 || !!selectedFile) && !disabled;

  return (
    <div className="flex flex-col gap-2">
      {selectedFile && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-2">
          {filePreview ? (
            <img
              src={filePreview}
              alt={selectedFile.name}
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full flex-shrink-0"
            onClick={clearSelectedFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {groupId && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Also send as SMS to group members</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', sendSMS ? 'text-primary' : 'text-muted-foreground')}>
                    {sendSMS ? 'SMS On' : 'SMS Off'}
                  </span>
                  <Switch checked={sendSMS} onCheckedChange={setSendSMS} />
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
        {groupId && <PollCreator groupId={groupId} onPollCreated={onPollCreated} />}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_ATTACHMENTS}
          onChange={handleFileSelect}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full text-muted-foreground hover:bg-muted touch-manipulation"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="h-5 w-5" />
        </Button>

        <div
          className={cn(
            'flex-1 flex items-end gap-1.5 rounded-2xl border-2 p-1.5 transition-all',
            isFocused ? 'border-primary bg-background shadow-md' : 'border-border bg-card',
          )}
        >
          <div className="relative flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={selectedFile && !message ? `Send ${selectedFile.type.startsWith('audio/') ? 'audio' : selectedFile.type.startsWith('image/') ? 'image' : 'file'}...` : 'Type something...'}
              disabled={disabled}
              rows={1}
              className="min-h-0 resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 touch-manipulation"
              style={{
                minHeight: '36px',
                maxHeight: '100px',
                overflowY: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              maxLength={160}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden h-8 w-8 flex-shrink-0 p-0 hover:bg-muted sm:flex touch-manipulation"
            disabled={disabled}
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            size="sm"
            className="h-10 w-10 flex-shrink-0 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90 touch-manipulation"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;