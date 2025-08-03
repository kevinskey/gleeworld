import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, Music, Star, Gift, Users, Bell, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";

interface FanStats {
  eventsAttended: number;
  fanLevel: string;
  joinDate: string;
  exclusiveContent: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
}

export default function FanDashboard() {
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);
  const [fanStats, setFanStats] = useState<FanStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not authenticated or not a fan
  if (!loading && (!user || userProfile?.role !== 'fan')) {
    return <Navigate to="/auth?role=fan" replace />;
  }

  useEffect(() => {
    if (user && userProfile?.role === 'fan') {
      fetchFanStats();
      fetchUpcomingEvents();
    }
  }, [user, userProfile]);

  const fetchFanStats = async () => {
    try {
      const { data: fanData } = await supabase
        .from('gw_fans')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (fanData) {
        setFanStats({
          eventsAttended: 0, // This would come from event attendance tracking
          fanLevel: fanData.fan_level || 'Bronze',
          joinDate: fanData.created_at,
          exclusiveContent: 5 // This would come from content access tracking
        });
      }
    } catch (error) {
      console.error('Error fetching fan stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const { data: events } = await supabase
        .from('gw_events')
        .select('id, title, start_date, location, event_type')
        .gte('start_date', new Date().toISOString())
        .eq('is_public', true)
        .order('start_date', { ascending: true })
        .limit(5);

      if (events) {
        setUpcomingEvents(events.map(event => ({
          id: event.id,
          title: event.title,
          date: event.start_date,
          location: event.location || 'TBA',
          type: event.event_type || 'Concert'
        })));
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const handleRSVP = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('gw_event_rsvps')
        .insert({
          event_id: eventId,
          user_id: user?.id,
          status: 'yes'
        });

      if (error) throw error;
      
      toast.success("RSVP confirmed! We can't wait to see you there!");
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast.error("There was an issue with your RSVP. Please try again.");
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <UniversalHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <UniversalHeader />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Welcome Back, Fan!</h1>
          <p className="text-muted-foreground">Your exclusive access to the Glee Club community</p>
        </div>

        {/* Fan Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-pink-700">{fanStats?.fanLevel || 'Bronze'}</p>
              <p className="text-sm text-pink-600">Fan Level</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">{fanStats?.eventsAttended || 0}</p>
              <p className="text-sm text-blue-600">Events Attended</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">{fanStats?.exclusiveContent || 0}</p>
              <p className="text-sm text-purple-600">Exclusive Content</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">5</p>
              <p className="text-sm text-green-600">Fan Perks</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()} • {event.location}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {event.type}
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleRSVP(event.id)}
                      className="bg-pink-500 hover:bg-pink-600"
                    >
                      RSVP
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming events at this time</p>
                  <Link to="/public-calendar">
                    <Button variant="outline" className="mt-2">
                      View Full Calendar
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fan Exclusive Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Fan Exclusive Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Music className="h-6 w-6 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Behind the Scenes Videos</h4>
                      <p className="text-sm text-yellow-600">Exclusive rehearsal footage</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">New</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Camera className="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-800">Photo Gallery</h4>
                      <p className="text-sm text-blue-600">High-res concert photos</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Updated</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-purple-800">Fan Community</h4>
                      <p className="text-sm text-purple-600">Connect with other fans</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    Join
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fan Perks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Your Fan Perks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                <Bell className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-medium text-pink-800">Early Access</h4>
                <p className="text-sm text-pink-600">Get notified about events first</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <Star className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium text-blue-800">Exclusive Content</h4>
                <p className="text-sm text-blue-600">Access to member-only videos and photos</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium text-green-800">Community Access</h4>
                <p className="text-sm text-green-600">Join our exclusive fan community</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link to="/public-calendar">
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  View Events
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Shop Merch
                </Button>
              </Link>
              <Button variant="outline" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Share Love Note
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Join Community
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}