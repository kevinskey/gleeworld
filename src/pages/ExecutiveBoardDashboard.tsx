import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutiveToursLogistics } from '@/components/executive/modules/ExecutiveToursLogistics';
import { ExecutiveConcertManagement } from '@/components/executive/modules/ExecutiveConcertManagement';
import { ExecutiveTaskManager } from '@/components/executive/modules/ExecutiveTaskManager';
import { ExecutiveCommunications } from '@/components/executive/modules/ExecutiveCommunications';
import { ExecutiveCalendar } from '@/components/executive/modules/ExecutiveCalendar';
import { 
  Crown, 
  Bus, 
  Music, 
  CheckSquare, 
  MessageSquare, 
  Calendar, 
  Loader2,
  Shield,
  User
} from 'lucide-react';

const ExecutiveBoardDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);

  useEffect(() => {
    document.title = 'Executive Board Dashboard | Glee Club';
  }, []);

  if (authLoading || profileLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // For demo purposes, allow access for onnestypeele@spelman.edu
  const isDemoUser = user.email === 'onnestypeele@spelman.edu';
  const isExecBoard = userProfile?.is_exec_board || isDemoUser;
  const execRole = userProfile?.exec_board_role || (isDemoUser ? 'tour_manager' : null);

  if (!isExecBoard) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <div className="space-y-6 px-4 md:px-0">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="h-8 w-8 text-purple-600" />
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bebas text-brand-800 tracking-wide">
              Executive Board Dashboard
            </h1>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{userProfile?.full_name || user.email}</span>
            </div>
            <Badge variant="outline" className="text-purple-700 border-purple-300">
              {execRole?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Executive Board'}
            </Badge>
            {isDemoUser && (
              <Badge variant="secondary" className="text-orange-700 border-orange-300">
                Demo Access
              </Badge>
            )}
          </div>
          
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Coordinate tours, manage concerts, and oversee Glee Club operations with comprehensive logistics tools
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bus className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Active Tours</p>
                  <p className="text-2xl font-bold text-blue-900">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Music className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Upcoming Concerts</p>
                  <p className="text-2xl font-bold text-purple-900">5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Pending Tasks</p>
                  <p className="text-2xl font-bold text-green-900">8</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">This Week's Events</p>
                  <p className="text-2xl font-bold text-orange-900">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Card className="bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-6 w-6 text-purple-600" />
                  Executive Management Hub
                </CardTitle>
                <CardDescription>
                  Comprehensive tools for coordinating Glee Club operations and logistics
                </CardDescription>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Shield className="h-4 w-4 mr-2" />
                Admin Tools
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tours" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="tours" className="flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  Tours & Logistics
                </TabsTrigger>
                <TabsTrigger value="concerts" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Concert Management
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Task Management
                </TabsTrigger>
                <TabsTrigger value="communications" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communications
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Executive Calendar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tours" className="mt-6">
                <ExecutiveToursLogistics />
              </TabsContent>

              <TabsContent value="concerts" className="mt-6">
                <ExecutiveConcertManagement />
              </TabsContent>

              <TabsContent value="tasks" className="mt-6">
                <ExecutiveTaskManager preview={false} execRole={execRole} />
              </TabsContent>

              <TabsContent value="communications" className="mt-6">
                <ExecutiveCommunications preview={false} execRole={execRole} />
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
                <ExecutiveCalendar preview={false} execRole={execRole} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default ExecutiveBoardDashboard;