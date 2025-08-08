import React, { useState } from 'react';
import { Users, MessageSquare, Calendar, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('feed');

  const recentActivity = [
    {
      id: 1,
      type: 'announcement',
      title: 'Spring Concert Details Released',
      time: '2 hours ago',
      author: 'Dr. Johnson'
    },
    {
      id: 2,
      type: 'achievement',
      title: 'Sarah M. completed Sight Reading Level 3',
      time: '4 hours ago',
      author: 'System'
    },
    {
      id: 3,
      type: 'event',
      title: 'Sectional rehearsal scheduled for tomorrow',
      time: '6 hours ago',
      author: 'Section Leader'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Community Hub
        </h3>
      </div>
      
      <Tabs defaultValue="buckets" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-2">
          <TabsTrigger value="buckets">Buckets of Love</TabsTrigger>
          <TabsTrigger value="feed">Activity Feed</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="buckets" className="flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500" />
            <p className="mb-2 font-medium">Spread Love & Encouragement</p>
            <p className="text-sm mb-4">Send appreciation messages to fellow members</p>
            <Button variant="outline" size="sm" className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100">
              <Heart className="w-4 h-4 mr-2" />
              Send Bucket of Love
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="feed" className="flex-1 p-4 space-y-3 overflow-y-auto">
          {recentActivity.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">by {item.author} • {item.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="announcements" className="flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No new announcements</p>
          </div>
        </TabsContent>
        
        <TabsContent value="directory" className="flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Quick member lookup</p>
            <Button variant="outline" size="sm" className="mt-2">
              View Full Directory
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};