import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Calendar, Eye, Store, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
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
  display_order: number;
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

export const NewsletterSection = () => {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [alumnaeSpotlight, setAlumnaeSpotlight] = useState<Spotlight | null>(null);
  const [studentSpotlight, setStudentSpotlight] = useState<Spotlight | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsletterContent();
  }, []);

  const fetchNewsletterContent = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Fetch newsletter
      const { data: newsletterData, error: newsletterError } = await supabase
        .from('alumnae_newsletters')
        .select('*')
        .eq('is_published', true)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (newsletterError) throw newsletterError;
      setNewsletter(newsletterData);

      if (newsletterData) {
        // Fetch hero slides
        const { data: slidesData } = await supabase
          .from('alumnae_newsletter_hero_slides')
          .select('*')
          .eq('newsletter_id', newsletterData.id)
          .order('display_order');
        setHeroSlides(slidesData || []);

        // Fetch spotlights
        const { data: spotlightsData } = await supabase
          .from('alumnae_newsletter_spotlights')
          .select('*')
          .eq('newsletter_id', newsletterData.id)
          .order('display_order');
        
        setAlumnaeSpotlight((spotlightsData?.find(s => s.spotlight_type === 'alumnae') as Spotlight) || null);
        setStudentSpotlight((spotlightsData?.find(s => s.spotlight_type === 'student') as Spotlight) || null);

        // Fetch announcements
        const { data: announcementsData } = await supabase
          .from('alumnae_newsletter_announcements')
          .select('*')
          .eq('newsletter_id', newsletterData.id)
          .order('display_order');
        setAnnouncements(announcementsData || []);
      }

      // Fetch upcoming events from calendar
      const { data: eventsData } = await supabase
        .from('gw_events')
        .select('*')
        .gte('start_date', currentDate.toISOString())
        .eq('is_public', true)
        .order('start_date')
        .limit(3);
      setUpcomingEvents(eventsData || []);

    } catch (error) {
      console.error('Error fetching newsletter content:', error);
      toast.error('Failed to load newsletter');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-12 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!newsletter) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Monthly Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No newsletter available for this month</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon for the latest updates!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Monthly Newsletter
          </h2>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {getMonthName(newsletter.month)} {newsletter.year}
          </Badge>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* LEFT COLUMN - 40% */}
        <div className="lg:col-span-4 space-y-6">
          {/* Alumnae Spotlight */}
          {alumnaeSpotlight && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alumnae Spotlight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alumnaeSpotlight.photo_url && (
                  <div className="flex justify-center">
                    <Headshot 
                      src={alumnaeSpotlight.photo_url}
                      alt={alumnaeSpotlight.name}
                      size="xl"
                    />
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{alumnaeSpotlight.name}</h3>
                  {alumnaeSpotlight.title && (
                    <p className="text-sm text-muted-foreground">{alumnaeSpotlight.title}</p>
                  )}
                </div>
                {alumnaeSpotlight.description && (
                  <p className="text-sm">{alumnaeSpotlight.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Student Spotlight */}
          {studentSpotlight && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Spotlight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentSpotlight.photo_url && (
                  <div className="flex justify-center">
                    <Headshot 
                      src={studentSpotlight.photo_url}
                      alt={studentSpotlight.name}
                      size="xl"
                    />
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{studentSpotlight.name}</h3>
                  {studentSpotlight.title && (
                    <p className="text-sm text-muted-foreground">{studentSpotlight.title}</p>
                  )}
                </div>
                {studentSpotlight.description && (
                  <p className="text-sm">{studentSpotlight.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Merch Store Link */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="p-6 text-center space-y-3">
              <Store className="h-12 w-12 mx-auto text-purple-600" />
              <h3 className="font-semibold text-lg">Alumnae Merch Store</h3>
              <p className="text-sm text-muted-foreground">
                Show your Glee Club pride with exclusive merchandise
              </p>
              <Button asChild className="w-full">
                <Link to="/shop">Visit Store</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          {announcements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5" />
                  Announcements & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="pb-4 border-b last:border-0 last:pb-0">
                    <h4 className="font-semibold mb-2">{announcement.title}</h4>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN - 60% */}
        <div className="lg:col-span-6 space-y-6">
          {/* Hero Slider */}
          {heroSlides.length > 0 && (
            <Card className="overflow-hidden">
              <Carousel className="w-full">
                <CarouselContent>
                  {heroSlides.map((slide) => (
                    <CarouselItem key={slide.id}>
                      <div className="relative h-96">
                        <img
                          src={slide.image_url}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                          <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
                          {slide.description && (
                            <p className="text-sm opacity-90">{slide.description}</p>
                          )}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {heroSlides.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
            </Card>
          )}

          {/* Current Performances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Performances
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex-shrink-0 text-center">
                        <div className="bg-primary text-primary-foreground rounded-lg p-3">
                          <div className="text-2xl font-bold">
                            {new Date(event.start_date).getDate()}
                          </div>
                          <div className="text-xs uppercase">
                            {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.location && (
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                        )}
                        {event.start_time && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming performances scheduled
                </p>
              )}
            </CardContent>
          </Card>

          {/* Newsletter Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>{newsletter.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Published {new Date(newsletter.published_at).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: newsletter.content.substring(0, 500) + '...' }}
              />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-purple-500 hover:bg-purple-600">
                  <Eye className="h-4 w-4 mr-2" />
                  Read Full Newsletter
                </Button>
                {newsletter.pdf_url && (
                  <Button variant="outline" asChild>
                    <a href={newsletter.pdf_url} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
