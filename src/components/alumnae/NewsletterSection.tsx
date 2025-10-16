import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Calendar, ShoppingBag, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Headshot } from "@/components/ui/headshot";
import { Link } from "react-router-dom";
interface Newsletter {
  id: string;
  title: string;
  month: number;
  year: number;
  content: string;
  pdf_url?: string;
  cover_image_url?: string;
  published_at: string;
}
interface HeroSlide {
  id: string;
  image_url: string;
  title: string;
  description?: string;
}
interface Spotlight {
  id: string;
  spotlight_type: 'alumnae' | 'student';
  name: string;
  title?: string;
  description?: string;
  photo_url?: string;
}
interface Announcement {
  id: string;
  title: string;
  content: string;
}
interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location?: string;
}
export const NewsletterSection = () => {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [spotlights, setSpotlights] = useState<{
    alumnae?: Spotlight;
    student?: Spotlight;
  }>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchNewsletterData();
  }, []);
  const fetchNewsletterData = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Try to fetch current month's newsletter first
      let {
        data: newsletterData,
        error: newsletterError
      } = await supabase.from('alumnae_newsletters').select('*').eq('is_published', true).eq('month', currentMonth).eq('year', currentYear).maybeSingle();

      // If no newsletter for current month, get the most recent one
      if (!newsletterData) {
        const {
          data: recentNewsletter
        } = await supabase.from('alumnae_newsletters').select('*').eq('is_published', true).order('year', {
          ascending: false
        }).order('month', {
          ascending: false
        }).limit(1).maybeSingle();
        newsletterData = recentNewsletter;
      }
      if (newsletterError) throw newsletterError;
      setNewsletter(newsletterData);
      if (newsletterData) {
        // Fetch hero slides
        const {
          data: slidesData
        } = await supabase.from('alumnae_newsletter_hero_slides').select('*').eq('newsletter_id', newsletterData.id).order('display_order');
        setHeroSlides(slidesData || []);

        // Fetch spotlights
        const {
          data: spotlightsData
        } = await supabase.from('alumnae_newsletter_spotlights').select('*').eq('newsletter_id', newsletterData.id).order('display_order');
        const alumnaeSpotlight = spotlightsData?.find(s => s.spotlight_type === 'alumnae') as Spotlight | undefined;
        const studentSpotlight = spotlightsData?.find(s => s.spotlight_type === 'student') as Spotlight | undefined;
        setSpotlights({
          alumnae: alumnaeSpotlight,
          student: studentSpotlight
        });

        // Fetch announcements
        const {
          data: announcementsData
        } = await supabase.from('alumnae_newsletter_announcements').select('*').eq('newsletter_id', newsletterData.id).order('display_order');
        setAnnouncements(announcementsData || []);
      }

      // Fetch upcoming events
      const {
        data: eventsData
      } = await supabase.from('gw_events').select('id, title, start_date, location').gte('start_date', new Date().toISOString()).order('start_date').limit(3);
      setUpcomingEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching newsletter data:', error);
      toast.error('Failed to load newsletter');
    } finally {
      setLoading(false);
    }
  };
  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };
  if (loading) {
    return <Card className="animate-fade-in">
        <CardContent className="p-12 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>;
  }
  if (!newsletter) {
    return <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Monthly Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold mb-2">No newsletter available yet</p>
          <p className="text-sm text-muted-foreground">
            Alumnae liaisons and admins can create and publish newsletters using the Management Panel below.
          </p>
        </CardContent>
      </Card>;
  }
  const SpotlightCard = ({
    spotlight,
    type
  }: {
    spotlight?: Spotlight;
    type: string;
  }) => <Card className="animate-fade-in">
      
      
    </Card>;
  return <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      {heroSlides.length > 0 && <Card className="overflow-hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {heroSlides.map(slide => <CarouselItem key={slide.id}>
                  <div className="relative aspect-[21/9] w-full">
                    <img src={slide.image_url} alt={slide.title} className="w-full h-full object-contain" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
                      <h2 className="text-3xl md:text-4xl font-bold mb-2">{slide.title}</h2>
                      {slide.description && <p className="text-lg">{slide.description}</p>}
                    </div>
                  </div>
                </CarouselItem>)}
            </CarouselContent>
            {heroSlides.length > 1 && <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>}
          </Carousel>
        </Card>}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column - 40% */}
        <div className="lg:col-span-4 space-y-6">
          {/* Alumnae Spotlight */}
          <SpotlightCard spotlight={spotlights.alumnae} type="Alumnae" />

        {/* Student Spotlight */}
        <SpotlightCard spotlight={spotlights.student} type="Student" />

        {/* Merch Store Link */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6 text-center space-y-3">
            <ShoppingBag className="h-12 w-12 mx-auto" />
            <h3 className="font-semibold text-lg">Alumnae Merch Store</h3>
            <p className="text-sm opacity-90">Shop exclusive Glee Club merchandise</p>
            <Button variant="secondary" className="w-full" asChild>
              <Link to="/merch">Visit Store</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5" />
              Announcements & Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length > 0 ? announcements.map(announcement => <div key={announcement.id} className="border-l-2 border-primary pl-3 py-1">
                  <h4 className="font-semibold text-sm">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                </div>) : <p className="text-sm text-muted-foreground">No announcements this month</p>}
          </CardContent>
        </Card>
      </div>

        {/* Right Column - 60% */}
        <div className="lg:col-span-6 space-y-6">
          {/* Current Performances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Performances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => <Link key={event.id} to={`/calendar?event=${event.id}`} className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                  <h4 className="font-semibold">{event.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                    {event.location && <span>• {event.location}</span>}
                  </div>
                </Link>) : <p className="text-sm text-muted-foreground">No upcoming performances scheduled</p>}
          </CardContent>
        </Card>

        {/* Newsletter Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {getMonthName(newsletter.month)} {newsletter.year} Newsletter
              </CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Published {new Date(newsletter.published_at).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-3">{newsletter.title}</h3>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                __html: newsletter.content
              }} />
            </div>

            {newsletter.pdf_url && <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // Ensure URL is HTTPS to avoid mixed content warnings
                  const secureUrl = newsletter.pdf_url.startsWith('http://') 
                    ? newsletter.pdf_url.replace('http://', 'https://') 
                    : newsletter.pdf_url;
                  window.open(secureUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Full Newsletter PDF
              </Button>}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>;
};