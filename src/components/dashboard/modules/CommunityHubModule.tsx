import React, { useState } from 'react';
import { Users, Radio, BookOpen, Camera, UserCheck, Activity, MessageSquare, Calendar, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const communityModules = [
    {
      id: 'directory',
      name: 'Member Directory',
      icon: Users,
      description: 'Find and connect with fellow members',
      color: 'bg-blue-500/10 text-blue-700 border-blue-200',
      notifications: 3
    },
    {
      id: 'radio',
      name: 'Radio Station',
      icon: Radio,
      description: 'Live streaming and audio content',
      color: 'bg-purple-500/10 text-purple-700 border-purple-200',
      notifications: 0
    },
    {
      id: 'handbook',
      name: 'Handbook',
      icon: BookOpen,
      description: 'Rules, procedures, and guidelines',
      color: 'bg-green-500/10 text-green-700 border-green-200',
      notifications: 1
    },
    {
      id: 'media',
      name: 'Media Gallery',
      icon: Camera,
      description: 'Photos, videos, and memories',
      color: 'bg-violet-500/10 text-violet-700 border-violet-200',
      notifications: 0
    },
    {
      id: 'attendance',
      name: 'Attendance',
      icon: UserCheck,
      description: 'Track rehearsal and event attendance',
      color: 'bg-orange-500/10 text-orange-700 border-orange-200',
      notifications: 2
    },
    {
      id: 'activity',
      name: 'Activity Feed',
      icon: Activity,
      description: 'Recent updates and announcements',
      color: 'bg-red-500/10 text-red-700 border-red-200',
      notifications: 5
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'directory',
      message: 'New member Sarah Johnson joined the directory',
      time: '5 minutes ago',
      icon: Users
    },
    {
      id: 2,
      type: 'radio',
      message: 'New song "Amazing Grace" added to radio playlist',
      time: '1 hour ago',
      icon: Radio
    },
    {
      id: 3,
      type: 'media',
      message: 'Concert photos from last performance uploaded',
      time: '2 hours ago',
      icon: Camera
    },
    {
      id: 4,
      type: 'handbook',
      message: 'Handbook updated with new tour guidelines',
      time: '1 day ago',
      icon: BookOpen
    }
  ];

  return (
    <div className="h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Community Hub</h2>
          <Badge variant="secondary" className="ml-auto">
            {communityModules.reduce((sum, module) => sum + module.notifications, 0)} updates
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Community Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card 
                    key={module.id} 
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 border-2 ${module.color}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <CardTitle className="text-sm font-medium">{module.name}</CardTitle>
                        </div>
                        {module.notifications > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {module.notifications}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Open {module.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">127</p>
                      <p className="text-xs text-muted-foreground">Active Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">24</p>
                      <p className="text-xs text-muted-foreground">Recent Messages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Radio className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">Live</p>
                      <p className="text-xs text-muted-foreground">Radio Status</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Camera className="w-8 h-8 text-violet-500" />
                    <div>
                      <p className="text-2xl font-bold">89</p>
                      <p className="text-xs text-muted-foreground">New Photos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};