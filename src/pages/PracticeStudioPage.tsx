import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Music, 
  ClipboardList, 
  Play, 
  Mic, 
  GraduationCap,
  Users,
  Shield,
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PracticeStudioDashboard } from '@/components/practice-studio/PracticeStudioDashboard';
import { MusicXMLLibrary } from '@/components/practice-studio/MusicXMLLibrary';
import { AssignmentManagement } from '@/components/practice-studio/AssignmentManagement';

const PracticeStudioPage: React.FC = () => {
  const { user } = useAuth();
  const { userProfile: profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'assignments'>('dashboard');

  // Check user permissions for different sections
  const canManageLibrary = profile?.is_admin || profile?.is_super_admin || 
    profile?.role === 'section-leader' || profile?.role === 'student-conductor';
  
  const canManageAssignments = profile?.is_admin || profile?.is_super_admin || 
    profile?.role === 'section-leader' || profile?.role === 'student-conductor';

  const getRoleIcon = () => {
    if (profile?.is_super_admin) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (profile?.is_admin) return <Shield className="h-4 w-4 text-red-500" />;
    if (profile?.role === 'student-conductor') return <Music className="h-4 w-4 text-purple-500" />;
    if (profile?.role === 'section-leader') return <Users className="h-4 w-4 text-blue-500" />;
    return <GraduationCap className="h-4 w-4 text-green-500" />;
  };

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Music className="h-8 w-8 text-primary" />
                Practice Studio
              </h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive sight-singing practice with assignments, library management, and AI evaluation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getRoleIcon()}
              <Badge variant="secondary" className="text-sm">
                {profile?.role?.replace('-', ' ') || 'Student'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Practice Studio
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2" disabled={!canManageLibrary}>
              <BookOpen className="h-4 w-4" />
              MusicXML Library
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2" disabled={!canManageAssignments}>
              <ClipboardList className="h-4 w-4" />
              Assignment Management
            </TabsTrigger>
          </TabsList>

          {/* Practice Studio Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Practice & Recording Studio
                </CardTitle>
                <CardDescription>
                  Practice assigned exercises, record performances, and receive AI-powered feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PracticeStudioDashboard user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* MusicXML Library */}
          <TabsContent value="library" className="space-y-6">
            {canManageLibrary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    MusicXML Score Library
                  </CardTitle>
                  <CardDescription>
                    Create, manage, and organize sight-singing scores for assignments and practice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MusicXMLLibrary user={user} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>
                    You need administrator, section leader, or student conductor permissions to access the MusicXML Library.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Contact your section leader or administrator for access to library management features.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assignment Management */}
          <TabsContent value="assignments" className="space-y-6">
            {canManageAssignments ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Assignment Management
                  </CardTitle>
                  <CardDescription>
                    Assign scores to students, track submissions, and manage AI grading results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssignmentManagement user={user} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>
                    You need administrator, section leader, or student conductor permissions to manage assignments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Contact your section leader or administrator for access to assignment management features.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default PracticeStudioPage;