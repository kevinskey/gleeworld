import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Bell, Calendar, Heart, Users, BookOpen, Trophy, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

interface AlumnaeStory {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  graduation_year?: number;
  created_at: string;
  user_profile?: {
    full_name: string;
    headshot_url?: string;
  };
}

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  user_profile?: {
    full_name: string;
  };
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  location?: string;
  description?: string;
}

export default function AlumnaeLanding() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [stories, setStories] = useState<AlumnaeStory[]>([]);
  const [bulletinPosts, setBulletinPosts] = useState<BulletinPost[]>([]);
  const [reunionEvents, setReunionEvents] = useState<Event[]>([]);
  const [alumnaeHeadshots, setAlumnaeHeadshots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch alumnae stories
        const { data: storiesData } = await supabase
          .from('alumnae_stories')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(6);

        // Fetch bulletin posts
        const { data: bulletinData } = await supabase
          .from('bulletin_posts')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(8);

        // Fetch reunion events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('*')
          .contains('tags', ['reunion'])
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(3);

        // Fetch alumnae headshots for hero collage
        const { data: headshotsData } = await supabase
          .from('gw_profiles')
          .select('headshot_url')
          .eq('role', 'alumna')
          .not('headshot_url', 'is', null)
          .limit(12);

        setStories(storiesData || []);
        setBulletinPosts(bulletinData || []);
        setReunionEvents(eventsData || []);
        setAlumnaeHeadshots(headshotsData?.map(h => h.headshot_url).filter(Boolean) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        {/* Hero Section: "Faces of the Legacy" */}
        <section className="relative h-96 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-1 opacity-30">
            {alumnaeHeadshots.slice(0, 24).map((headshot, index) => (
              <div key={index} className="relative overflow-hidden">
                <img 
                  src={headshot} 
                  alt="Alumna" 
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80"></div>
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
            <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
              Once a Glee Club Woman,<br />
              <span className="text-accent">Always a Voice of the Legacy</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl">
              Welcome back, {userProfile?.display_name}. Your voice continues to echo through the halls of Spelman.
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-accent">
              <Users className="mr-2 h-5 w-5" />
              Update My Profile
            </Button>
          </div>
        </section>

        <div className="container mx-auto px-6 py-12 space-y-12">
          {/* Notifications Panel */}
          <Card className="border-l-4 border-l-primary shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Bell className="h-5 w-5" />
                Alumnae Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                <Calendar className="h-4 w-4 text-accent" />
                <span>Homecoming 2024 RSVP deadline approaching - respond by October 1st</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <span>New mentoring match available - Class of 2024 soprano seeking guidance</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>New archival photos from 1985 Spring Concert added to Memory Wall</span>
              </div>
            </CardContent>
          </Card>

          {/* Grid Layout for Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Bulletin Board */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary font-serif">
                    Alumnae Bulletin Board
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="reunion">Reunion</TabsTrigger>
                      <TabsTrigger value="mentoring">Mentoring</TabsTrigger>
                      <TabsTrigger value="memories">Memories</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="space-y-4 mt-6">
                      {bulletinPosts.slice(0, 4).map((post) => (
                        <div key={post.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {post.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(post.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <h4 className="font-semibold text-primary mb-1">{post.title}</h4>
                          <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            By Anonymous
                          </p>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="reunion">
                      <p className="text-muted-foreground">Reunion-specific posts will appear here.</p>
                    </TabsContent>
                    <TabsContent value="mentoring">
                      <p className="text-muted-foreground">Mentoring-related posts will appear here.</p>
                    </TabsContent>
                    <TabsContent value="memories">
                      <p className="text-muted-foreground">Memory posts will appear here.</p>
                    </TabsContent>
                  </Tabs>
                  <Button variant="outline" className="w-full mt-6">
                    Visit Legacy Lounge
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Reunion Events */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    Upcoming Reunions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reunionEvents.length > 0 ? reunionEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-l-accent pl-4">
                      <h4 className="font-semibold">{event.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'MMM d, yyyy')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      <Button size="sm" className="mt-2" 
                        variant={userProfile?.reunion_rsvp ? "outline" : "default"}>
                        {userProfile?.reunion_rsvp ? "RSVP'd ✓" : "RSVP Now"}
                      </Button>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">No upcoming reunion events</p>
                  )}
                </CardContent>
              </Card>

              {/* Mentor Circle */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Heart className="h-5 w-5" />
                    Mentor Circle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile?.mentor_opt_in ? (
                    <div className="text-center p-4 bg-accent/10 rounded-lg">
                      <Trophy className="h-8 w-8 mx-auto text-accent mb-2" />
                      <p className="font-semibold text-accent">You're Currently a Mentor</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Thank you for giving back to our Glee Club family
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Share your wisdom with current Spelman Glee Club members
                      </p>
                      <Button className="w-full">
                        Join Mentor Circle
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Memory Wall */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-primary font-serif">
                Memory Wall & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => (
                  <div key={story.id} className="group cursor-pointer">
                    <div className="relative overflow-hidden rounded-lg mb-3">
                      {story.image_url ? (
                        <img 
                          src={story.image_url} 
                          alt={story.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-primary mb-1">{story.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                      {story.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Anonymous</span>
                      {story.graduation_year && (
                        <span>Class of {story.graduation_year}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-6">
                <BookOpen className="mr-2 h-4 w-4" />
                Add My Story
              </Button>
            </CardContent>
          </Card>

          {/* Support & Shop Section */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-serif text-primary mb-4">
                    Support Our Legacy
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Help current Glee Club members achieve their dreams through scholarship funding and performance opportunities.
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">
                    Sponsor a Student
                  </Button>
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-primary mb-4">
                    Glee Club Shop
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Show your Spelman pride with exclusive alumnae merchandise and commemorative items.
                  </p>
                  <Button variant="outline">
                    Shop Now
                    {userProfile?.mentor_opt_in && (
                      <Badge className="ml-2 bg-accent">Supporter Discount</Badge>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
}