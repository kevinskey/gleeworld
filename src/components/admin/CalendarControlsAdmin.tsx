import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

interface UserPreference {
  id: string;
  user_id: string;
  calendar_controls_enabled: boolean;
  selected_calendars: string[];
  profiles?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export const CalendarControlsAdmin = () => {
  const [users, setUsers] = useState<UserPreference[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useProfile();

  const isSuperAdmin = profile?.role === 'super-admin';

  useEffect(() => {
    if (isSuperAdmin) {
      loadUserPreferences();
    }
  }, [isSuperAdmin]);

  const loadUserPreferences = async () => {
    try {
      // First get user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('id, user_id, calendar_controls_enabled, selected_calendars')
        .order('created_at', { ascending: true });

      if (preferencesError) throw preferencesError;

      // Then get profile data for each user
      const { data: profilesData, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', (preferencesData || []).map(p => p.user_id));

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = (preferencesData || []).map(pref => ({
        ...pref,
        profiles: profilesData?.find(profile => profile.user_id === pref.user_id) || null
      }));

      setUsers(combinedData);
    } catch (error) {
      console.error('Error loading user preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load user preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendarControls = async (userId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ calendar_controls_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, calendar_controls_enabled: enabled }
          : user
      ));

      toast({
        title: "Success",
        description: `Calendar controls ${enabled ? 'enabled' : 'disabled'} for user`,
      });
    } catch (error) {
      console.error('Error updating calendar controls:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar controls",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const name = user.profiles?.full_name || '';
    const email = user.profiles?.email || '';
    const searchLower = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(searchLower) || 
           email.toLowerCase().includes(searchLower);
  });

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Only super administrators can access calendar controls management.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Controls Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-center py-8">
            Loading user preferences...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Calendar Controls Management
          <Badge variant="secondary" className="text-xs">
            Super Admin Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* User List */}
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {user.profiles?.full_name || 'Unknown User'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.profiles?.email}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {user.selected_calendars.length} calendars selected
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {user.calendar_controls_enabled ? (
                    <UserCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <UserX className="h-4 w-4 text-red-600" />
                  )}
                  <Label htmlFor={`controls-${user.user_id}`} className="text-sm">
                    Calendar Controls
                  </Label>
                </div>
                
                <Switch
                  id={`controls-${user.user_id}`}
                  checked={user.calendar_controls_enabled}
                  onCheckedChange={(checked) => 
                    toggleCalendarControls(user.user_id, checked)
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            No users found matching "{searchTerm}"
          </div>
        )}

        {users.length === 0 && !searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            No user preferences found
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">About Calendar Controls</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• When disabled, users cannot toggle calendar visibility</li>
            <li>• Users will see all available calendars by default</li>
            <li>• This setting only affects the calendar filter interface</li>
            <li>• Super admins can always manage these settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};