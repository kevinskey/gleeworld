import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileIcon, Image as ImageIcon } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const isImageFile = (file: File) =>
  file.type.startsWith('image/');

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...'
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || disabled) return;

    onSendMessage(message.trim(), selectedFile || undefined);
    setMessage('');
    clearFile();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be under 25MB');
      return;
    }

    setSelectedFile(file);

    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      {/* File Preview */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/50 border border-border">
          {filePreview ? (
            <img
              src={filePreview}
              alt="Preview"
              className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full flex-shrink-0"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-background rounded-2xl border border-border p-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          onChange={handleFileSelect}
        />

        <EnhancedTooltip content="Attach file or image">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
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
            placeholder={selectedFile && !message ? `Send ${isImageFile(selectedFile) ? 'image' : 'file'}...` : placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-32 resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 !text-[hsl(var(--message-received-fg))] placeholder:text-muted-foreground"
            rows={1}
          />
        </div>
        
        <EnhancedTooltip content="Send message">
          <Button 
            type="submit" 
            disabled={disabled || (!message.trim() && !selectedFile)}
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
