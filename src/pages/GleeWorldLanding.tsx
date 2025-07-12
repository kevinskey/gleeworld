import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Music, 
  Calendar, 
  MapPin,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  description: string | null;
  event_type: string;
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

interface Track {
  id: string;
  title: string;
  duration: string;
  image: string;
  audioUrl: string;
  user?: string;
  permalink_url?: string;
}

export const GleeWorldLanding = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  // Remove hardcoded sample tracks - they're now handled by the edge function

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch hero slides
        const { data: heroData } = await supabase
          .from('gw_hero_slides')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        // Fetch upcoming events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('*')
          .gte('start_date', new Date().toISOString())
          .eq('is_public', true)
          .order('start_date', { ascending: true })
          .limit(6);

        if (heroData) setHeroSlides(heroData);
        if (eventsData) setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSoundCloudTracks = async () => {
      try {
        console.log('🎵 Starting SoundCloud fetch...');
        setTracksLoading(true);
        
        // Fetch tracks from the improved edge function
        const { data, error } = await supabase.functions.invoke('soundcloud-tracks', {
          body: { q: 'gospel choir spelman', limit: 8 }
        });
        
        console.log('📡 SoundCloud API response:', { data, error });
        
        if (error) {
          console.error('❌ Error fetching tracks:', error);
          // Edge function handles its own fallbacks, so we should still get tracks
          setTracks([]);
        } else if (data?.tracks && Array.isArray(data.tracks)) {
          console.log('✅ Got tracks:', data.tracks.length, 'tracks from', data.source);
          console.log('🎧 First track:', data.tracks[0]);
          setTracks(data.tracks);
        } else {
          console.log('⚠️ No tracks in response');
          setTracks([]);
        }
      } catch (error) {
        console.error('💥 Error calling SoundCloud function:', error);
        setTracks([]);
      } finally {
        setTracksLoading(false);
        console.log('🏁 SoundCloud fetch complete');
      }
    };

    fetchData();
    fetchSoundCloudTracks();
  }, []);

  // Auto-advance slides based on individual slide duration
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const currentHeroSlide = heroSlides[currentSlide];
    const duration = (currentHeroSlide?.slide_duration_seconds || 5) * 1000;

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


  // Audio player functionality
  const playTrack = async (track: Track) => {
    try {
      // Stop current audio if playing
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      
      console.log('Playing track:', track.title, 'URL:', track.audioUrl);
      
      const newAudio = new Audio(track.audioUrl);
      setAudio(newAudio);
      setCurrentTrack(track);
      
      // Add error handling for audio loading
      newAudio.onerror = (e) => {
        console.error('Audio failed to load:', e);
        setIsPlaying(false);
        alert('Sorry, this audio track could not be loaded.');
      };
      
      newAudio.onloadstart = () => {
        console.log('Audio started loading');
      };
      
      newAudio.oncanplay = () => {
        console.log('Audio can start playing');
      };
      
      newAudio.onended = () => {
        console.log('Audio ended');
        setIsPlaying(false);
      };
      
      // Try to play the audio
      try {
        await newAudio.play();
        setIsPlaying(true);
        console.log('Audio is now playing');
      } catch (playError) {
        console.error('Play failed:', playError);
        setIsPlaying(false);
        alert('Audio playback failed. This might be due to browser autoplay policies.');
      }
    } catch (error) {
      console.error('Error in playTrack:', error);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audio || !currentTrack) {
      console.log('No audio or track selected');
      return;
    }
    
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        console.log('Audio paused');
      } else {
        await audio.play();
        setIsPlaying(true);
        console.log('Audio resumed');
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto px-0.5 sm:px-1 md:px-1.5 lg:px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/lovable-uploads/a07cfbb7-b3ac-4674-acd9-4a037296a3f7.png" 
                  alt="Spelman College Glee Club"
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">GleeWorld</h1>
                  <p className="text-xs text-gray-600">Spelman College</p>
                </div>
              </Link>
            </div>
            
            {/* Mobile Navigation Button - Only show on small screens */}
            <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-md bg-white/20 backdrop-blur-md border border-white/30 text-gray-700 hover:text-gray-900 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Home</a>
              <a href="#about" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">About</a>
              <a href="#events" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Events</a>
              <Link to="/public-calendar" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Public Calendar</Link>
              <a href="#contact" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link to="/dashboard">
                    <Button size="sm" className="bg-primary/90 backdrop-blur-md border border-white/30 hover:bg-primary text-primary-foreground">Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="border-primary/50 bg-background/90 backdrop-blur-md hover:bg-primary hover:text-primary-foreground text-primary">Sign Up</Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm" className="bg-primary backdrop-blur-md hover:bg-primary/90 text-primary-foreground">Login</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
                    className="hidden md:block w-full h-full object-cover transition-opacity duration-500"
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
                    className="hidden sm:block md:hidden w-full h-full object-cover transition-opacity duration-500"
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
                    className="block sm:hidden w-full h-full object-cover object-center transition-opacity duration-500"
                    onError={(e) => {
                      console.log('Mobile hero image failed to load, using fallback');
                      if (!e.currentTarget.src.includes('unsplash.com')) {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60"></div>
                  
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
                    <Music className="h-24 w-24 text-gray-400 mx-auto mb-4" />
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
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 animate-pulse" />
                <h2 className="text-2xl sm:text-4xl md:text-6xl font-dancing font-bold text-gray-900">Upcoming Events</h2>
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 animate-pulse" />
              </div>
            </div>
              
              
              {loading ? (
                <div className="flex space-x-4 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse flex-shrink-0 w-80 bg-white/20 backdrop-blur-md border border-white/30">
                      <div className="h-48 bg-gray-200/50 rounded-t-lg"></div>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200/50 rounded mb-4"></div>
                        <div className="h-3 bg-gray-200/50 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200/50 rounded w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : events.length > 0 ? (
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
                          
                          <div className="h-48 sm:h-64 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm">
                            <img 
                              src="https://dzzptovqfqausipsgabw.supabase.co/storage/v1/object/public/event-images/event-images/1750597449197-ilkitkdn1ld.png"
                              alt={event.title}
                              className="w-full h-full object-cover rounded-t-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><Music class="h-12 w-12 text-blue-600" /></div>';
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
                          
                          <div className="h-48 sm:h-64 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-t-lg flex items-center justify-center backdrop-blur-sm">
                            <Music className="h-12 w-12 text-blue-600" />
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

      {/* Music Player Section */}
      <section className="pt-10 pb-12 sm:pt-14 sm:pb-16 px-0.5 sm:px-1 md:px-1.5 lg:px-3.5">
        <div className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Listen to the Glee</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Experience our music collection with our enhanced audio player
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-4 sm:p-6 bg-white/30 backdrop-blur-md border border-white/20 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-2xl sm:text-xl font-semibold text-gray-900">Centennial Tour 2025</h3>
                  <p className="text-gray-600 text-sm sm:text-base">14 tracks</p>
                </div>
                <div className="flex items-center space-x-3 self-start sm:self-auto">
                  <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/30">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={togglePlayPause} className="bg-blue-500/80 backdrop-blur-md hover:bg-blue-600/80">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/30">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/30">
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {tracksLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 rounded-lg animate-pulse bg-white/10 backdrop-blur-sm">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200/50 rounded flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200/50 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200/50 rounded w-1/2"></div>
                      </div>
                      <div className="w-8 h-8 bg-gray-200/50 rounded flex-shrink-0"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {tracks.map((track, index) => (
                    <div 
                      key={track.id} 
                      className={`flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 rounded-lg hover:bg-white/20 backdrop-blur-sm cursor-pointer transition-all duration-200 border border-transparent hover:border-white/20 ${
                        currentTrack?.id === track.id ? 'bg-blue-500/20 border-blue-300/30' : ''
                      }`}
                      onClick={() => playTrack(track)}
                    >
                      <img 
                        src={track.image} 
                        alt={track.title}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded object-contain flex-shrink-0 bg-gray-100/50"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{track.title}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-gray-600">{track.duration}</p>
                          {track.user && (
                            <>
                              <span className="text-gray-400">•</span>
                              <p className="text-xs sm:text-sm text-gray-500">{track.user}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0 hover:bg-white/20">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
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
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a></div>
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a></div>
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">YouTube</a></div>
                  <div><a href="#" className="text-gray-400 hover:text-white transition-colors">Spotify</a></div>
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
    </div>
  );
};