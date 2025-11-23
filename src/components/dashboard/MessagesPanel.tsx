import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[800px] bg-background z-50 flex flex-col shadow-2xl">
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
    </>
  );
};