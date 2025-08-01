import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
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
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) {
      setUserRole('guest');
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, error } = await supabase
        .from('gw_profiles')
        .select('exec_board_role, role')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setUserRole(profileData.exec_board_role || profileData.role || 'member');
      } else {
        setUserRole('member');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('member');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading Dashboard...</div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">Glee World Hub</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Your role: {userRole}
          </p>
        </div>

        {/* Community Hub */}
        <CommunityHubWidget />

      </div>
    </UniversalLayout>
  );
};