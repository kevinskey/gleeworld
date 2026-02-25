import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDefaultEventImage } from "@/constants/images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useMusic, Album } from "@/hooks/useMusic";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { useNavigate, Link } from "react-router-dom";
import { AlbumModal } from "@/components/music/AlbumModal";
import { FanOnlyMusicSection } from "@/components/music/FanOnlyMusicSection";
import { YoutubeVideoSection } from "@/components/youtube/YoutubeVideoSection";
import { useUserRole } from "@/hooks/useUserRole";
import { CountdownTimer } from "@/components/landing/CountdownTimer";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { AuditionHoverCard } from "@/components/audition/AuditionHoverCard";
import { MusicStaffIcon } from "@/components/icons/MusicStaffIcon";
import { FAQNavigationCards } from "@/components/landing/FAQNavigationCards";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Sparkles, X, Music, Album as AlbumIcon, Youtube, Play, AlertCircle, MessageCircleQuestion, Clock } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

import { SmartCoverImage } from "@/components/ui/SmartCoverImage";
import { FeaturedVideoCarousel } from "@/components/public/FeaturedVideoCarousel";
import { AllVideosGrid } from "@/components/youtube/AllVideosGrid";
import { YouTubeCarousel } from "@/components/youtube/YouTubeCarousel";
import { PollReminderPopup } from "@/components/polls/PollReminderPopup";
import { HeroSlider, adaptDatabaseSlide, type HeroSlide as HeroSliderSlide } from "@/components/hero/HeroSlider";
interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  description: string | null;
  event_type: string;
  image_url: string | null;
}
interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  button_text: string | null;
  link_url: string | null;
  display_order: number | null;
  slide_duration_seconds: number | null;
  title_position_horizontal: string | null;
  title_position_vertical: string | null;
  description_position_horizontal: string | null;
  description_position_vertical: string | null;
  title_size: string | null;
  description_size: string | null;
  action_button_text: string | null;
  action_button_url: string | null;
  action_button_enabled: boolean | null;
  is_active: boolean | null;
}
export const GleeWorldLanding = () => {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const {
    albums
  } = useMusic();
  const {
    videos,
    getVideoEmbedUrl
  } = useYouTubeVideos();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [showFallbackImage, setShowFallbackImage] = useState(false);

  // Get the featured video or fallback to the hardcoded video ID
  const backgroundVideo = videos.find(video => video.is_featured) || videos.find(video => video.video_id === 'fDvKSh6jGKA') || videos[0];

  // Use React Query for hero slides - caches data to prevent re-fetching on navigation
  const { data: heroSlides = [], isLoading: heroLoading } = useQuery({
    queryKey: ['homepage-hero-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_hero_slides')
        .select('*')
        .eq('usage_context', 'homepage')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as HeroSlide[];
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Use React Query for events - caches data to prevent re-fetching on navigation
  // Exclude Spelman calendar events (calendar_id: 931a4ae9-2a06-4111-a217-59083632b1a3)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['homepage-events'],
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('gw_events')
        .select('*')
        .gte('start_date', startOfToday.toISOString())
        .eq('is_public', true)
        .neq('calendar_id', '931a4ae9-2a06-4111-a217-59083632b1a3')
        .order('start_date', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return data as Event[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Check if there are any YouTube videos to display
  const { data: hasVideos = false } = useQuery({
    queryKey: ['homepage-has-videos'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('youtube_videos')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const loading = heroLoading || eventsLoading;
  // Convert DB slides to HeroSlider format
  const adaptedSlides = useMemo(() => 
    heroSlides.map(adaptDatabaseSlide), 
    [heroSlides]
  );

  const goToAuditions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎵 Audition button clicked - navigating to /auditioner');
    navigate('/auditioner');
  };
  const formatDate = (dateString: string) => {
    // Parse date parts to avoid timezone shifting issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper functions for positioning and sizing
  const getHorizontalAlignment = (position: string | null) => {
    switch (position) {
      case 'left':
        return 'text-left items-start';
      case 'right':
        return 'text-right items-end';
      case 'center':
      default:
        return 'text-center items-center';
    }
  };
  const getVerticalAlignment = (position: string | null) => {
    switch (position) {
      case 'top':
        return 'justify-start pt-16';
      case 'bottom':
        return 'justify-end pb-16';
      case 'middle':
      default:
        return 'justify-center';
    }
  };
  const getTitleSize = (size: string | null) => {
    switch (size) {
      case 'small':
        return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
      case 'medium':
        return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
      case 'large':
        return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
      case 'xl':
        return 'text-3xl sm:text-4xl md:text-5xl lg:text-7xl';
      default:
        return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
    }
  };
  const getDescriptionSize = (size: string | null) => {
    switch (size) {
      case 'small':
        return 'text-sm sm:text-base md:text-lg';
      case 'medium':
        return 'text-base sm:text-lg md:text-xl';
      case 'large':
        return 'text-lg sm:text-xl md:text-2xl';
      case 'xl':
        return 'text-xl sm:text-2xl md:text-3xl';
      default:
        return 'text-base sm:text-lg md:text-xl lg:text-2xl';
    }
  };
  const getTitleFont = (font: string | null) => {
    switch (font) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'sans':
      default:
        return 'font-sans';
    }
  };
  const getDescriptionFont = (font: string | null) => {
    switch (font) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'sans':
      default:
        return 'font-sans';
    }
  };
  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
    setIsAlbumModalOpen(true);
  };
  const handleCloseAlbumModal = () => {
    setIsAlbumModalOpen(false);
    setSelectedAlbum(null);
  };

  // Show auth state indicator for logged-in users - DISABLED
  // const renderAuthStateIndicator = () => {
  //   if (!user) return null;
  //   return null; // Disabled to remove badge from public landing page
  // };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center spelman-blue-theme" style={{
      background: 'linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)'
    }}>
        <LoadingSpinner size="lg" text="Loading GleeWorld..." className="text-white" />
      </div>;
  }
  return <div className="min-h-screen w-full relative spelman-blue-theme" style={{
    background: 'linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)'
  }}>
      <div className="absolute inset-0 -z-10 opacity-20 mix-blend-overlay" style={{
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0.08'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"
    }} aria-hidden="true" />
      
      <PublicLayout>

      {/* Concert Ticket Request Hero Banner - REMOVED: Concerts are over */}

      {/* Hero Section */}
      <section className="relative z-30 py-2 sm:py-3 md:py-4 w-full bg-white">
        <div className="w-full">
          <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl rounded-lg sm:rounded-xl md:rounded-2xl">
            {adaptedSlides.length > 0 ? (
              <div className="aspect-[16/9] sm:aspect-[16/9] md:aspect-[16/8] lg:aspect-[16/7] flex items-center justify-center">
                <HeroSlider 
                  slides={adaptedSlides}
                  defaultDurationMs={6000}
                  autoplay={true}
                  showControls={false}
                  showProgress={false}
                  showPausePlay={false}
                />
              </div>
            ) : (
              <div className="aspect-[16/9] sm:aspect-[16/9] md:aspect-[16/8] lg:aspect-[16/7] w-full bg-muted flex items-center justify-center">
                <div className="text-center p-4">
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm sm:text-base">No hero slides configured</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>



      {/* Upcoming Events Section */}
      <section id="events" className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full bg-primary-foreground">
        <div className="w-full">
          <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
            <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-secondary animate-pulse" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
                  Upcoming Events
                </h2>
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary animate-pulse" />
              </div>
            </div>
              
              
              {loading ? <div className="flex space-x-4 overflow-hidden">
                  {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse flex-shrink-0 w-80 bg-card border-2 border-border">
                      <div className="h-64 bg-muted/50 rounded-t-lg"></div>
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted/50 rounded mb-4"></div>
                        <div className="h-3 bg-muted/50 rounded mb-2"></div>
                        <div className="h-3 bg-muted/50 rounded w-3/4"></div>
                      </CardContent>
                    </Card>)}
                </div> : events.length > 0 ? <>
                  {/* Desktop view - Single horizontal scrolling row */}
                  <div className="hidden md:block">
                    <div className="flex gap-4 lg:gap-6 overflow-x-scroll pb-4 scrollbar-hide" style={{
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}>
                      {events.map(event => <Card key={event.id} className="hover:shadow-2xl transition-all duration-300 relative group bg-card border-2 border-border hover:border-accent flex-shrink-0 w-64 lg:w-72 flex flex-col h-[320px]">
                          {/* Hover overlay button */}
                          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-semibold border border-white/30" asChild>
                              <Link to="/public-calendar">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="h-32 lg:h-36 bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                            <img src={event.image_url || getDefaultEventImage(event.id)} alt={event.title} className="w-full h-full object-cover rounded-t-lg brightness-95 contrast-100" onError={e => {
                        console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                        e.currentTarget.src = getDefaultEventImage(event.id);
                      }} />
                          </div>
                          <CardContent className="p-3 lg:p-4 flex flex-col flex-grow">
                            <h3 className="text-sm lg:text-base font-semibold text-card-foreground line-clamp-2 text-center mb-2">{event.title}</h3>
                            <div className="space-y-1 text-xs text-muted-foreground mt-auto">
                              <div className="flex items-center justify-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>{new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              {event.start_date && (
                                <div className="flex items-center justify-center gap-1">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span>{new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center justify-center gap-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="line-clamp-1">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>)}
                    </div>
                  </div>
                  
                  {/* Mobile/Tablet view - Carousel */}
                  <div className="md:hidden">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {events.map(event => <CarouselItem key={event.id} className="pl-2 sm:pl-4 basis-[85%] sm:basis-[70%]">
                            <Card className="hover:shadow-2xl transition-all duration-300 relative group bg-card/20 backdrop-blur-md border border-border/30 hover:bg-card/30 flex flex-col h-[320px]">
                              {/* Hover overlay button */}
                              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-border/30" asChild>
                                  <Link to="/public-calendar">
                                    View All <ArrowRight className="ml-1 h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                              
                              <div className="h-36 sm:h-40 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden flex-shrink-0">
                                <img src={event.image_url || getDefaultEventImage(event.id)} alt={event.title} className="w-full h-full object-cover rounded-t-lg brightness-95 contrast-100" onError={e => {
                            console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                            e.currentTarget.src = getDefaultEventImage(event.id);
                          }} />
                              </div>
                              <CardContent className="p-3 flex flex-col flex-grow">
                                <h3 className="text-base font-semibold text-foreground line-clamp-2 text-center mb-2">{event.title}</h3>
                                <div className="space-y-1 text-xs text-muted-foreground mt-auto">
                                  <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                    <span>{new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                  {event.start_date && (
                                    <div className="flex items-center justify-center gap-1">
                                      <Clock className="h-3 w-3 flex-shrink-0" />
                                      <span>{new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                  )}
                                  {event.location && (
                                    <div className="flex items-center justify-center gap-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      <span className="line-clamp-1">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </CarouselItem>)}
                      </CarouselContent>
                    </Carousel>
                  </div>
                </> : <Carousel className="w-full">
                  <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
                    {[...Array(6)].map((_, i) => <CarouselItem key={i} className="pl-1 sm:pl-2 md:pl-4 basis-full">
                        <Card className="hover:shadow-2xl transition-all duration-300 h-full w-full relative group bg-card/20 backdrop-blur-md border border-border/30 hover:bg-card/30">
                          {/* Hover overlay button */}
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-border/30" asChild>
                              <Link to="/public-calendar">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="h-64 sm:h-80 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-t-lg flex items-center justify-center backdrop-blur-sm">
                            <Calendar className="h-12 w-12 text-primary" />
                          </div>
                          <CardContent className="p-6 sm:p-8">
                            <h3 className="text-2xl sm:text-2xl font-semibold text-foreground mb-4">Glee Club Rehearsal</h3>
                            <div className="space-y-2 text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-5 w-5 mr-3 flex-shrink-0" />
                                <span className="text-base sm:text-lg">Aug {19 + i * 2}, 2025</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
                                <span className="text-base sm:text-lg line-clamp-1">350 Spelman Lane SW Atlanta GA 30314</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>)}
                  </CarouselContent>
                </Carousel>}
          </Card>
        </div>
      </section>


      {/* YouTube Channel Section with Horizontal Carousel */}
      {hasVideos && (
        <section className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full">
          <div className="w-full">
            <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
              <YouTubeCarousel limit={12} showTitle={true} />
            </Card>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full">
        <div className="w-full">
          <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
            {/* The Glee Store Title */}
            <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-secondary animate-pulse" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
                  The Glee Store
                </h2>
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary animate-pulse" />
              </div>
            </div>
            
            <FeaturedProducts limit={8} showTitle={false} />
          </Card>
        </div>
      </section>

      {/* Albums Section */}
      {albums.length > 0 && (
        <section className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full">
          <div className="w-full">
            <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
              <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <AlbumIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-secondary animate-pulse" />
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
                    Our Music
                  </h2>
                  <AlbumIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary animate-pulse" />
                </div>
                <p className="text-foreground/70 text-sm sm:text-base md:text-lg">Discover our musical journey through our album collection</p>
              </div>
              
              {/* Horizontal Scroll for All Devices */}
              <Carousel className="w-full">
                <CarouselContent className="w-full -ml-2 sm:-ml-4 md:-ml-6 lg:-ml-8">
                  {albums.map(album => (
                    <CarouselItem key={album.id} className="pl-1 sm:pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                      <Card className="hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-card border-2 border-border hover:border-accent group cursor-pointer h-full" onClick={() => handleAlbumClick(album)}>
                        <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          {album.cover_image_url ? (
                            <img 
                              src={album.cover_image_url} 
                              alt={`${album.title} cover`} 
                              className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-110 brightness-95 contrast-100" 
                              onError={e => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80";
                              }} 
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <Music className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-card border-2 border-primary rounded-full p-3">
                                <Music className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">{album.title}</h3>
                          {album.tracks && album.tracks.length > 0 && (
                            <p className="text-sm text-foreground/70 mt-1">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
                          )}
                          {album.release_date && (
                            <p className="text-sm text-foreground/70 mt-1">{new Date(album.release_date).getFullYear()}</p>
                          )}
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="flex justify-center gap-2 mt-4">
                  <CarouselPrevious className="static translate-y-0" />
                  <CarouselNext className="static translate-y-0" />
                </div>
              </Carousel>
            </Card>
          </div>
        </section>
      )}

      {/* Album Modal */}
      <AlbumModal album={selectedAlbum} isOpen={isAlbumModalOpen} onClose={handleCloseAlbumModal} />

      {/* YouTube Section */}
      <section className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full">
        <div className="w-full">
          <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
            <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-destructive animate-pulse" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
                  YouTube Channel
                </h2>
                <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-destructive animate-pulse" />
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base lg:text-lg">Experience our performances and behind-the-scenes moments</p>
            </div>
            
            <YoutubeVideoSection />
          </Card>
        </div>
      </section>


      {/* Footer */}
      <section className="relative z-30 pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-4 sm:pb-6">
        <div className="w-full">
          <Card className="bg-primary text-primary-foreground p-4 sm:p-6 md:p-8 lg:p-12 border-2 border-border shadow-xl">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Spelman College Glee Club</h3>
                <p className="text-primary-foreground/60 text-sm">
                  Building a legacy of musical excellence and sisterhood since 1881.
                </p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Quick Links</h4>
                <div className="space-y-2 text-sm">
                  <div><Link to="/about" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">About</Link></div>
                  <div><a href="#events" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Events</a></div>
                  <div><Link to="/music-library" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Music</Link></div>
                  <div><Link to="/press-kit" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Contact</Link></div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Connect</h4>
                <div className="space-y-2 text-sm">
                  <div><a href="https://www.facebook.com/SpelmanGlee" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Facebook</a></div>
                  <div><a href="https://www.instagram.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Instagram</a></div>
                  <div><a href="https://x.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">X</a></div>
                  <div><Link to="/youtube" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">YouTube</Link></div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Contact</h4>
                <div className="space-y-2 text-sm text-primary-foreground/60">
                  <div>Spelman College</div>
                  <div>350 Spelman Lane SW</div>
                  <div>Atlanta, GA 30314</div>
                </div>
              </div>
            </div>
            <div className="border-t border-primary-foreground/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm text-primary-foreground/60">
              <p>&copy; 2024 Spelman College Glee Club. All rights reserved.</p>
            </div>
          </Card>
        </div>
      </section>
      </PublicLayout>
      <PWAInstallPrompt />
      
    </div>;
};