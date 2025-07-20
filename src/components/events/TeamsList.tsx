
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Crown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface EventTeam {
  id: string;
  title: string;
  event_name: string;
  event_type: string;
  event_date_start: string;
  location?: string;
  user_role: string;
  team_members_count: number;
  team_members: Array<{
    user_id: string;
    role: string;
    full_name?: string;
    email?: string;
  }>;
}

export const TeamsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, get events where user is creator, lead, or team member
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, event_name, event_type, event_date_start, location, 
          created_by, event_lead_id
        `)
        .or(`created_by.eq.${user.id},event_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Get events where user is a team member
      const { data: teamMemberships, error: teamError } = await supabase
        .from('event_team_members')
        .select(`
          event_id,
          role,
          events:event_id (
            id, title, event_name, event_type, event_date_start, location,
            created_by, event_lead_id
          )
        `)
        .eq('user_id', user.id);

      if (teamError) throw teamError;

      // Combine all events
      const allEvents = new Map();
      
      // Add events where user is creator/lead
      userEvents?.forEach(event => {
        let userRole = 'member';
        if (event.created_by === user.id) userRole = 'creator';
        else if (event.event_lead_id === user.id) userRole = 'lead';
        
        allEvents.set(event.id, { ...event, user_role: userRole });
      });

      // Add events where user is team member
      teamMemberships?.forEach(membership => {
        const event = membership.events;
        if (event && !allEvents.has(event.id)) {
          allEvents.set(event.id, { ...event, user_role: membership.role });
        }
      });

      // Get team members for each event
      const eventsWithTeams = await Promise.all(
        Array.from(allEvents.values()).map(async (event) => {
          const { data: teamMembers, error: membersError } = await supabase
            .from('event_team_members')
            .select(`
              user_id,
              role,
              profiles:user_id (
                full_name,
                email
              )
            `)
            .eq('event_id', event.id);

          if (membersError) {
            console.error('Error fetching team members:', membersError);
            return {
              ...event,
              team_members_count: 0,
              team_members: []
            };
          }

          const formattedMembers = teamMembers?.map(member => ({
            user_id: member.user_id,
            role: member.role,
            full_name: member.profiles?.full_name,
            email: member.profiles?.email
          })) || [];

          return {
            ...event,
            team_members_count: formattedMembers.length,
            team_members: formattedMembers
          };
        })
      );

      setEventTeams(eventsWithTeams);
    } catch (err) {
      console.error('Error fetching event teams:', err);
      toast({
        title: "Error",
        description: "Failed to load event teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventTeams();
  }, [user]);

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'creator': 'bg-purple-100 text-purple-800 border-purple-300',
      'lead': 'bg-blue-100 text-blue-800 border-blue-300',
      'member': 'bg-gray-100 text-gray-800 border-gray-300',
      'faculty_advisor': 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[role] || colors.member;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'creator':
      case 'lead':
        return Crown;
      default:
        return User;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (eventTeams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Event Teams</h3>
          <p className="text-muted-foreground mb-4">
            You're not part of any event teams yet. Create events or join existing teams to collaborate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {eventTeams.map((event) => {
        const RoleIcon = getRoleIcon(event.user_role);
        
        return (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {event.event_name || event.title}
                  </CardTitle>
                  <Badge className={getRoleColor(event.user_role)}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {event.user_role === 'creator' ? 'Event Creator' : event.user_role}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(event.event_date_start).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{event.team_members_count} team members</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{event.location}</span>
                </div>
              )}
              
              {/* Team Members Preview */}
              {event.team_members.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium">Team Members:</h4>
                  <div className="space-y-1">
                    {event.team_members.slice(0, 3).map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {member.full_name || member.email || 'Unknown'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                    {event.team_members.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{event.team_members.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
              >
                <Users className="h-4 w-4 mr-1" />
                Manage Team
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
