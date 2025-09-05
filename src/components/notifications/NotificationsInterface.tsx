import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Bell, Users, Send } from 'lucide-react';
import { GroupMessageInterface } from './GroupMessageInterface';
import { QuickNotificationPanel } from './QuickNotificationPanel';

export const NotificationsInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('messages');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Group Messages
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Quick Send
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 mt-4">
          <GroupMessageInterface />
        </TabsContent>

        <TabsContent value="notifications" className="flex-1 mt-4">
          <QuickNotificationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsInterface;