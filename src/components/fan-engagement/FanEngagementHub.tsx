import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Star, Users, Plus } from 'lucide-react';
import { BulletinPostManager } from '@/components/fan-engagement/BulletinPostManager';
import { SpotlightContentManager } from '@/components/fan-engagement/SpotlightContentManager';
import { FanAnalytics } from '@/components/fan-engagement/FanAnalytics';

export const FanEngagementHub = () => {
  const [activeTab, setActiveTab] = useState("bulletin");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Fan Engagement Hub
          </h2>
          <p className="text-muted-foreground">
            Manage fan community content and engagement
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Content
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fans</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Posts</p>
                <p className="text-2xl font-bold">23</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Featured Content</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="bulletin">Bulletin Posts</TabsTrigger>
          <TabsTrigger value="spotlight">Spotlight Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="bulletin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulletin Board Management</CardTitle>
              <CardDescription>
                Create and manage posts for the fan bulletin board
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulletinPostManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spotlight" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spotlight Content</CardTitle>
              <CardDescription>
                Manage featured content and exclusive fan experiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpotlightContentManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fan Engagement Analytics</CardTitle>
              <CardDescription>
                Track fan activity and content performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FanAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};