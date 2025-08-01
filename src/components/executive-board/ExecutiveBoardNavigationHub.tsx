import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Crown,
  FileText,
  DollarSign,
  MapPin,
  Shirt,
  BookOpen,
  Camera,
  MessageSquare,
  Heart,
  BarChart3,
  Music2,
  UserCheck,
  Shield,
  Settings
} from 'lucide-react';

export type ExecutivePosition = 
  | 'president'
  | 'secretary' 
  | 'treasurer'
  | 'tour_manager'
  | 'wardrobe_manager'
  | 'librarian'
  | 'historian'
  | 'pr_coordinator'
  | 'chaplain'
  | 'data_analyst'
  | 'assistant_chaplain'
  | 'student_conductor'
  | 'section_leader_s1'
  | 'section_leader_s2'
  | 'section_leader_a1'
  | 'section_leader_a2'
  | 'set_up_crew_manager';

interface ExecutivePageMapping {
  position: ExecutivePosition;
  displayName: string;
  icon: any;
  primaryPage: string;
  availablePages: Array<{
    path: string;
    name: string;
    description: string;
  }>;
}

// Complete mapping of executive positions to their pages
const EXECUTIVE_PAGE_MAPPINGS: ExecutivePageMapping[] = [
  {
    position: 'president',
    displayName: 'President',
    icon: Crown,
    primaryPage: '/dashboard/executive-board',
    availablePages: [
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Main executive control center' },
      { path: '/event-planner', name: 'Event Planner', description: 'Create and manage events' },
      { path: '/budgets', name: 'Budget Management', description: 'Oversee all budgets' },
      { path: '/accounting', name: 'Accounting', description: 'Financial oversight' },
      { path: '/activity-logs', name: 'Activity Logs', description: 'System monitoring' },
      { path: '/admin/announcements/new', name: 'Send Announcements', description: 'Club communications' },
      { path: '/handbook', name: 'Handbook', description: 'Club policies and procedures' }
    ]
  },
  {
    position: 'treasurer',
    displayName: 'Treasurer',
    icon: DollarSign,
    primaryPage: '/treasurer',
    availablePages: [
      { path: '/treasurer', name: 'Treasurer Dashboard', description: 'Financial management hub' },
      { path: '/budgets', name: 'Budget Management', description: 'Create and track budgets' },
      { path: '/accounting', name: 'Accounting', description: 'Financial records' },
      { path: '/payments', name: 'Payment Processing', description: 'Handle transactions' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Financial procedures' }
    ]
  },
  {
    position: 'tour_manager',
    displayName: 'Tour Manager',
    icon: MapPin,
    primaryPage: '/tour-manager',
    availablePages: [
      { path: '/tour-manager', name: 'Tour Manager Dashboard', description: 'Tour coordination hub' },
      { path: '/tour-planner', name: 'Tour Planner', description: 'Plan and organize tours' },
      { path: '/contracts', name: 'Contract Management', description: 'Performance contracts' },
      { path: '/budgets', name: 'Tour Budgets', description: 'Tour financial planning' },
      { path: '/wardrobe', name: 'Wardrobe Management', description: 'Performance attire' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Tour procedures' }
    ]
  },
  {
    position: 'student_conductor',
    displayName: 'Student Conductor',
    icon: Music2,
    primaryPage: '/student-conductor',
    availablePages: [
      { path: '/student-conductor', name: 'Conductor Dashboard', description: 'Musical leadership hub' },
      { path: '/music-library', name: 'Music Library', description: 'Manage sheet music' },
      { path: '/performance', name: 'Performance Suite', description: 'Performance tools' },
      { path: '/sectional-management', name: 'Sectional Management', description: 'Voice part coordination' },
      { path: '/srf-management', name: 'SRF Management', description: 'Sight-reading factory' },
      { path: '/attendance', name: 'Attendance', description: 'Track rehearsal attendance' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Musical procedures' }
    ]
  },
  {
    position: 'chaplain',
    displayName: 'Chaplain',
    icon: Heart,
    primaryPage: '/chaplain',
    availablePages: [
      { path: '/chaplain', name: 'Chaplain Dashboard', description: 'Spiritual leadership hub' },
      { path: '/wellness', name: 'Wellness Suite', description: 'Member well-being' },
      { path: '/admin/announcements/new', name: 'Send Spiritual Messages', description: 'Share reflections' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Spiritual guidance procedures' }
    ]
  },
  {
    position: 'assistant_chaplain',
    displayName: 'Assistant Chaplain',
    icon: Heart,
    primaryPage: '/assistant-chaplain',
    availablePages: [
      { path: '/assistant-chaplain', name: 'Assistant Chaplain Dashboard', description: 'Support spiritual leadership' },
      { path: '/wellness', name: 'Wellness Suite', description: 'Member well-being' },
      { path: '/chaplain', name: 'Chaplain Hub', description: 'Collaborate with chaplain' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Spiritual procedures' }
    ]
  },
  {
    position: 'set_up_crew_manager',
    displayName: 'Set-Up Crew Manager',
    icon: Shield,
    primaryPage: '/set-up-crew-manager',
    availablePages: [
      { path: '/set-up-crew-manager', name: 'Set-Up Crew Dashboard', description: 'Equipment and logistics' },
      { path: '/event-planner', name: 'Event Planning', description: 'Setup requirements' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Setup procedures' }
    ]
  },
  {
    position: 'secretary',
    displayName: 'Secretary',
    icon: FileText,
    primaryPage: '/dashboard/executive-board',
    availablePages: [
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Meeting coordination' },
      { path: '/attendance', name: 'Attendance Tracking', description: 'Member attendance' },
      { path: '/contracts', name: 'Document Management', description: 'Club documents' },
      { path: '/admin/announcements/new', name: 'Send Communications', description: 'Club communications' },
      { path: '/handbook', name: 'Handbook', description: 'Documentation procedures' }
    ]
  },
  {
    position: 'pr_coordinator',
    displayName: 'PR Coordinator',
    icon: MessageSquare,
    primaryPage: '/pr-hub',
    availablePages: [
      { path: '/pr-hub', name: 'PR Coordinator Hub', description: 'Marketing and communications' },
      { path: '/admin/announcements/new', name: 'Send Announcements', description: 'Public communications' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'PR procedures' }
    ]
  },
  {
    position: 'librarian',
    displayName: 'Librarian',
    icon: BookOpen,
    primaryPage: '/librarian',
    availablePages: [
      { path: '/librarian', name: 'Librarian Dashboard', description: 'Music library management' },
      { path: '/music-library', name: 'Music Library', description: 'Sheet music catalog' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'Library procedures' }
    ]
  },
  {
    position: 'historian',
    displayName: 'Historian',
    icon: Camera,
    primaryPage: '/historian',
    availablePages: [
      { path: '/historian', name: 'Historian Dashboard', description: 'Club history and archives' },
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Board overview' },
      { path: '/handbook', name: 'Handbook', description: 'History procedures' }
    ]
  },
  {
    position: 'data_analyst',
    displayName: 'Data Analyst',
    icon: BarChart3,
    primaryPage: '/dashboard/executive-board',
    availablePages: [
      { path: '/dashboard/executive-board', name: 'Executive Dashboard', description: 'Data analytics hub' },
      { path: '/activity-logs', name: 'Activity Logs', description: 'System analytics' },
      { path: '/accounting', name: 'Financial Analytics', description: 'Financial data analysis' },
      { path: '/handbook', name: 'Handbook', description: 'Analytics procedures' }
    ]
  }
];

export const ExecutiveBoardNavigationHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPosition, setSelectedPosition] = useState<ExecutivePosition>('president');
  const [currentMapping, setCurrentMapping] = useState<ExecutivePageMapping | null>(null);
  const [userExecutiveRole, setUserExecutiveRole] = useState<ExecutivePosition | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, [user]);

  useEffect(() => {
    const mapping = EXECUTIVE_PAGE_MAPPINGS.find(m => m.position === selectedPosition);
    setCurrentMapping(mapping || null);
  }, [selectedPosition]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      // Check if user is admin
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('is_super_admin, is_admin, is_exec_board, exec_board_role')
        .eq('user_id', user.id)
        .single();

      if (profileData?.is_super_admin || profileData?.is_admin) {
        setIsAdmin(true);
        setSelectedPosition('president');
      } else if (profileData?.is_exec_board && profileData?.exec_board_role) {
        const role = profileData.exec_board_role as ExecutivePosition;
        setUserExecutiveRole(role);
        setSelectedPosition(role);
      } else {
        // Check gw_executive_board_members table
        const { data: execData } = await supabase
          .from('gw_executive_board_members')
          .select('position')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (execData?.position) {
          const role = execData.position as ExecutivePosition;
          setUserExecutiveRole(role);
          setSelectedPosition(role);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePositionChange = (position: ExecutivePosition) => {
    setSelectedPosition(position);
    // Don't auto-navigate when changing positions in the navigation hub
    // Let users explicitly choose which page to visit
  };

  const navigateToPage = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading executive board access...</div>
      </div>
    );
  }

  const PositionIcon = currentMapping?.icon || Crown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex items-center gap-3 mb-3">
          <PositionIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Executive Board Navigation Hub</h1>
        </div>
        <p className="text-muted-foreground">
          Select an executive board position to access their dedicated pages and tools
        </p>
      </div>

      {/* Position Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Executive Position
          </CardTitle>
          {!isAdmin && userExecutiveRole && (
            <Badge variant="outline" className="w-fit">
              Your Role: {EXECUTIVE_PAGE_MAPPINGS.find(m => m.position === userExecutiveRole)?.displayName}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <Select value={selectedPosition} onValueChange={handlePositionChange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <PositionIcon className="h-4 w-4" />
                <span>{currentMapping?.displayName || 'Select Position'}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {EXECUTIVE_PAGE_MAPPINGS.map((mapping) => {
                const Icon = mapping.icon;
                return (
                  <SelectItem key={mapping.position} value={mapping.position}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {mapping.displayName}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          {!isAdmin && userExecutiveRole && selectedPosition !== userExecutiveRole && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> You're viewing another position's pages. 
                Your assigned role is {EXECUTIVE_PAGE_MAPPINGS.find(m => m.position === userExecutiveRole)?.displayName}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position Pages */}
      {currentMapping && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PositionIcon className="h-5 w-5" />
              {currentMapping.displayName} - Available Pages
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on any page to navigate there. The first page is the default for this position.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentMapping.availablePages.map((page, index) => (
                <div 
                  key={page.path}
                  className="relative p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigateToPage(page.path)}
                >
                  {index === 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                      Default
                    </Badge>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-medium">{page.name}</h4>
                    <p className="text-sm text-muted-foreground">{page.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button 
                onClick={() => navigateToPage(currentMapping.primaryPage)}
                className="w-full"
                size="lg"
              >
                <PositionIcon className="h-4 w-4 mr-2" />
                Go to {currentMapping.displayName} Default Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Information */}
      <Card>
        <CardHeader>
          <CardTitle>Access Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Admin Access - You can view all executive positions</span>
            </div>
          ) : userExecutiveRole ? (
            <div className="flex items-center gap-2 text-blue-600">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm">
                Executive Board Member - Your role: {EXECUTIVE_PAGE_MAPPINGS.find(m => m.position === userExecutiveRole)?.displayName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Limited Access - Contact an administrator for executive board access</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};