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
  ChevronRight
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
}

export const GleeWorldLanding = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    fetchData();
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
      case 'medium': return 'text-3xl md:text-4xl';
      case 'large': return 'text-4xl md:text-6xl';
      case 'xl': return 'text-5xl md:text-7xl';
      default: return 'text-4xl md:text-6xl';
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

  const sampleTracks = [
    { id: '1', title: 'Anchored in the Lord', duration: '3:45', image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png' },
    { id: '2', title: 'A Choice to Change the World', duration: '4:12', image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png' },
    { id: '3', title: 'Children Go Where I Send Thee', duration: '3:28', image: '/lovable-uploads/bf415f6e-790e-4f30-9259-940f17e208d0.png' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/a07cfbb7-b3ac-4674-acd9-4a037296a3f7.png" 
                  alt="Spelman College Glee Club"
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">GleeWorld</h1>
                  <p className="text-xs text-gray-600">Spelman College</p>
                </div>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Home</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">About</a>
              <a href="#events" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Events</a>
              <Link to="/calendar" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Calendar</Link>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Reader</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Studio</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Store</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link to="/dashboard">
                    <Button size="sm">Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/auth">
                    <Button variant="outline" size="sm">Sign Up</Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm">Login</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="h-[60vh] overflow-hidden relative">
          {heroSlides.length > 0 ? (
            <>
              <img 
                src={currentHeroSlide?.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
                alt="Hero Background"
                className="w-full h-full object-cover transition-opacity duration-500"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              {/* Content overlay */}
              <div className="absolute inset-0 flex flex-col">
                {/* Title Section */}
                {currentHeroSlide?.title && (
                  <div className={`flex ${getVerticalAlignment(currentHeroSlide.title_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.title_position_horizontal)} px-6 flex-1`}>
                    <h1 className={`${getTitleSize(currentHeroSlide.title_size)} font-bold mb-4 text-white max-w-4xl`}>
                      {currentHeroSlide.title}
                    </h1>
                  </div>
                )}
                
                {/* Description Section */}
                {currentHeroSlide?.description && (
                  <div className={`flex ${getVerticalAlignment(currentHeroSlide.description_position_vertical)} ${getHorizontalAlignment(currentHeroSlide.description_position_horizontal)} px-6 flex-1`}>
                    <p className={`${getDescriptionSize(currentHeroSlide.description_size)} mb-6 text-white max-w-4xl`}>
                      {currentHeroSlide.description}
                    </p>
                  </div>
                )}
                
                {/* Action Button Section */}
                {currentHeroSlide?.action_button_enabled && currentHeroSlide?.action_button_text && currentHeroSlide?.action_button_url && (
                  <div className="flex justify-center items-end pb-16 px-6">
                    <Button size="lg" asChild>
                      <a href={currentHeroSlide.action_button_url} target="_blank" rel="noopener noreferrer">
                        {currentHeroSlide.action_button_text}
                      </a>
                    </Button>
                  </div>
                )}
                
                {/* Legacy button support */}
                {!currentHeroSlide?.action_button_enabled && currentHeroSlide?.button_text && currentHeroSlide?.link_url && (
                  <div className="flex justify-center items-end pb-16 px-6">
                    <Button size="lg" asChild>
                      <a href={currentHeroSlide.link_url} target="_blank" rel="noopener noreferrer">
                        {currentHeroSlide.button_text}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-pink-100 to-rose-200 flex items-center justify-center">
              <div className="text-center">
                <Music className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hero slides configured</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section id="events" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
            <Button variant="link" className="text-blue-600 hover:text-blue-700">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          
          {loading ? (
            <div className="flex space-x-4 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse flex-shrink-0 w-80">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {events.map((event) => (
                  <CarouselItem key={event.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="hover:shadow-lg transition-shadow">
                      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
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
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                        <div className="space-y-1 text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(event.start_date)}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {[...Array(6)].map((_, i) => (
                  <CarouselItem key={i} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="hover:shadow-lg transition-shadow">
                      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                        <Music className="h-12 w-12 text-blue-600" />
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Glee Club Rehearsal</h3>
                        <div className="space-y-1 text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Aug {19 + i * 2}, 2025
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            350 Spelman Lane SW Atlanta GA 30314
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>
      </section>

      {/* Music Player Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Listen to the Glee</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience our music collection with our enhanced audio player
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Centennial Tour 2025</h3>
                  <p className="text-gray-600">14 tracks</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {sampleTracks.map((track, index) => (
                  <div 
                    key={track.id} 
                    className={`flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      currentTrack?.id === track.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setCurrentTrack(track)}
                  >
                    <img 
                      src={track.image} 
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80";
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{track.title}</h4>
                      <p className="text-sm text-gray-600">{track.duration}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
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
        </div>
      </footer>
    </div>
  );
};