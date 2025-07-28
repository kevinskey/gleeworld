import { useState, useEffect } from "react";
import { getDefaultEventImage } from "@/constants/images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useMusic, Album } from "@/hooks/useMusic";
import { AlbumModal } from "@/components/music/AlbumModal";
import { YoutubeVideoSection } from "@/components/youtube/YoutubeVideoSection";
import { FAQSlider } from "@/components/landing/FAQSlider";
import { CountdownTimer } from "@/components/landing/CountdownTimer";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { AuditionHoverCard } from "@/components/audition/AuditionHoverCard";
import { MusicStaffIcon } from "@/components/icons/MusicStaffIcon";
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
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
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
  const { user } = useAuth();
  const { albums } = useMusic();
  const [events, setEvents] = useState<Event[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

  // Remove hardcoded sample tracks - they're now handled by the edge function

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('GleeWorldLanding: Starting data fetch');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data fetch timeout')), 8000)
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
        setLoading(false);
      }
    };

    fetchData();
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
      case 'small': return 'text-2xl md:text-3xl';
      case 'medium': return 'text-2xl md:text-4xl';
      case 'large': return 'text-2xl md:text-6xl';
      case 'xl': return 'text-2xl md:text-7xl';
      default: return 'text-2xl md:text-6xl';
    }
  };

  const getDescriptionSize = (size: string | null) => {
    switch (size) {
      case 'small': return 'text-base md:text-lg';
      case 'medium': return 'text-lg md:text-xl';
      case 'large': return 'text-xl md:text-2xl';
      case 'xl': return 'text-2xl md:text-3xl';
      default: return 'text-xl md:text-2xl';
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


  return (
    <PublicLayout>
      {/* Audition Hover Card */}
      <AuditionHoverCard />

      {/* FAQ Slider Section */}
      <FAQSlider />

      {/* Hero Section */}
      <section className="pt-4 pb-6 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <Card className="overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl">
            <div className="h-[30vh] sm:h-[40vh] md:h-[45vh] lg:h-[70vh] xl:h-[75vh] min-h-[250px] sm:min-h-[350px] overflow-hidden relative">
              {heroSlides.length > 0 ? (
                <>
                  {/* Desktop Image */}
                  <img 
                    src={currentHeroSlide?.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
                    alt="Hero Background"
                    className="hidden md:block w-full h-full object-cover transition-opacity duration-500 brightness-110 contrast-105"
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
                    className="hidden sm:block md:hidden w-full h-full object-cover transition-opacity duration-500 brightness-110 contrast-105"
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
                    className="block sm:hidden w-full h-full object-cover object-center transition-opacity duration-500 brightness-110 contrast-105"
                    onError={(e) => {
                      console.log('Mobile hero image failed to load, using fallback');
                      if (!e.currentTarget.src.includes('unsplash.com')) {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-spelman-blue-dark/30 via-black/40 to-spelman-blue-dark/60"></div>
                  
                  {/* Content overlay - positioned elements */}
                  <div className="absolute inset-0">
                    {/* Title Section */}
                    {currentHeroSlide?.title && (
                      <div className={`absolute inset-0 flex ${getVerticalAlignment(currentHeroSlide.title_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.title_position_horizontal)} px-6 pointer-events-none`}>
                        <h1 className={`${getTitleSize(currentHeroSlide.title_size)} font-bold text-white max-w-4xl pointer-events-auto drop-shadow-2xl`}>
                          {currentHeroSlide.title}
                        </h1>
                      </div>
                    )}
                    
                    {/* Description Section */}
                    {currentHeroSlide?.description && (
                      <div className={`absolute inset-0 flex ${getVerticalAlignment(currentHeroSlide.description_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.description_position_horizontal)} px-6 pointer-events-none`}>
                        <p className={`${getDescriptionSize(currentHeroSlide.description_size)} text-white max-w-4xl pointer-events-auto drop-shadow-lg`}>
                          {currentHeroSlide.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Button Section */}
                    {currentHeroSlide?.action_button_enabled && currentHeroSlide?.action_button_text && currentHeroSlide?.action_button_url && (
                      <div className="absolute inset-0 flex justify-center items-end pb-16 px-6 pointer-events-none">
                        <Button size="lg" asChild className="pointer-events-auto bg-primary/90 backdrop-blur-md border border-white/30 hover:bg-primary text-primary-foreground shadow-2xl">
                          <a href={currentHeroSlide.action_button_url} target="_blank" rel="noopener noreferrer">
                            {currentHeroSlide.action_button_text}
                          </a>
                        </Button>
                      </div>
                    )}
                    
                    {/* Legacy button support */}
                    {!currentHeroSlide?.action_button_enabled && currentHeroSlide?.button_text && currentHeroSlide?.link_url && (
                      <div className="absolute inset-0 flex justify-center items-end pb-16 px-6 pointer-events-none">
                        <Button size="lg" asChild className="pointer-events-auto bg-primary/90 backdrop-blur-md border border-white/30 hover:bg-primary text-primary-foreground shadow-2xl">
                          <a href={currentHeroSlide.link_url} target="_blank" rel="noopener noreferrer">
                            {currentHeroSlide.button_text}
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                  
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-pink-100/50 to-rose-200/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <Calendar className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hero slides configured</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="pt-7 pb-9 sm:pt-10 sm:pb-12 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5 w-full">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <Card className="p-6 sm:p-8 bg-white/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-spelman-blue-light animate-pulse" />
                <h2 className="text-2xl sm:text-4xl md:text-6xl font-dancing font-bold text-foreground">Upcoming Events</h2>
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-spelman-blue-dark animate-pulse" />
              </div>
            </div>
              
              
              {loading ? (
                <div className="flex space-x-4 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse flex-shrink-0 w-80 bg-white/20 backdrop-blur-md border border-white/30">
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
                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                      {events.map((event) => (
                        <Card key={event.id} className="hover:shadow-2xl transition-all duration-300 h-full relative group bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 flex-shrink-0 w-80">
                          {/* Hover overlay button */}
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-white/30" asChild>
                              <Link to="/public-calendar">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="h-64 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden">
                            <img 
                              src={event.image_url || getDefaultEventImage(event.id)}
                              alt={event.title}
                              className="w-full h-full object-cover rounded-t-lg brightness-110 contrast-105"
                              onError={(e) => {
                                console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                                e.currentTarget.src = getDefaultEventImage(event.id);
                              }}
                            />
                          </div>
                          <CardContent className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 line-clamp-2">{event.title}</h3>
                            <div className="space-y-2 text-gray-600">
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
                              <p className="text-gray-600 mt-3 line-clamp-2 text-sm">{event.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Mobile/Tablet view - Carousel */}
                  <div className="md:hidden">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
                        {events.map((event) => (
                          <CarouselItem key={event.id} className="pl-1 sm:pl-2 md:pl-4 basis-full">
                            <Card className="hover:shadow-2xl transition-all duration-300 h-full w-full relative group bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30">
                              {/* Hover overlay button */}
                              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button size="sm" className="bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary shadow-lg border border-white/30" asChild>
                                  <Link to="/public-calendar">
                                    View All <ArrowRight className="ml-1 h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                              
                              <div className="h-64 sm:h-80 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden">
                                <img 
                                  src={event.image_url || getDefaultEventImage(event.id)}
                                  alt={event.title}
                                  className="w-full h-full object-cover rounded-t-lg brightness-110 contrast-105"
                                  onError={(e) => {
                                    console.log('Image failed to load:', event.image_url, 'for event:', event.title);
                                    e.currentTarget.src = getDefaultEventImage(event.id);
                                  }}
                                />
                              </div>
                              <CardContent className="p-6 sm:p-8">
                                <h3 className="text-2xl sm:text-2xl font-semibold text-gray-900 mb-4 line-clamp-2">{event.title}</h3>
                                <div className="space-y-2 text-gray-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-5 w-5 mr-3 flex-shrink-0" />
                                    <span className="text-base sm:text-lg">{formatDate(event.start_date)}</span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center">
                                      <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
                                      <span className="text-base sm:text-lg line-clamp-1">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-600 mt-4 line-clamp-3 text-base sm:text-lg">{event.description}</p>
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
      <section className="pt-7 pb-9 sm:pt-10 sm:pb-12 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5 w-full">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <Card className="p-6 sm:p-8 bg-white/30 backdrop-blur-md border border-white/20 shadow-2xl">
            {/* The Glee Store Title */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-spelman-blue-light animate-pulse" />
                <h2 className="text-2xl sm:text-4xl md:text-6xl font-dancing font-bold text-foreground">The Glee Store</h2>
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-spelman-blue-dark animate-pulse" />
              </div>
            </div>
            
            <FeaturedProducts limit={8} showTitle={false} />
          </Card>
        </div>
      </section>

      {/* Albums Section */}
      {albums.length > 0 && (
        <section className="pt-7 pb-4 sm:pt-10 sm:pb-6 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5 w-full">
          <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
            <Card className="p-6 sm:p-8 bg-white/30 backdrop-blur-md border border-white/20 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <AlbumIcon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400 animate-pulse" />
                  <h2 className="text-2xl sm:text-4xl md:text-6xl font-dancing font-bold text-gray-900">Our Music</h2>
                  <AlbumIcon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600 animate-pulse" />
                </div>
                <p className="text-gray-600 text-lg">Discover our musical journey through our album collection</p>
              </div>
              
              {/* Desktop view - Grid */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {albums.map((album) => (
                  <Card 
                    key={album.id} 
                    className="hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 group cursor-pointer"
                    onClick={() => handleAlbumClick(album)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden">
                      {album.cover_image_url ? (
                        <img 
                          src={album.cover_image_url}
                          alt={`${album.title} cover`}
                          className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-110 brightness-110 contrast-105"
                          onError={(e) => {
                            // Use a placeholder image if cover fails to load
                            e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Music className="h-16 w-16 text-purple-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 rounded-full p-3">
                            <Music className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{album.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{album.artist}</p>
                      {album.tracks && album.tracks.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
                      )}
                      {album.release_date && (
                        <p className="text-xs text-gray-400 mt-1">{new Date(album.release_date).getFullYear()}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Mobile view - Carousel */}
              <div className="md:hidden">
                <Carousel className="w-full">
                  <CarouselContent className="-ml-1">
                    {albums.map((album) => (
                      <CarouselItem key={album.id} className="pl-1 basis-1/2 sm:basis-1/3">
                        <Card 
                          className="hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 group cursor-pointer"
                          onClick={() => handleAlbumClick(album)}
                        >
                          <div className="aspect-square bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm relative overflow-hidden">
                            {album.cover_image_url ? (
                              <img 
                                src={album.cover_image_url}
                                alt={`${album.title} cover`}
                                className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-110 brightness-110 contrast-105"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80";
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Music className="h-12 w-12 text-purple-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/90 rounded-full p-2">
                                  <Music className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 text-sm">{album.title}</h3>
                            <p className="text-xs text-gray-600 line-clamp-1">{album.artist}</p>
                            {album.tracks && album.tracks.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
                            )}
                            {album.release_date && (
                              <p className="text-xs text-gray-400 mt-1">{new Date(album.release_date).getFullYear()}</p>
                            )}
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
              </div>
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
      <section className="pt-7 pb-4 sm:pt-10 sm:pb-6 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5 w-full">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <Card className="p-6 sm:p-8 bg-white/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Youtube className="h-8 w-8 sm:h-10 sm:w-10 text-red-500 animate-pulse" />
                <h2 className="text-2xl sm:text-4xl md:text-6xl font-dancing font-bold text-gray-900">YouTube Channel</h2>
                <Youtube className="h-8 w-8 sm:h-10 sm:w-10 text-red-600 animate-pulse" />
              </div>
              <p className="text-gray-600 text-lg">Experience our performances and behind-the-scenes moments</p>
            </div>
            
            <YoutubeVideoSection />
          </Card>
        </div>
      </section>

      {/* Footer */}
      <section className="pt-4 pb-6 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <Card className="bg-gray-900/90 backdrop-blur-md text-white p-8 sm:p-12 border border-gray-700/30 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Spelman College Glee Club</h3>
                <p className="text-gray-400 text-sm">
                  Building a legacy of musical excellence and sisterhood since 1881.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Quick Links</h4>
                <div className="space-y-2 text-sm">
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></div>
                  <div><a href="#events" className="text-gray-400 hover:text-white transition-colors">Events</a></div>
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">Music</a></div>
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Connect</h4>
                <div className="space-y-2 text-sm">
                  <div><a href="https://www.facebook.com/SpelmanGlee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Facebook</a></div>
                  <div><a href="https://www.instagram.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Instagram</a></div>
                  <div><a href="https://x.com/spelmanglee" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">X</a></div>
                  <div><a href="https://www.youtube.com/@spelmancollegegleeclub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">YouTube</a></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Contact</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Spelman College</div>
                  <div>350 Spelman Lane SW</div>
                  <div>Atlanta, GA 30314</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              <p>&copy; 2024 Spelman College Glee Club. All rights reserved.</p>
            </div>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
};