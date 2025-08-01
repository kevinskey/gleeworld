import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Crown,
  Shield,
  Home,
  Settings,
  Calendar,
  DollarSign,
  MapPin,
  BookOpen,
  FileText,
  Music2,
  Heart,
  Camera,
  MessageSquare,
  BarChart3,
  Shirt
} from "lucide-react";

export const ExecutiveBoardDashboard = () => {
  console.log('ExecutiveBoardDashboard: Component started rendering');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  console.log('ExecutiveBoardDashboard: User:', user?.id);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    console.log('ExecutiveBoardDashboard: checkAccess called');
    
    if (!user) {
      console.log('ExecutiveBoardDashboard: No user found');
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      console.log('ExecutiveBoardDashboard: Checking user access for:', user.id);
      
      // Check if user has admin or exec board access
      const { data: profileData, error } = await supabase
        .from('gw_profiles')
        .select('is_super_admin, is_admin, is_exec_board, exec_board_role, role')
        .eq('user_id', user.id)
        .single();

      console.log('ExecutiveBoardDashboard: Profile data:', profileData);
      console.log('ExecutiveBoardDashboard: Profile error:', error);

      if (profileData) {
        const isAdmin = profileData.is_super_admin || profileData.is_admin;
        const isExecBoard = profileData.is_exec_board;
        
        console.log('ExecutiveBoardDashboard: Is admin:', isAdmin);
        console.log('ExecutiveBoardDashboard: Is exec board:', isExecBoard);
        
        setUserRole(profileData.exec_board_role || profileData.role || 'member');
        setHasAccess(isAdmin || isExecBoard);
      } else {
        console.log('ExecutiveBoardDashboard: No profile data found');
        setHasAccess(false);
      }
    } catch (err) {
      console.error('ExecutiveBoardDashboard: Error checking access:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
      console.log('ExecutiveBoardDashboard: Loading complete');
    }
  };

  const getQuickActionsForRole = (role: string) => {
    const commonActions = [
      { name: 'Calendar', path: '/calendar', icon: Calendar },
      { name: 'Handbook', path: '/handbook', icon: BookOpen }
    ];

    switch (role) {
      case 'president':
        return [
          { name: 'Executive Hub', path: '/dashboard/executive-board', icon: Crown },
          { name: 'Event Planner', path: '/event-planner', icon: Calendar },
          { name: 'Budget Management', path: '/budgets', icon: DollarSign },
          { name: 'Announcements', path: '/admin/announcements/new', icon: MessageSquare }
        ];
      case 'secretary':
        return [
          { name: 'Executive Hub', path: '/dashboard/executive-board', icon: Crown },
          { name: 'Attendance', path: '/attendance', icon: FileText },
          { name: 'Meeting Minutes', path: '/calendar', icon: Calendar },
          { name: 'Communications', path: '/admin/announcements/new', icon: MessageSquare }
        ];
      case 'treasurer':
        return [
          { name: 'Treasurer Dashboard', path: '/treasurer', icon: DollarSign },
          { name: 'Budget Management', path: '/budgets', icon: DollarSign },
          { name: 'Payments', path: '/payments', icon: DollarSign },
          { name: 'Accounting', path: '/accounting', icon: BarChart3 }
        ];
      case 'tour_manager':
        return [
          { name: 'Tour Manager', path: '/tour-manager', icon: MapPin },
          { name: 'Tour Planner', path: '/tour-planner', icon: MapPin },
          { name: 'Contracts', path: '/contracts', icon: FileText },
          { name: 'Budgets', path: '/budgets', icon: DollarSign }
        ];
      case 'librarian':
        return [
          { name: 'Librarian Dashboard', path: '/librarian', icon: BookOpen },
          { name: 'Music Library', path: '/music-library', icon: Music2 },
          ...commonActions
        ];
      case 'historian':
        return [
          { name: 'Historian Dashboard', path: '/historian', icon: Camera },
          { name: 'Archives', path: '/dashboard/executive-board', icon: Camera },
          ...commonActions
        ];
      case 'pr_coordinator':
        return [
          { name: 'PR Hub', path: '/pr-hub', icon: MessageSquare },
          { name: 'Announcements', path: '/admin/announcements/new', icon: MessageSquare },
          { name: 'Press Kit', path: '/press-kit', icon: FileText },
          ...commonActions
        ];
      case 'chaplain':
        return [
          { name: 'Chaplain Hub', path: '/chaplain', icon: Heart },
          { name: 'Wellness', path: '/wellness', icon: Heart },
          { name: 'Spiritual Messages', path: '/admin/announcements/new', icon: MessageSquare },
          ...commonActions
        ];
      case 'student_conductor':
        return [
          { name: 'Conductor Dashboard', path: '/student-conductor', icon: Music2 },
          { name: 'Music Library', path: '/music-library', icon: BookOpen },
          { name: 'Attendance', path: '/attendance', icon: FileText },
          { name: 'Performance Suite', path: '/performance', icon: Music2 }
        ];
      case 'wardrobe_manager':
        return [
          { name: 'Wardrobe Hub', path: '/wardrobe', icon: Shirt },
          { name: 'Inventory', path: '/wardrobe', icon: Shirt },
          ...commonActions
        ];
      default:
        // For admins or other roles
        return [
          { name: 'Executive Hub', path: '/dashboard/executive-board', icon: Crown },
          { name: 'Calendar', path: '/calendar', icon: Calendar },
          { name: 'Budgets', path: '/budgets', icon: DollarSign },
          { name: 'Handbook', path: '/handbook', icon: BookOpen }
        ];
    }
  };

  console.log('ExecutiveBoardDashboard: Rendering with loading:', loading, 'hasAccess:', hasAccess);

  if (loading) {
    console.log('ExecutiveBoardDashboard: Rendering loading state');
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading Executive Board...</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!hasAccess) {
    console.log('ExecutiveBoardDashboard: Rendering no access state');
    return (
      <UniversalLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center py-8">
            <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Executive Board Hub</h1>
            <p className="text-muted-foreground">Access verification required</p>
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">Executive Board access required</p>
                <p>To access the Executive Board Hub, you need one of the following:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Super Admin or Admin privileges</li>
                  <li>Executive Board member status with assigned role</li>
                  <li>Active membership in the Executive Board</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  If you believe you should have access, please contact your administrator.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/profile')}
              variant="default"
              className="flex-1"
            >
              <Settings className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  console.log('ExecutiveBoardDashboard: Rendering main dashboard');
  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">Executive Board Hub</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Your role: {userRole}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-sm text-muted-foreground">Tasks in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-sm text-muted-foreground">Unread messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getQuickActionsForRole(userRole).map((action, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  onClick={() => navigate(action.path)}
                  className="h-auto flex-col gap-2 p-4"
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs">{action.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};