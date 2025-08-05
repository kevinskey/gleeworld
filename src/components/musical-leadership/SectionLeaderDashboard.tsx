import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  MessageCircle,
  FileText,
  Music,
  Clock,
  Settings,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  SectionRosterManager, 
  SectionalPlanner, 
  SectionCommunications, 
  SectionNotes, 
  SetlistCreator 
} from './PlaceholderComponents';

interface SectionLeaderDashboardProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    section?: string;
  };
}

export const SectionLeaderDashboard = ({ user }: SectionLeaderDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userSection] = useState(user?.section || 'Soprano'); // This would come from user profile
  const [stats, setStats] = useState({
    sectionMembers: 0,
    upcomingSectionals: 0,
    completedSectionals: 0,
    pendingTasks: 0,
    attendanceRate: 0,
    preparednessLevel: 0
  });

  const recentActivity: any[] = [];

  const upcomingEvents: any[] = [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sectional': return <Calendar className="h-4 w-4" />;
      case 'communication': return <MessageCircle className="h-4 w-4" />;
      case 'setlist': return <Music className="h-4 w-4" />;
      case 'notes': return <FileText className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{userSection} Section Leader Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your section members, plan sectionals, and coordinate activities
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Sectional
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">Section Roster</TabsTrigger>
          <TabsTrigger value="sectionals">Sectional Planning</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="setlists">Setlists</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.sectionMembers}</div>
                <div className="text-sm text-muted-foreground">Section Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.upcomingSectionals}</div>
                <div className="text-sm text-muted-foreground">Upcoming Sectionals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.completedSectionals}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.pendingTasks}</div>
                <div className="text-sm text-muted-foreground">Pending Tasks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.attendanceRate}%</div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-foreground">{stats.preparednessLevel}%</div>
                <div className="text-sm text-muted-foreground">Preparedness</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.date} at {event.time}
                      </div>
                      <div className="text-xs text-muted-foreground">{event.location}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming events scheduled
                  </div>
                )}
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
                {recentActivity.length > 0 ? recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{activity.description}</div>
                        {getStatusIcon(activity.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roster">
          <SectionRosterManager user={user} section={userSection} />
        </TabsContent>

        <TabsContent value="sectionals">
          <SectionalPlanner user={user} section={userSection} />
        </TabsContent>

        <TabsContent value="communications">
          <SectionCommunications user={user} section={userSection} />
        </TabsContent>

        <TabsContent value="notes">
          <SectionNotes user={user} section={userSection} />
        </TabsContent>

        <TabsContent value="setlists">
          <SetlistCreator user={user} section={userSection} />
        </TabsContent>
      </Tabs>
    </div>
  );
};