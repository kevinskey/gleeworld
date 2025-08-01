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
  Settings
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
              <Button 
                variant="outline" 
                onClick={() => navigate('/tour-manager')}
                className="h-auto flex-col gap-2 p-4"
              >
                <Crown className="h-5 w-5" />
                <span className="text-xs">Tour Manager</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/calendar')}
                className="h-auto flex-col gap-2 p-4"
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">Calendar</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/budgets')}
                className="h-auto flex-col gap-2 p-4"
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">Budgets</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/handbook')}
                className="h-auto flex-col gap-2 p-4"
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">Handbook</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};