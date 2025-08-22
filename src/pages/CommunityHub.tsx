import React, { useState } from 'react';
import { CommunityLayout } from '@/components/community/CommunityLayout';
import { ActivityFeed } from '@/components/community/ActivityFeed';
import { QuickActions } from '@/components/community/QuickActions';
import { MessagingInterface } from '@/components/messaging/MessagingInterface';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';
import { EnhancedNotificationsPanel } from '@/components/notifications/EnhancedNotificationsPanel';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bell, 
  Heart, 
  Mic, 
  Activity,
  Users,
  Calendar,
  Sparkles
} from 'lucide-react';

const CommunityHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <CommunityLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Community Hub
            </h1>
            <p className="text-muted-foreground">
              Your central space for messages, wellness, love notes, and staying connected
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Glee Community
          </Badge>
        </div>

        {/* Quick Actions Bar */}
        <QuickActions />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Wellness
            </TabsTrigger>
            <TabsTrigger value="love" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Love Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Feed */}
              <div className="lg:col-span-2">
                <ActivityFeed />
              </div>
              
              {/* Quick Widgets */}
              <div className="space-y-4">
                {/* Mini Buckets of Love */}
                <BucketsOfLoveWidget />
                
                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Today's Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Unread Messages</span>
                      <Badge variant="secondary">3</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Love Notes Sent</span>
                      <Badge variant="secondary">12</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wellness Check</span>
                      <Badge variant="outline" className="text-green-600">Good</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <Card className="h-[800px]">
              <CardContent className="p-0 h-full">
                <MessagingInterface embedded={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <EnhancedNotificationsPanel />
          </TabsContent>

          {/* Wellness Tab */}
          <TabsContent value="wellness" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Vocal Health & Wellness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VocalHealthLog />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Love Notes Tab */}
          <TabsContent value="love" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Send Love
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BucketsOfLoveWidget />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Love Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg">
                      <p className="text-pink-700 dark:text-pink-300">
                        "Amazing performance today! Your harmony was perfect. 💕"
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">From Sarah • 2 hours ago</p>
                    </div>
                    <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg">
                      <p className="text-pink-700 dark:text-pink-300">
                        "Thank you for helping me with that tricky passage!"
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">From Maria • 1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CommunityLayout>
  );
};

export default CommunityHub;