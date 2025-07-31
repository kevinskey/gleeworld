import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, MessageSquare, Users, Calendar, DollarSign, BarChart3, Settings } from "lucide-react";

interface ExecutiveMember {
  id: string;
  user_id: string;
  position: string;
  primary_tab: string;
  gw_profiles: {
    full_name: string;
    email: string;
  } | null;
}

const TAB_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard', icon: Crown },
  { value: 'communications', label: 'Communications', icon: MessageSquare },
  { value: 'members', label: 'Members', icon: Users },
  { value: 'events', label: 'Events', icon: Calendar },
  { value: 'finances', label: 'Finances', icon: DollarSign },
  { value: 'reports', label: 'Reports', icon: BarChart3 },
  { value: 'attendance', label: 'Attendance', icon: Users },
  { value: 'settings', label: 'Settings', icon: Settings },
];

export const ExecutivePrimaryTabManager = () => {
  const [members, setMembers] = useState<ExecutiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExecutiveMembers();
  }, []);

  const fetchExecutiveMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select(`
          id,
          user_id,
          position,
          primary_tab,
          gw_profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;

      setMembers((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching executive members:', error);
      toast({
        title: "Error",
        description: "Failed to load executive board members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrimaryTab = async (memberId: string, newTab: string) => {
    try {
      const { error } = await supabase
        .from('gw_executive_board_members')
        .update({ primary_tab: newTab })
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, primary_tab: newTab }
            : member
        )
      );

      toast({
        title: "Success",
        description: "Primary tab updated successfully"
      });
    } catch (error) {
      console.error('Error updating primary tab:', error);
      toast({
        title: "Error",
        description: "Failed to update primary tab",
        variant: "destructive"
      });
    }
  };

  const getPositionDisplayName = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTabIcon = (tabValue: string) => {
    const tab = TAB_OPTIONS.find(t => t.value === tabValue);
    return tab ? tab.icon : Crown;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Executive Board Primary Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Executive Board Primary Tabs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure which tab each executive board member sees first when they access their dashboard.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active executive board members found
            </div>
          ) : (
            members.map((member) => {
              const IconComponent = getTabIcon(member.primary_tab);
              
              return (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {member.gw_profiles?.full_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getPositionDisplayName(member.position)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.gw_profiles?.email}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <IconComponent className="h-4 w-4" />
                      <span className="capitalize">{member.primary_tab}</span>
                    </div>
                    
                    <Select
                      value={member.primary_tab}
                      onValueChange={(value) => updatePrimaryTab(member.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAB_OPTIONS.map((tab) => {
                          const TabIcon = tab.icon;
                          return (
                            <SelectItem key={tab.value} value={tab.value}>
                              <div className="flex items-center gap-2">
                                <TabIcon className="h-4 w-4" />
                                {tab.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Default Tab Assignments</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• President: Dashboard</div>
            <div>• Secretary: Attendance</div>
            <div>• Treasurer: Finances</div>
            <div>• Tour Manager: Events</div>
            <div>• PR Coordinator: Communications</div>
            <div>• Librarian: Members</div>
            <div>• Historian: Reports</div>
            <div>• Data Analyst: Reports</div>
            <div>• Section Leaders: Members</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};