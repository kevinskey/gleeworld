import React, { useState } from 'react';
import { Users, MessageSquare, Calendar, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('buckets');

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
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
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
        
        <TabsContent value="wellness" className="flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Heart className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="mb-2 font-medium">Wellness & Mental Health</p>
            <p className="text-sm mb-4">Support your well-being and connect with resources</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                Daily Check-in
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Wellness Resources
              </Button>
            </div>
          </div>
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