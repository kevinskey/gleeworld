import { useState, useEffect } from "react";
import { getDefaultEventImage } from "@/constants/images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useMusic, Album } from "@/hooks/useMusic";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import { useNavigate, Link } from "react-router-dom";
import gleeClubFallback from "@/assets/glee-club-fallback.jpg";
import { AlbumModal } from "@/components/music/AlbumModal";
import { YoutubeVideoSection } from "@/components/youtube/YoutubeVideoSection";
import { FAQSlider } from "@/components/landing/FAQSlider";
import { CountdownTimer } from "@/components/landing/CountdownTimer";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { AuditionHoverCard } from "@/components/audition/AuditionHoverCard";
import { MusicStaffIcon } from "@/components/icons/MusicStaffIcon";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Music,
  Album as AlbumIcon,
  Youtube,
  Play,
  AlertCircle
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

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
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useRoleBasedRedirect();
  const navigate = useNavigate();
  const { albums } = useMusic();
  const { videos, getVideoEmbedUrl } = useYouTubeVideos();
  const [events, setEvents] = useState<Event[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [showFallbackImage, setShowFallbackImage] = useState(false);

  // Get the featured video or fallback to the hardcoded video ID
  const backgroundVideo = videos.find(video => video.is_featured) || 
                         videos.find(video => video.video_id === 'fDvKSh6jGKA') || 
                         videos[0];

  // Remove hardcoded sample tracks - they're now handled by the edge function

  useEffect(() => {
    console.log('GleeWorldLanding: Component mounted, starting useEffect');
    
    // Set a maximum loading time to prevent infinite stuck state
    const maxLoadingTimer = setTimeout(() => {
      console.log('GleeWorldLanding: Maximum loading time reached, forcing completion');
      setLoading(false);
    }, 5000); // 5 second max loading time
    
    const fetchData = async () => {
      console.log('GleeWorldLanding: Inside fetchData function');
      try {
        console.log('GleeWorldLanding: Starting data fetch');
        
        // Add shorter timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data fetch timeout')), 3000)
        );

        // Fetch hero slides and events in parallel with timeout
        const fetchPromises = Promise.all([
          supabase
            .from('gw_hero_slides')
            .select('*')
            .eq('usage_context', 'homepage')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
          supabase
            .from('gw_events')
            .select('*')
            .gte('start_date', new Date().toISOString())
            .eq('is_public', true)
            .order('start_date', { ascending: true })
            .limit(6)
        ]);

        const results = await Promise.race([fetchPromises, timeoutPromise]) as any;
        const [heroResult, eventsResult] = results;

        console.log('GleeWorldLanding: Data fetch completed', {
          heroSlides: heroResult.data?.length || 0,
          events: eventsResult.data?.length || 0
        });

        if (heroResult.data) setHeroSlides(heroResult.data);
        if (eventsResult.data) setEvents(eventsResult.data);
      } catch (error) {
        console.error('GleeWorldLanding: Error fetching data:', error);
        // Don't fail completely - show page with empty data
      } finally {
        clearTimeout(maxLoadingTimer);
        setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup function
    return () => {
      clearTimeout(maxLoadingTimer);
    };
  }, []);

  // Auto-advance slides based on individual slide duration
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const currentHeroSlide = heroSlides[currentSlide];
    const duration = (currentHeroSlide?.slide_duration_seconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentSlide, heroSlides]);


  const currentHeroSlide = heroSlides[currentSlide];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper functions for positioning and sizing
  const getHorizontalAlignment = (position: string | null) => {
    switch (position) {
      case 'left': return 'text-left items-start';
      case 'right': return 'text-right items-end';
      case 'center':
      default: return 'text-center items-center';
    }
  };

  const getVerticalAlignment = (position: string | null) => {
    switch (position) {
      case 'top': return 'justify-start pt-16';
      case 'bottom': return 'justify-end pb-16';
      case 'middle':
      default: return 'justify-center';
    }
  };

  const getTitleSize = (size: string | null) => {
    switch (size) {
      case 'small': return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
      case 'medium': return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
      case 'large': return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
      case 'xl': return 'text-3xl sm:text-4xl md:text-5xl lg:text-7xl';
      default: return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
    }
  };

  const getDescriptionSize = (size: string | null) => {
    switch (size) {
      case 'small': return 'text-sm sm:text-base md:text-lg';
      case 'medium': return 'text-base sm:text-lg md:text-xl';
      case 'large': return 'text-lg sm:text-xl md:text-2xl';
      case 'xl': return 'text-xl sm:text-2xl md:text-3xl';
      default: return 'text-base sm:text-lg md:text-xl lg:text-2xl';
    }
  };

  const getTitleFont = (font: string | null) => {
    switch (font) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'sans':
      default: return 'font-sans';
    }
  };

  const getDescriptionFont = (font: string | null) => {
    switch (font) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'sans':
      default: return 'font-sans';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-spelman-blue-light/10 via-background to-spelman-blue-dark/10 relative overflow-hidden">
      {/* Liquid glass background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      
      <PublicLayout>
      {/* Auth state indicator disabled - was showing "You're logged in! Go to Dashboard" badge */}
      {/* YouTube Video Background Section */}
      <section className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden">
        {!showFallbackImage && backgroundVideo ? (
          <>
            {/* YouTube Embed */}
            <div className="absolute inset-0">
              <iframe
                src={getVideoEmbedUrl(backgroundVideo.video_id, true, true, 3861)}
                className="w-full h-full object-cover"
                style={{
                  width: '300%',
                  height: '300%',
                  marginLeft: '-100%',
                  marginTop: '-100%',
                }}
                allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture"
                allowFullScreen
                title={backgroundVideo.title || "Glee Club Background Video"}
                onError={() => setShowFallbackImage(true)}
              />
            </div>
          </>
        ) : (
          <>
            {/* Fallback Glee Club Image */}
            <div className="absolute inset-0">
              <img 
                src="/lovable-uploads/1fd284bf-d474-493f-a363-1104a0653923.png"
                alt="Spelman College Glee Club Group Photo"
                className="w-full h-full object-cover brightness-75 contrast-105"
              />
            </div>
          </>
        )}
        
        {/* Overlay for dimming */}
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        
        {/* Gradient fade to content below */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/80 to-transparent z-20"></div>
      </section>

      {/* Audition Hover Card */}
      <AuditionHoverCard />

      {/* FAQ Slider Section */}
      <FAQSlider />

      {/* Hero Section */}
      <section className="relative z-30 pt-1 pb-14 sm:pt-2 sm:pb-16 md:pt-4 md:pb-18 px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-screen-2xl mx-auto">
          <Card className="overflow-hidden bg-card border-2 border-border shadow-xl">
            <div className="min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[800px] h-auto overflow-auto relative">
              {heroSlides.length > 0 ? (
                <>
                  {/* Desktop Image */}
                  <img 
                    src={currentHeroSlide?.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
                    alt="Hero Background"
                    className="hidden md:block w-full h-full object-cover transition-opacity duration-500 brightness-95 contrast-100"
                    onError={(e) => {
                      console.log('Hero image failed to load, using fallback');
                      // Only fallback if the current src is not already the fallback
                      if (!e.currentTarget.src.includes('unsplash.com')) {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                      }
                    }}
                  />
                  
                  {/* iPad Image */}
                  <img 
                    src={currentHeroSlide?.ipad_image_url || currentHeroSlide?.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
                    alt="Hero Background"
                    className="hidden sm:block md:hidden w-full h-full object-cover transition-opacity duration-500 brightness-95 contrast-100"
                    onError={(e) => {
                      console.log('iPad hero image failed to load, using fallback');
                      if (!e.currentTarget.src.includes('unsplash.com')) {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                      }
                    }}
                  />
                  
                  {/* Mobile Image */}
                  <img 
                    src={currentHeroSlide?.mobile_image_url || currentHeroSlide?.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
                    alt="Hero Background"
                    className="block sm:hidden w-full h-full object-cover object-center transition-opacity duration-500 brightness-95 contrast-100"
                    onError={(e) => {
                      console.log('Mobile hero image failed to load, using fallback');
                      if (!e.currentTarget.src.includes('unsplash.com')) {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-black/50 to-primary/40"></div>
                  
                  {/* Content overlay - positioned elements */}
                  <div className="absolute inset-0">
                    {/* Title Section */}
                    {currentHeroSlide?.title && (
                      <div className={`absolute inset-0 flex ${getVerticalAlignment(currentHeroSlide.title_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.title_position_horizontal)} px-3 sm:px-4 md:px-6 lg:px-8 pointer-events-none`}>
                        <h1 className={`${getTitleSize(currentHeroSlide.title_size)} font-bold text-white max-w-4xl pointer-events-auto drop-shadow-2xl text-center sm:text-left leading-tight`}>
                          {currentHeroSlide.title}
                        </h1>
                      </div>
                    )}
                    
                    {/* Description Section */}
                    {currentHeroSlide?.description && (
                      <div className={`absolute inset-0 flex ${getVerticalAlignment(currentHeroSlide.description_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.description_position_horizontal)} px-3 sm:px-4 md:px-6 lg:px-8 pointer-events-none`}>
                        <p className={`${getDescriptionSize(currentHeroSlide.description_size)} text-white/90 max-w-2xl pointer-events-auto drop-shadow-lg text-center sm:text-left leading-relaxed`}>
                          {currentHeroSlide.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Button Section */}
                    {currentHeroSlide?.action_button_enabled && currentHeroSlide?.action_button_text && currentHeroSlide?.action_button_url && (
                      <div className="absolute inset-0 flex justify-center items-end pb-4 sm:pb-6 md:pb-8 lg:pb-12 px-3 sm:px-4 md:px-6 pointer-events-none">
                        <Button size="sm" className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl font-semibold border-2 border-white/20 text-xs sm:text-sm md:text-base px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3" asChild>
                          <a href={currentHeroSlide.action_button_url} target="_blank" rel="noopener noreferrer">
                            {currentHeroSlide.action_button_text}
                          </a>
                        </Button>
                      </div>
                    )}
                    
                    {/* Legacy button support */}
                    {!currentHeroSlide?.action_button_enabled && currentHeroSlide?.button_text && currentHeroSlide?.link_url && (
                      <div className="absolute inset-0 flex justify-center items-end pb-4 sm:pb-6 md:pb-8 lg:pb-12 px-3 sm:px-4 md:px-6 pointer-events-none">
                        <Button size="sm" className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl font-semibold border-2 border-white/20 text-xs sm:text-sm md:text-base px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3" asChild>
                          <a href={currentHeroSlide.link_url} target="_blank" rel="noopener noreferrer">
                            {currentHeroSlide.button_text}
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                  
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center p-4">
                    <Calendar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">No hero slides configured</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="relative z-30 pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
        <div className="w-full max-w-screen-2xl mx-auto">
          <Card className="p-4 sm:p-6 md:p-8 bg-card border-2 border-border shadow-xl">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-secondary animate-pulse" />
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-dancing font-bold text-gray-900 mb-2">
                  Upcoming Events
                </h2>
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary animate-pulse" />
              </div>
            </div>
              
              
              {loading ? (
                <div className="flex space-x-4 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse flex-shrink-0 w-80 bg-card border-2 border-border">
                      <div className="h-64 bg-gray-200/50 rounded-t-lg"></div>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200/50 rounded mb-4"></div>
                        <div className="h-3 bg-gray-200/50 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200/50 rounded w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <>
                  {/* Desktop view - Single horizontal scrolling row */}
                  <div className="hidden md:block">
                    <div 
                      className="flex gap-4 lg:gap-6 overflow-x-scroll pb-4 scrollbar-hide"
                      style={{ 
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      {events.map((event) => (
                        <Card key={event.id} className="hover:shadow-2xl transition-all duration-300 h-full relative group bg-card border-2 border-border hover:border-accent flex-shrink-0 w-72 lg:w-80">
                          {/* Hover overlay button */}
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-semibold border border-white/30" asChild>
                              <Link to="/public-calendar">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="h-48 md:h-56 lg:h-64 bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                            <img 
                              src={event.image_url || getDefaultEventImage(event.id)}
                              alt={event.title}
                              className="w-full h-full object-contain p-4 rounded-t-lg brightness-95 contrast-100"
                              onError={(e) => {
                                console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                                e.currentTarget.src = getDefaultEventImage(event.id);
                              }}
                            />
                          </div>
                          <CardContent className="p-4 lg:p-6">
                            <h3 className="text-lg lg:text-xl font-semibold text-card-foreground mb-3 lg:mb-4 line-clamp-2">{event.title}</h3>
                            <div className="space-y-2 text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">{formatDate(event.start_date)}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="text-sm line-clamp-1">{event.location}</span>
                                </div>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">{event.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Mobile/Tablet view - Carousel */}
                  <div className="md:hidden">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {events.map((event) => (
                          <CarouselItem key={event.id} className="pl-2 sm:pl-4 basis-full">
                            <Card className="hover:shadow-2xl transition-all duration-300 h-full w-full relative group bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30">
                              {/* Hover overlay button */}
                              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-white/30" asChild>
                                  <Link to="/public-calendar">
                                    View All <ArrowRight className="ml-1 h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                              
                              <div className="h-56 sm:h-64 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden">
                                <img 
                                  src={event.image_url || getDefaultEventImage(event.id)}
                                  alt={event.title}
                                  className="w-full h-full object-contain p-4 rounded-t-lg brightness-95 contrast-100"
                                  onError={(e) => {
                                    console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                                    e.currentTarget.src = getDefaultEventImage(event.id);
                                  }}
                                />
                              </div>
                              <CardContent className="p-4 sm:p-6">
                                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 line-clamp-2">{event.title}</h3>
                                <div className="space-y-2 text-gray-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                                    <span className="text-sm sm:text-base lg:text-lg">{formatDate(event.start_date)}</span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center">
                                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                                      <span className="text-sm sm:text-base lg:text-lg line-clamp-1">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-600 mt-3 sm:mt-4 line-clamp-3 text-sm sm:text-base lg:text-lg">{event.description}</p>
                                )}
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                </>
              ) : (
                <Carousel className="w-full">
                  <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
                    {[...Array(6)].map((_, i) => (
                      <CarouselItem key={i} className="pl-1 sm:pl-2 md:pl-4 basis-full">
                        <Card className="hover:shadow-2xl transition-all duration-300 h-full w-full relative group bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30">
                          {/* Hover overlay button */}
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-white/30" asChild>
                              <Link to="/public-calendar">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="h-64 sm:h-80 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm">
                            <Calendar className="h-12 w-12 text-blue-600" />
                          </div>
                          <CardContent className="p-6 sm:p-8">
                            <h3 className="text-2xl sm:text-2xl font-semibold text-gray-900 mb-4">Glee Club Rehearsal</h3>
                            <div className="space-y-2 text-gray-600">
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
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              )}
          </Card>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="relative z-30 pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
        <div className="w-full max-w-screen-2xl mx-auto">
          <Card className="p-4 sm:p-6 md:p-8 bg-card border-2 border-border shadow-xl">
            {/* The Glee Store Title */}
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-secondary animate-pulse" />
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-dancing font-bold text-gray-900 mb-2">
                  The Glee Store
                </h2>
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary animate-pulse" />
              </div>
            </div>
            
            <FeaturedProducts limit={8} showTitle={false} />
          </Card>
        </div>
      </section>

      {/* Albums Section */}
      {albums.length > 0 && (
        <section className="relative z-30 pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
          <div className="w-full max-w-screen-2xl mx-auto">
            <Card className="p-4 sm:p-6 md:p-8 bg-card border-2 border-border shadow-xl">
              <div className="text-center mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <AlbumIcon className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-secondary animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-dancing font-bold text-gray-900 mb-2">
                    Our Music
                  </h2>
                  <AlbumIcon className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Discover our musical journey through our album collection</p>
              </div>
              
              {/* Horizontal Scroll for All Devices */}
              <Carousel className="w-full">
                <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
                  {albums.map((album) => (
                    <CarouselItem key={album.id} className="pl-1 sm:pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                      <Card 
                        className="hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-card border-2 border-border hover:border-accent group cursor-pointer h-full"
                        onClick={() => handleAlbumClick(album)}
                      >
                        <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          {album.cover_image_url ? (
                            <img 
                              src={album.cover_image_url}
                              alt={`${album.title} cover`}
                              className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-110 brightness-95 contrast-100"
                              onError={(e) => {
                                // Use a placeholder image if cover fails to load
                                e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80";
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <Music className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-card border-2 border-primary rounded-full p-3">
                                <Music className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 text-sm sm:text-base">{album.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{album.artist}</p>
                          {album.tracks && album.tracks.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
                          )}
                          {album.release_date && (
                            <p className="text-xs text-muted-foreground mt-1">{new Date(album.release_date).getFullYear()}</p>
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
      <AlbumModal 
        album={selectedAlbum}
        isOpen={isAlbumModalOpen}
        onClose={handleCloseAlbumModal}
      />

      {/* YouTube Section */}
      <section className="relative z-30 pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
        <div className="w-full max-w-screen-2xl mx-auto">
          <Card className="p-4 sm:p-6 md:p-8 bg-card border-2 border-border shadow-xl">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Youtube className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-red-500 animate-pulse" />
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-dancing font-bold text-gray-900 mb-2">
                  YouTube Channel
                </h2>
                <Youtube className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-red-600 animate-pulse" />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Experience our performances and behind-the-scenes moments</p>
            </div>
            
            <YoutubeVideoSection />
          </Card>
        </div>
      </section>

      {/* Footer */}
      <section className="relative z-30 pt-4 pb-6 px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-screen-2xl mx-auto">
          <Card className="bg-primary text-primary-foreground p-6 sm:p-8 md:p-12 border-2 border-border shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Spelman College Glee Club</h3>
                <p className="text-gray-400 text-sm">
                  Building a legacy of musical excellence and sisterhood since 1881.
                </p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Quick Links</h4>
                <div className="space-y-2 text-sm">
                  <div><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></div>
                  <div><a href="#events" className="text-gray-400 hover:text-white transition-colors">Events</a></div>
                  <div><Link to="/music-library" className="text-gray-400 hover:text-white transition-colors">Music</Link></div>
                  <div><Link to="/press-kit" className="text-gray-400 hover:text-white transition-colors">Contact</Link></div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Connect</h4>
                <div className="space-y-2 text-sm">
                  <div><a href="https://www.facebook.com/SpelmanGlee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Facebook</a></div>
                  <div><a href="https://www.instagram.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Instagram</a></div>
                  <div><a href="https://x.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">X</a></div>
                  <div><a href="https://www.youtube.com/@spelmancollegegleeclub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">YouTube</a></div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">Contact</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Spelman College</div>
                  <div>350 Spelman Lane SW</div>
                  <div>Atlanta, GA 30314</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm text-gray-400">
              <p>&copy; 2024 Spelman College Glee Club. All rights reserved.</p>
            </div>
          </Card>
        </div>
      </section>
      </PublicLayout>
    </div>
  );
};