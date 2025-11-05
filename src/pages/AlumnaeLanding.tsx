import { useEffect, useState } from "react";
import gleeSculptureBg from '@/assets/glee-sculpture-bg.png';
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

  // Check if user is alumnae liaison or admin
  const canAccessAdmin = roleProfile?.exec_board_role === 'alumnae_liaison' || roleProfile?.is_admin || roleProfile?.is_super_admin;
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
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-35 dark:opacity-30 bg-cover bg-no-repeat pointer-events-none" 
        style={{
          backgroundImage: `url(${gleeSculptureBg})`,
          backgroundPosition: 'center 15%'
        }} 
      />

      <div className="relative z-10 py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto space-y-6">
        {/* Metal Plate Header */}
        <div className="bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-lg border-2 border-slate-400 dark:border-slate-500 shadow-lg pt-[15px] px-5 pb-5">
          {/* Corner Rivets */}
          <div className="absolute top-3 left-3 w-3 h-3 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
            <div className="w-1.5 h-1.5 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
          <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
            <div className="w-1.5 h-1.5 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>

          {/* Welcome Section */}
          <div className="text-center space-y-3 animate-fade-in">
            <div className="flex items-center justify-center gap-3">
              <GraduationCap className="h-10 w-10 text-slate-700 dark:text-slate-200" />
              <h1 className="text-4xl md:text-5xl font-serif text-slate-800 dark:text-slate-100">
                Welcome Back, {userProfile?.first_name || 'Alumna'}!
              </h1>
              <Sparkles className="h-10 w-10 text-slate-700 dark:text-slate-200" />
            </div>
            <p className="text-2xl text-slate-700 dark:text-slate-200 font-medium">{getClassYearDisplay()}</p>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Once a Glee Club member, always family. Stay connected with your sisterhood and continue the legacy.
            </p>
            {canAccessAdmin && (
              <div className="pt-2">
                <Button 
                  onClick={() => navigate('/admin/alumnae')}
                  className="gap-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-400 dark:hover:bg-slate-300 text-white dark:text-slate-900"
                  variant="default"
                >
                  <Settings className="h-4 w-4" />
                  Manage Alumnae Content
                </Button>
              </div>
            )}
          </div>
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

        {/* Classmate Updates - Steel Card */}
        <Card className="animate-fade-in bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-lg">
          <CardHeader className="border-b border-slate-300 dark:border-slate-600">
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Users className="h-5 w-5" />
              Classmate Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {classmateUpdates.length > 0 ? <div className="space-y-4">
                {classmateUpdates.map(update => <div key={update.id} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                      {update.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-800 dark:text-slate-100">{update.name}</h4>
                        <Badge variant="outline" className="text-xs bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                          Class of '{update.classYear.toString().slice(-2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{update.update}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
                    <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>)}
                <div className="text-center pt-2">
                  <Button variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">View All Updates</Button>
                </div>
              </div> : <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No recent updates from classmates</p>
              </div>}
          </CardContent>
        </Card>

        {/* Quick Actions - Steel Card */}
        <Card className="animate-fade-in bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-lg">
          <CardHeader className="border-b border-slate-300 dark:border-slate-600">
            <CardTitle className="text-slate-800 dark:text-slate-100">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Alumni Directory</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Camera className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Memory Wall</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Calendar className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Plan Reunion</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Heart className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Give Back</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Network className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Professional Network</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Music className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Share Performance</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <BookOpen className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Update Profile</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105">
                <Star className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">Nominate Alumni</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Section - Steel Gradient */}
        <Card className="animate-fade-in bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-rose-900/30 border-2 border-purple-300 dark:border-purple-700 shadow-lg">
          <CardContent className="p-6 text-center">
            <Award className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-2">Continue the Legacy</h3>
            <p className="text-purple-700 dark:text-purple-300 mb-4">
              Your voice, your experience, and your success inspire the next generation of Glee Club members.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white shadow-md">
                Share Your Story
              </Button>
              <Button variant="outline" className="border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                View Impact Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}