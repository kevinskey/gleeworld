import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Music, 
  Calendar, 
  ShoppingBag, 
  Users, 
  Star, 
  Play, 
  Heart,
  ArrowRight,
  Mic,
  Trophy,
  MapPin,
  Clock
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  publish_date: string;
  announcement_type: string;
  is_featured: boolean;
}

export const GleeWorldLanding = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch upcoming events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('*')
          .gte('start_date', new Date().toISOString())
          .eq('is_public', true)
          .order('start_date', { ascending: true })
          .limit(6);

        // Fetch announcements
        const { data: announcementsData } = await supabase
          .from('gw_announcements')
          .select('*')
          .lte('publish_date', new Date().toISOString())
          .or('expire_date.is.null,expire_date.gte.' + new Date().toISOString())
          .order('is_featured', { ascending: false })
          .order('publish_date', { ascending: false })
          .limit(8);

        if (eventsData) setEvents(eventsData);
        if (announcementsData) setAnnouncements(announcementsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Music className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">GleeWorld</h1>
                  <p className="text-sm text-gray-600">Harvard Glee Club</p>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#events" className="text-gray-700 hover:text-blue-600 transition-colors">Events</a>
              <a href="#music" className="text-gray-700 hover:text-blue-600 transition-colors">Music</a>
              <a href="#news" className="text-gray-700 hover:text-blue-600 transition-colors">News</a>
              <a href="#shop" className="text-gray-700 hover:text-blue-600 transition-colors">Shop</a>
            </nav>

            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Welcome back!</span>
                  <Link to="/dashboard">
                    <Button>My Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Experience the 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Magic</span>
              <br />of Harvard Glee Club
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Join our community of passionate musicians as we create unforgettable performances, 
              build lifelong friendships, and carry forward over 150 years of musical excellence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-3">
                  Join Our Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                <Play className="mr-2 h-5 w-5" />
                Listen to Our Music
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">150+</div>
              <div className="text-gray-600">Years of Excellence</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">60+</div>
              <div className="text-gray-600">Active Members</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">25+</div>
              <div className="text-gray-600">Performances Yearly</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">5</div>
              <div className="text-gray-600">Continents Toured</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Tabs */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <Tabs defaultValue="events" className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-4 bg-white/80 backdrop-blur-sm">
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Events</span>
                </TabsTrigger>
                <TabsTrigger value="music" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span className="hidden sm:inline">Music</span>
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">News</span>
                </TabsTrigger>
                <TabsTrigger value="shop" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Shop</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Events Tab */}
            <TabsContent value="events" id="events">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Join us for incredible performances, rehearsals, and community events throughout the year.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : events.length > 0 ? (
                  events.map((event) => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="secondary" className="mb-2">
                            {event.event_type}
                          </Badge>
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {formatDate(event.start_date)} at {formatTime(event.start_date)}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
                    <p className="text-gray-600">Check back soon for new performances and events!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Music Tab */}
            <TabsContent value="music" id="music">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Music Library</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Explore our extensive collection of recordings, sheet music, and musical arrangements.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Classical Repertoire", description: "Traditional choral works and sacred music", icon: Trophy },
                  { title: "Contemporary Pieces", description: "Modern arrangements and popular songs", icon: Mic },
                  { title: "Harvard Songs", description: "University traditions and fight songs", icon: Heart },
                  { title: "International Music", description: "Songs from around the world", icon: Users },
                  { title: "Holiday Collections", description: "Seasonal and celebratory music", icon: Star },
                  { title: "Original Compositions", description: "Works by club members and alumni", icon: Music }
                ].map((category, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm group cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <category.icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {category.description}
                      </CardDescription>
                      <Button variant="ghost" className="mt-3 p-0 h-auto text-blue-600 hover:text-blue-700">
                        Explore Collection <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" id="news">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest News</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Stay updated with the latest announcements, achievements, and stories from our community.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : announcements.length > 0 ? (
                  announcements.map((announcement) => (
                    <Card key={announcement.id} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={announcement.is_featured ? "default" : "secondary"}>
                              {announcement.announcement_type}
                            </Badge>
                            {announcement.is_featured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(announcement.publish_date)}
                          </span>
                        </div>
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 line-clamp-3">
                          {announcement.content}
                        </p>
                        <Button variant="ghost" className="mt-3 p-0 h-auto text-blue-600 hover:text-blue-700">
                          Read More <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No news available</h3>
                    <p className="text-gray-600">Check back soon for updates and announcements!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop" id="shop">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">GleeWorld Shop</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Show your Harvard Glee Club pride with our exclusive merchandise and recordings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: "Club T-Shirts", price: "$25", category: "Apparel" },
                  { name: "Concert Recordings", price: "$15", category: "Music" },
                  { name: "Hoodies & Sweatshirts", price: "$45", category: "Apparel" },
                  { name: "Tote Bags", price: "$20", category: "Accessories" },
                  { name: "Alumni Collection", price: "$35", category: "Apparel" },
                  { name: "Sheet Music", price: "$10", category: "Music" },
                  { name: "Mugs & Drinkware", price: "$18", category: "Accessories" },
                  { name: "Performance DVDs", price: "$20", category: "Music" }
                ].map((item, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm group cursor-pointer">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                        <ShoppingBag className="h-12 w-12 text-blue-600" />
                      </div>
                      <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-lg font-bold text-blue-600">{item.price}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button size="lg" className="text-lg px-8 py-3">
                  View Full Store
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Harvard Glee Club</h3>
              <p className="text-gray-400 text-sm">
                America's oldest college glee club, founded in 1858. Creating musical excellence and lifelong friendships.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <div><a href="#events" className="text-gray-400 hover:text-white transition-colors">Events</a></div>
                <div><a href="#music" className="text-gray-400 hover:text-white transition-colors">Music Library</a></div>
                <div><a href="#news" className="text-gray-400 hover:text-white transition-colors">News</a></div>
                <div><a href="#shop" className="text-gray-400 hover:text-white transition-colors">Shop</a></div>
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
                <div>Harvard University</div>
                <div>Cambridge, MA 02138</div>
                <div>info@gleeworld.org</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Harvard Glee Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};