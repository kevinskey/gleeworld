import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';

const MessengerPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-[hsl(var(--message-header))] text-white px-4 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">GleeWorld Messenger</h1>
          <p className="text-sm text-white/70">Send branded emails, SMS, and video chats to members</p>
        </div>
      </div>

      {/* Full-width content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GroupMessageInterface />
      </div>
    </div>
  );
};

export default MessengerPage;
