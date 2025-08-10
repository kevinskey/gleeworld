import React, { useState } from 'react';
import { Users, MessageSquare, Heart, Send, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { MemberDirectory } from '@/components/directory/MemberDirectory';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationsSection } from '@/components/unified/NotificationsSection';
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';
import { BucketsOfLoveModule } from '@/components/modules/BucketsOfLoveModule';
export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Buckets of Love tab removed from Community Hub per request
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="p-4 md:p-6 border-b border-border bg-gradient-to-r from-primary/15 via-accent/10 to-secondary/15">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Community Hub
            </h1>
            <p className="text-sm text-muted-foreground">To Amaze and Inspire — Wellness, Notifications, Announcements</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setActiveTab('wellness')} className="hover-scale">
              Wellness
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('announcements')} className="hover-scale">
              Announcements
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('buckets')} className="hover-scale">
              <Heart className="h-4 w-4 mr-1" /> Buckets
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('notifications')} className="hover-scale">
              <Bell className="h-4 w-4 mr-1" /> Notifications
            </Button>
            <SendBucketOfLove trigger={
              <Button size="sm" variant="ghost" className="hover-scale">
                <Send className="h-4 w-4 mr-1" /> Send Love
              </Button>
            } />
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        
        {/* Buckets of Love tab intentionally removed */}
        
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
        
        <TabsContent value="buckets" className="flex-1 p-4 bg-gradient-to-b from-pink-50/50 to-background">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Share encouragement with the community</p>
            <SendBucketOfLove trigger={<Button size="sm" variant="default" className="hover-scale"><Send className="h-4 w-4 mr-1" /> Add Bucket</Button>} />
          </div>
          <BucketsOfLoveModule user={user} isFullPage />
        </TabsContent>
        
        <TabsContent value="notifications" className="flex-1 p-4">
          <NotificationsSection />
        </TabsContent>
        
        <TabsContent value="directory" className="flex-1">
          <MemberDirectory />
        </TabsContent>
      </Tabs>
    </div>
  );
};