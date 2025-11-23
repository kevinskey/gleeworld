import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';
import { Rnd } from 'react-rnd';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Draggable & Resizable Messages Panel */}
      <Rnd
        default={{
          x: window.innerWidth - 650,
          y: 80,
          width: 600,
          height: window.innerHeight * 0.6,
        }}
        minWidth={350}
        minHeight={400}
        maxWidth={window.innerWidth - 100}
        maxHeight={window.innerHeight - 100}
        bounds="window"
        className="z-50"
        enableResizing={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        dragHandleClassName="drag-handle"
      >
        <div className="h-full bg-background shadow-2xl rounded-xl overflow-hidden flex flex-col border border-border">
          {/* Draggable Header */}
          <div className="drag-handle cursor-move bg-[hsl(var(--message-header))] text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors" onClick={onClose} />
                <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
              </div>
              <span className="text-sm font-medium ml-2">Messages</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Content */}
          <div className="flex-1 overflow-hidden">
            <GroupMessageInterface />
          </div>
        </div>
      </Rnd>
    </>
  );
};