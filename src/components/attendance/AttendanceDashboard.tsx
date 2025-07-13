import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  AlertCircle,
  BarChart3,
  UserCheck,
  FileText,
  Shield
} from 'lucide-react';
import { TakeAttendance } from './TakeAttendance';
import { MyAttendance } from './MyAttendance';
import { ExcuseRequests } from './ExcuseRequests';
import { AttendanceReports } from './AttendanceReports';
import { PreEventExcuses } from './PreEventExcuses';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export const AttendanceDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  // Check if user can take attendance (only secretary or her designate)
  const canTakeAttendance = isAdmin; // For now, only admins can take attendance until secretary role is properly defined

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to access attendance features.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Attendance Management
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Track and manage attendance for Spelman College Glee Club events
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">My Attendance</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">85%</div>
            <p className="text-xs text-muted-foreground mt-1">This semester</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Events This Week</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">3</div>
            <p className="text-xs text-muted-foreground mt-1">Rehearsals & Performances</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Pending Excuses</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">1</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Section Average</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">78%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.voice_part || 'All sections'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-1 border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-white/80 backdrop-blur-sm">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">My Attendance</span>
              <span className="sm:hidden">Attendance</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="pre-excuses" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Pre-Event Excuses</span>
              <span className="sm:hidden">Pre-Excuse</span>
            </TabsTrigger>
            
            {canTakeAttendance && (
              <TabsTrigger 
                value="take-attendance" 
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Take Attendance</span>
                <span className="sm:hidden">Take</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger 
              value="excuses" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Post-Event Excuses</span>
              <span className="sm:hidden">Excuses</span>
            </TabsTrigger>
            
            {isAdmin && (
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
                <span className="sm:hidden">Reports</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="mt-8">
            <TabsContent value="overview" className="space-y-6 animate-fade-in">
              <MyAttendance />
            </TabsContent>

            <TabsContent value="pre-excuses" className="space-y-6 animate-fade-in">
              <PreEventExcuses />
            </TabsContent>

            {canTakeAttendance && (
              <TabsContent value="take-attendance" className="space-y-6 animate-fade-in">
                <TakeAttendance />
              </TabsContent>
            )}

            <TabsContent value="excuses" className="space-y-6 animate-fade-in">
              <ExcuseRequests />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="reports" className="space-y-6 animate-fade-in">
                <AttendanceReports />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};