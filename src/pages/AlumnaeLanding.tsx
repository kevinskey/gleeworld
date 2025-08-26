import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  Calendar, 
  Heart, 
  Users, 
  MapPin, 
  Briefcase,
  Camera,
  Award,
  MessageCircle,
  ExternalLink,
  Star,
  Music,
  BookOpen,
  Network,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { IncompleteProfileBanner } from "@/components/shared/IncompleteProfileBanner";

interface AlumnaeStats {
  classYear: number | null;
  yearsOut: number;
  mentorStatus: boolean;
  eventsAttended: number;
  memoriesShared: number;
}

interface ReunionEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  targetClassYear: number | null;
  isRegistered: boolean;
}

interface ClassmateUpdate {
  id: string;
  name: string;
  classYear: number;
  update: string;
  location: string;
  profession: string;
  profilePhoto?: string;
}

export default function AlumnaeLanding() {
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);
  const [alumnaeStats, setAlumnaeStats] = useState<AlumnaeStats | null>(null);
  const [reunionEvents, setReunionEvents] = useState<ReunionEvent[]>([]);
  const [classmateUpdates, setClassmateUpdates] = useState<ClassmateUpdate[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (user && userProfile) {
      fetchAlumnaeStats();
      fetchReunionEvents();
      fetchClassmateUpdates();
    }
  }, [user, userProfile]);

  const fetchAlumnaeStats = async () => {
    try {
      const classYear = userProfile?.graduation_year || userProfile?.class_year;
      const currentYear = new Date().getFullYear();
      const yearsOut = classYear ? currentYear - classYear : 0;

      setAlumnaeStats({
        classYear,
        yearsOut,
        mentorStatus: userProfile?.mentor_opt_in || false,
        eventsAttended: 0, // This would come from event tracking
        memoriesShared: 0  // This would come from memory wall tracking
      });
    } catch (error) {
      console.error('Error setting alumnae stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchReunionEvents = async () => {
    try {
      const { data: events } = await supabase
        .from('gw_events')
        .select('*')
        .or('event_type.eq.reunion,event_type.eq.alumni')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3);

      if (events) {
        setReunionEvents(events.map(event => ({
          id: event.id,
          title: event.title,
          date: event.start_date,
          location: event.location || 'TBA',
          targetClassYear: null, // This would be extracted from event details
          isRegistered: false // This would come from RSVP tracking
        })));
      }
    } catch (error) {
      console.error('Error fetching reunion events:', error);
    }
  };

  const fetchClassmateUpdates = async () => {
    try {
      // This would fetch recent updates from classmates
      // For now, we'll use sample data
      setClassmateUpdates([
        {
          id: '1',
          name: 'Sarah Williams',
          classYear: 2018,
          update: 'Just got promoted to Senior Marketing Director at Warner Music!',
          location: 'Nashville, TN',
          profession: 'Music Industry Executive'
        },
        {
          id: '2', 
          name: 'Maya Chen',
          classYear: 2020,
          update: 'Excited to announce my debut album is dropping next month!',
          location: 'Los Angeles, CA',
          profession: 'Recording Artist'
        }
      ]);
    } catch (error) {
      console.error('Error fetching classmate updates:', error);
    }
  };

  const handleMentorToggle = async () => {
    try {
      const newMentorStatus = !alumnaeStats?.mentorStatus;
      
      const { error } = await supabase
        .from('gw_profiles')
        .update({ mentor_opt_in: newMentorStatus })
        .eq('user_id', user?.id);

      if (error) throw error;

      setAlumnaeStats(prev => prev ? { ...prev, mentorStatus: newMentorStatus } : null);
      
      toast.success(
        newMentorStatus 
          ? "Thank you for becoming a mentor! Students will love your guidance." 
          : "You've opted out of mentoring. You can always opt back in."
      );
    } catch (error) {
      console.error('Error updating mentor status:', error);
      toast.error("There was an issue updating your mentor status. Please try again.");
    }
  };

  const handleReunionRSVP = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('gw_event_rsvps')
        .insert({
          event_id: eventId,
          user_id: user?.id,
          status: 'yes'
        });

      if (error) throw error;
      
      toast.success("RSVP confirmed! We can't wait to see you at the reunion!");
      
      // Update local state
      setReunionEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { ...event, isRegistered: true } : event
        )
      );
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

  const getClassYearDisplay = () => {
    if (!alumnaeStats?.classYear) return "Class of ----";
    return `Class of '${alumnaeStats.classYear.toString().slice(-2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <UniversalHeader />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Incomplete Profile Banner */}
        <IncompleteProfileBanner userProfile={userProfile} />
        
        {/* Welcome Hero Section */}
        <div className="text-center space-y-4 py-8 relative animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 via-pink-50/50 to-rose-100/50 rounded-3xl -z-10"></div>
          <GraduationCap className="h-16 w-16 text-primary mx-auto animate-pulse" />
          <h1 className="text-4xl font-bold text-primary">Welcome Back, {userProfile?.first_name || 'Alumna'}!</h1>
          <p className="text-xl text-muted-foreground">{getClassYearDisplay()}</p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Once a Glee Club member, always family. Stay connected with your sisterhood and continue the legacy.
          </p>
        </div>

        {/* Alumnae Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 hover-scale animate-fade-in">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">{alumnaeStats?.yearsOut || 0}</p>
              <p className="text-sm text-purple-600">Years Out</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 hover-scale animate-fade-in">
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-rose-700">
                {alumnaeStats?.mentorStatus ? 'Active' : 'Available'}
              </p>
              <p className="text-sm text-rose-600">Mentor Status</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 hover-scale animate-fade-in">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-700">{alumnaeStats?.eventsAttended || 0}</p>
              <p className="text-sm text-amber-600">Events Attended</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 hover-scale animate-fade-in">
            <CardContent className="p-4 text-center">
              <Camera className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">{alumnaeStats?.memoriesShared || 0}</p>
              <p className="text-sm text-emerald-600">Memories Shared</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reunion Events */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Reunions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reunionEvents.length > 0 ? (
                reunionEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover-scale">
                    <div>
                      <h4 className="font-medium text-purple-800">{event.title}</h4>
                      <p className="text-sm text-purple-600">
                        {new Date(event.date).toLocaleDateString()} • {event.location}
                      </p>
                      {event.targetClassYear && (
                        <Badge variant="secondary" className="text-xs mt-1 bg-purple-100 text-purple-700">
                          Class of '{event.targetClassYear.toString().slice(-2)} Focus
                        </Badge>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleReunionRSVP(event.id)}
                      disabled={event.isRegistered}
                      className={event.isRegistered ? "bg-green-500" : "bg-purple-500 hover:bg-purple-600"}
                    >
                      {event.isRegistered ? "Registered" : "RSVP"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming reunions at this time</p>
                  <Button variant="outline" className="mt-2">
                    Plan a Reunion
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mentorship Program */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Mentorship Program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-200">
                <Heart className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                <h4 className="font-medium text-rose-800 mb-2">
                  {alumnaeStats?.mentorStatus ? "You're a Mentor!" : "Become a Mentor"}
                </h4>
                <p className="text-sm text-rose-600 mb-4">
                  {alumnaeStats?.mentorStatus 
                    ? "Thank you for giving back to current students. Your guidance makes a difference!"
                    : "Share your experience and help current students navigate their journey."
                  }
                </p>
                <Button 
                  onClick={handleMentorToggle}
                  variant={alumnaeStats?.mentorStatus ? "outline" : "default"}
                  className={alumnaeStats?.mentorStatus ? "border-rose-300 text-rose-700 hover:bg-rose-50" : "bg-rose-500 hover:bg-rose-600"}
                >
                  {alumnaeStats?.mentorStatus ? "Update Mentor Profile" : "Join as Mentor"}
                </Button>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Mentorship Areas:</h5>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Career Guidance</Badge>
                  <Badge variant="outline" className="text-xs">Performance Tips</Badge>
                  <Badge variant="outline" className="text-xs">Industry Connections</Badge>
                  <Badge variant="outline" className="text-xs">Life Advice</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classmate Updates */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Classmate Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classmateUpdates.length > 0 ? (
              <div className="space-y-4">
                {classmateUpdates.map((update) => (
                  <div key={update.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover-scale">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {update.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{update.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Class of '{update.classYear.toString().slice(-2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{update.update}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {update.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {update.profession}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-center">
                  <Button variant="outline">View All Updates</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent updates from classmates</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Users className="h-6 w-6" />
                <span className="text-sm">Alumni Directory</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Camera className="h-6 w-6" />
                <span className="text-sm">Memory Wall</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Plan Reunion</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Heart className="h-6 w-6" />
                <span className="text-sm">Give Back</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Network className="h-6 w-6" />
                <span className="text-sm">Professional Network</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Music className="h-6 w-6" />
                <span className="text-sm">Share Performance</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <BookOpen className="h-6 w-6" />
                <span className="text-sm">Update Profile</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 hover-scale">
                <Star className="h-6 w-6" />
                <span className="text-sm">Nominate Alumni</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Section */}
        <Card className="animate-fade-in bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <Award className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-purple-800 mb-2">Continue the Legacy</h3>
            <p className="text-purple-600 mb-4">
              Your voice, your experience, and your success inspire the next generation of Glee Club members.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-purple-500 hover:bg-purple-600">
                Share Your Story
              </Button>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                View Impact Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}