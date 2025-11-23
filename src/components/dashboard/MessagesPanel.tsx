import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* GroupMe-style messages interface */}
      <div className="flex-1 overflow-hidden">
        <GroupMessageInterface />
      </div>
    </div>
  );
};