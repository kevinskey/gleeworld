import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Music, 
  Calendar, 
  MessageCircle,
  FileText,
  Settings,
  Eye,
  BookOpen,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';
import { 
  SectionLeaderManagement, 
  SheetMusicAnnotations, 
  CommunicationCenter 
} from './PlaceholderComponents';
import { SightSingingManager } from './SightSingingManager';

interface StudentConductorDashboardProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
  };
}

export const StudentConductorDashboard = ({ user }: StudentConductorDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalSectionLeaders: 4,
    activeSectionals: 12,
    completedSightSinging: 85,
    pendingCommunications: 3,
    averageSectionProgress: 78,
    upcomingRehearsals: 5
  });

  const sectionLeaders = [
    { id: '1', name: 'Sarah Williams', section: 'Soprano', status: 'active', lastActivity: '2 hours ago' },
    { id: '2', name: 'Michelle Johnson', section: 'Alto', status: 'active', lastActivity: '1 hour ago' },
    { id: '3', name: 'Angela Davis', section: 'Tenor', status: 'busy', lastActivity: '30 minutes ago' },
    { id: '4', name: 'Jessica Brown', section: 'Bass', status: 'active', lastActivity: '15 minutes ago' }
  ];

  const recentActivity = [
    { id: '1', type: 'sectional', description: 'Alto sectional completed - 95% attendance', time: '2 hours ago' },
    { id: '2', type: 'sight_singing', description: 'New sight singing exercise assigned to all sections', time: '4 hours ago' },
    { id: '3', type: 'communication', description: 'Message sent to Soprano section leaders', time: '1 day ago' },
    { id: '4', type: 'annotation', description: 'Sheet music annotations updated for "Amazing Grace"', time: '1 day ago' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sectional': return <Users className="h-4 w-4" />;
      case 'sight_singing': return <Eye className="h-4 w-4" />;
      case 'communication': return <MessageCircle className="h-4 w-4" />;
      case 'annotation': return <FileText className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Conductor Dashboard</h2>
          <p className="text-muted-foreground">
            Manage section leaders, coordinate sectionals, and oversee musical development
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="section-leaders">Section Leaders</TabsTrigger>
          <TabsTrigger value="sight-singing">Sight Singing</TabsTrigger>
          <TabsTrigger value="sheet-music">Sheet Music</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.totalSectionLeaders}</div>
                <div className="text-sm text-muted-foreground">Section Leaders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.activeSectionals}</div>
                <div className="text-sm text-muted-foreground">Active Sectionals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.completedSightSinging}%</div>
                <div className="text-sm text-muted-foreground">Sight Singing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.pendingCommunications}</div>
                <div className="text-sm text-muted-foreground">Pending Messages</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.averageSectionProgress}%</div>
                <div className="text-sm text-muted-foreground">Avg Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.upcomingRehearsals}</div>
                <div className="text-sm text-muted-foreground">Upcoming Events</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Section Leaders Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Section Leaders Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionLeaders.map((leader) => (
                  <div key={leader.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{leader.name}</div>
                        <div className="text-sm text-muted-foreground">{leader.section}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(leader.status)}>
                        {leader.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {leader.lastActivity}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.description}</div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="section-leaders">
          <SectionLeaderManagement user={user} />
        </TabsContent>

        <TabsContent value="sight-singing">
          <SightSingingManager user={user} />
        </TabsContent>

        <TabsContent value="sheet-music">
          <SheetMusicAnnotations user={user} />
        </TabsContent>

        <TabsContent value="communications">
          <CommunicationCenter user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};