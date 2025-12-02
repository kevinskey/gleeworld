import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Heart, Users, MapPin, Briefcase, Camera, Award, MessageCircle, Star, Music, BookOpen, Network, Sparkles, Calendar, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { NewsletterSection } from "@/components/alumnae/NewsletterSection";
import { InterviewSegments } from "@/components/alumnae/InterviewSegments";
import { useUserRole } from "@/hooks/useUserRole";
import { HeroSlideshow } from "@/components/alumnae/HeroSlideshow";
import { SpotlightSection } from "@/components/alumnae/SpotlightSection";
import { AnnouncementSection } from "@/components/alumnae/AnnouncementSection";
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
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    userProfile,
    loading
  } = useUserProfile(user);
  const {
    profile: roleProfile
  } = useUserRole();
  const [alumnaeStats, setAlumnaeStats] = useState<AlumnaeStats | null>(null);
  const [reunionEvents, setReunionEvents] = useState<ReunionEvent[]>([]);
  const [classmateUpdates, setClassmateUpdates] = useState<ClassmateUpdate[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [alumnaeCount, setAlumnaeCount] = useState<number | null>(null);

  // Check if user is alumnae liaison or admin
  const canAccessAdmin = roleProfile?.exec_board_role === 'alumnae_liaison' || roleProfile?.is_admin || roleProfile?.is_super_admin;
  useEffect(() => {
    if (user && userProfile) {
      fetchAlumnaeStats();
      fetchReunionEvents();
      fetchClassmateUpdates();
    }
  }, [user, userProfile]);

  // Fetch global alumnae count for stats
  useEffect(() => {
    const fetchAlumnaeCount = async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'alumna');
      if (!error) setAlumnaeCount(count ?? 0);
    };
    fetchAlumnaeCount();
  }, []);

  const fetchAlumnaeStats = async () => {
    try {
      const classYear = userProfile?.graduation_year || userProfile?.class_year;
      const currentYear = new Date().getFullYear();
      const yearsOut = classYear ? currentYear - classYear : 0;
      setAlumnaeStats({
        classYear,
        yearsOut,
        mentorStatus: userProfile?.mentor_opt_in || false,
        eventsAttended: 0,
        // This would come from event tracking
        memoriesShared: 0 // This would come from memory wall tracking
      });
    } catch (error) {
      console.error('Error setting alumnae stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  const fetchReunionEvents = async () => {
    try {
      const {
        data: events
      } = await supabase.from('gw_events').select('*').or('event_type.eq.reunion,event_type.eq.alumni').gte('start_date', new Date().toISOString()).order('start_date', {
        ascending: true
      }).limit(3);
      if (events) {
        setReunionEvents(events.map(event => ({
          id: event.id,
          title: event.title,
          date: event.start_date,
          location: event.location || 'TBA',
          targetClassYear: null,
          // This would be extracted from event details
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
      setClassmateUpdates([{
        id: '1',
        name: 'Sarah Williams',
        classYear: 2018,
        update: 'Just got promoted to Senior Marketing Director at Warner Music!',
        location: 'Nashville, TN',
        profession: 'Music Industry Executive'
      }, {
        id: '2',
        name: 'Maya Chen',
        classYear: 2020,
        update: 'Excited to announce my debut album is dropping next month!',
        location: 'Los Angeles, CA',
        profession: 'Recording Artist'
      }]);
    } catch (error) {
      console.error('Error fetching classmate updates:', error);
    }
  };
  const handleMentorToggle = async () => {
    try {
      const newMentorStatus = !alumnaeStats?.mentorStatus;
      const {
        error
      } = await supabase.from('gw_profiles').update({
        mentor_opt_in: newMentorStatus
      }).eq('user_id', user?.id);
      if (error) throw error;
      setAlumnaeStats(prev => prev ? {
        ...prev,
        mentorStatus: newMentorStatus
      } : null);
      toast.success(newMentorStatus ? "Thank you for becoming a mentor! Students will love your guidance." : "You've opted out of mentoring. You can always opt back in.");
    } catch (error) {
      console.error('Error updating mentor status:', error);
      toast.error("There was an issue updating your mentor status. Please try again.");
    }
  };
  const handleReunionRSVP = async (eventId: string) => {
    try {
      const {
        error
      } = await supabase.from('gw_event_rsvps').insert({
        event_id: eventId,
        user_id: user?.id,
        status: 'yes'
      });
      if (error) throw error;
      toast.success("RSVP confirmed! We can't wait to see you at the reunion!");

      // Update local state
      setReunionEvents(prev => prev.map(event => event.id === eventId ? {
        ...event,
        isRegistered: true
      } : event));
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast.error("There was an issue with your RSVP. Please try again.");
    }
  };
  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading alumnae portal..." />
      </div>
    );
  }
  const getClassYearDisplay = () => {
    if (!alumnaeStats?.classYear) return "Class of ----";
    return `Class of '${alumnaeStats.classYear.toString().slice(-2)}`;
  };
  return (
    <div className="min-h-screen bg-background">

      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/95 to-muted/40 border-2 border-border shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-12 w-12 text-primary" />
                <h1 className="text-4xl md:text-6xl font-display text-foreground tracking-tight">
                  Welcome Back, {userProfile?.first_name || 'Alumna'}
                </h1>
                <Sparkles className="h-12 w-12 text-accent" />
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {getClassYearDisplay()}
                </Badge>
                {alumnaeStats?.mentorStatus && (
                  <Badge className="text-lg px-4 py-1 bg-gradient-to-r from-primary to-accent">
                    <Heart className="h-4 w-4 mr-1" />
                    Mentor
                  </Badge>
                )}
              </div>

              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Once a Glee Club member, always family. Stay connected with your sisterhood and continue the legacy.
              </p>

              {canAccessAdmin && (
                <Button 
                  onClick={() => navigate('/admin/alumnae')}
                  className="gap-2 mt-4"
                  size="lg"
                >
                  <Settings className="h-5 w-5" />
                  Manage Alumnae Content
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Alumnae Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alumnae</p>
                  <p className="text-2xl font-bold">{alumnaeCount ?? '—'}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hero Slideshow */}
        <div className="animate-fade-in">
          <HeroSlideshow />
        </div>

        {/* Announcements */}
        <div className="animate-fade-in">
          <AnnouncementSection />
        </div>

        {/* Spotlights */}
        <div className="animate-fade-in">
          <SpotlightSection />
        </div>

        {/* Newsletter Section */}
        <div className="animate-fade-in">
          <NewsletterSection />
        </div>

        {/* Interview Segments */}
        <div className="animate-fade-in">
          <InterviewSegments />
        </div>

        {/* Classmate Updates */}
        <Card className="animate-fade-in border-2 shadow-xl">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Classmate Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {classmateUpdates.length > 0 ? (
              <div className="space-y-4">
                {classmateUpdates.map(update => (
                  <div 
                    key={update.id} 
                    className="group flex items-start gap-4 p-5 bg-muted/30 rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-primary via-accent to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                      {update.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-lg text-foreground">{update.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          Class of '{update.classYear.toString().slice(-2)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{update.update}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {update.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" />
                          {update.profession}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Button variant="outline" size="lg">
                    View All Updates
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No recent updates from classmates</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in border-2 shadow-xl">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'Alumni Directory' },
                { icon: Camera, label: 'Memory Wall' },
                { icon: Calendar, label: 'Plan Reunion' },
                { icon: Heart, label: 'Give Back' },
                { icon: Network, label: 'Professional Network' },
                { icon: Music, label: 'Share Performance' },
                { icon: BookOpen, label: 'Update Profile' },
                { icon: Star, label: 'Nominate Alumni' }
              ].map(({ icon: Icon, label }) => (
                <Button 
                  key={label}
                  variant="outline" 
                  className="flex flex-col items-center gap-3 h-auto py-6 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group"
                >
                  <Icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legacy Section */}
        <Card className="animate-fade-in border-2 shadow-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
          <CardContent className="p-8 md:p-12 text-center space-y-4">
            <Award className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-2xl md:text-3xl font-display text-foreground">Continue the Legacy</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Your voice, your experience, and your success inspire the next generation of Glee Club members.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="gap-2">
                <Heart className="h-5 w-5" />
                Share Your Story
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={handleMentorToggle}>
                {alumnaeStats?.mentorStatus ? (
                  <>
                    <Award className="h-5 w-5" />
                    Mentoring Active
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    Become a Mentor
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}