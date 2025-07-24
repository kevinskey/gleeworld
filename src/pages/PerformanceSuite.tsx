import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Music2, 
  MapPin, 
  FileText, 
  Users, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { SetlistBuilder } from '@/modules/performance/setlists/SetlistBuilder';
import { TourManager } from '@/modules/performance/tour/TourManager';
import { LicensingTracker } from '@/modules/performance/licensing/LicensingTracker';
import { useAuth } from '@/contexts/AuthContext';

const PerformanceSuite = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Sample stats - would be fetched from API in real implementation
  const stats = {
    totalSetlists: 12,
    publishedSetlists: 8,
    upcomingTourEvents: 3,
    activeLicenses: 156,
    expiringLicenses: 4
  };

  const recentActivity = [
    {
      type: 'setlist',
      title: 'Spring Concert 2024 setlist published',
      time: '2 hours ago',
      icon: Music2,
      color: 'text-blue-600'
    },
    {
      type: 'tour',
      title: 'Syracuse Jazz Festival travel arrangements updated',
      time: '5 hours ago',
      icon: MapPin,
      color: 'text-green-600'
    },
    {
      type: 'license',
      title: '4 licenses expiring within 30 days',
      time: '1 day ago',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      type: 'tour',
      title: 'New tour event: Atlanta Music Festival',
      time: '2 days ago',
      icon: Calendar,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Suite</h1>
          <p className="text-muted-foreground">
            Manage setlists, tours, and licensing for performances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Performance Manager
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setlists">Setlist Builder</TabsTrigger>
          <TabsTrigger value="tours">Tour Manager</TabsTrigger>
          <TabsTrigger value="licensing">Licensing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Setlists</CardTitle>
                <Music2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSetlists}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {stats.publishedSetlists} published
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tour Events</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingTourEvents}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Upcoming events
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeLicenses}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  All compliant
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">License Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.expiringLicenses}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  Expiring soon
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('setlists')}
                >
                  <Music2 className="h-4 w-4 mr-2" />
                  Create New Setlist
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('tours')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Plan Tour Event
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('licensing')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add License Entry
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-muted ${activity.color}`}>
                        <activity.icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Deadlines */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-sm">License Renewals</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    4 licenses expiring within 30 days
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Tour Preparation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Syracuse Jazz Festival in 15 days
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Music2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Setlist Review</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Spring Concert setlist due for review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="setlists" className="mt-6">
          <SetlistBuilder />
        </TabsContent>
        
        <TabsContent value="tours" className="mt-6">
          <TourManager />
        </TabsContent>
        
        <TabsContent value="licensing" className="mt-6">
          <LicensingTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceSuite;