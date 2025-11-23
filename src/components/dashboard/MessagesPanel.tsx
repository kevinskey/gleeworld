import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  const [panelSize, setPanelSize] = useState(40); // Default 40% of screen width

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Resizable Side Panel - offset from header and right margin */}
      <div className="fixed top-16 right-5 bottom-[40vh] z-50 pointer-events-none" style={{ width: 'calc(100% - 1.25rem)' }}>
        <ResizablePanelGroup direction="horizontal" className="h-full pointer-events-auto">
          {/* Empty left panel - backdrop click area */}
          <ResizablePanel 
            defaultSize={100 - panelSize} 
            minSize={20}
            onResize={(size) => setPanelSize(100 - size)}
            className="pointer-events-none"
          />
          
          {/* Resize Handle */}
          <ResizableHandle className="w-1 bg-border hover:bg-primary transition-colors pointer-events-auto" />
          
          {/* Messages Panel */}
          <ResizablePanel 
            defaultSize={panelSize}
            minSize={30}
            maxSize={80}
            className="bg-background shadow-2xl pointer-events-auto flex flex-col rounded-l-xl overflow-hidden"
          >
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
};