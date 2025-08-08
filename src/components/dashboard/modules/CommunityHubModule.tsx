import React, { useState } from 'react';
import { Users, MessageSquare, Calendar, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('buckets');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Community Hub
        </h3>
      </div>
      
      <Tabs defaultValue="buckets" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-2 bg-background/50">
          <TabsTrigger value="buckets" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">Buckets of Love</TabsTrigger>
          <TabsTrigger value="wellness" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">Wellness</TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Announcements</TabsTrigger>
          <TabsTrigger value="directory" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">Directory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="buckets" className="flex-1 p-4 bg-gradient-to-b from-pink-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 text-pink-500" />
            <p className="mb-2 font-medium text-pink-700">Spread Love & Encouragement</p>
            <p className="text-sm mb-4">Send appreciation messages to fellow members</p>
            <Button variant="outline" size="sm" className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 hover:border-pink-300">
              <Heart className="w-4 h-4 mr-2" />
              Send Bucket of Love
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="wellness" className="flex-1 p-4 bg-gradient-to-b from-green-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="mb-2 font-medium text-green-700">Wellness & Mental Health</p>
            <p className="text-sm mb-4">Support your well-being and connect with resources</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300">
                Daily Check-in
              </Button>
              <Button variant="outline" size="sm" className="w-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                Wellness Resources
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="announcements" className="flex-1 p-4 bg-gradient-to-b from-blue-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-blue-500" />
            <p className="font-medium text-blue-700 mb-2">No new announcements</p>
            <p className="text-sm">Stay tuned for important updates</p>
          </div>
        </TabsContent>
        
        <TabsContent value="directory" className="flex-1 p-4 bg-gradient-to-b from-purple-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 text-purple-500" />
            <p className="font-medium text-purple-700 mb-2">Quick member lookup</p>
            <Button variant="outline" size="sm" className="mt-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300">
              View Full Directory
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};