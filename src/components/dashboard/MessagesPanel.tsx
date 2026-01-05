import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={handleClose}
      />
      
      {/* Full-page content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 bg-[hsl(var(--message-header))] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">GleeWorld Messenger</span>
            <span className="text-sm text-white/70">Send branded emails and SMS to members</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-full text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          <GroupMessageInterface />
        </div>
      </div>
    </div>
  );
};
