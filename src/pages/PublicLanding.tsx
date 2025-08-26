import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { 
  Music, 
  Calendar, 
  MapPin, 
  Users, 
  Award,
  Heart,
  Sparkles,
  ArrowRight,
  Play,
  Clock,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PublicLanding = () => {
  const navigate = useNavigate();

  const upcomingEvents = [
    {
      id: 1,
      title: "Spring Concert: Voices of Hope",
      date: "March 15, 2025",
      time: "7:00 PM",
      location: "Spelman College Sisters Chapel",
      price: "Free Admission"
    },
    {
      id: 2,
      title: "Community Outreach Performance",
      date: "March 22, 2025", 
      time: "2:00 PM",
      location: "Atlanta Community Center",
      price: "Free"
    },
    {
      id: 3,
      title: "Annual Alumni Reunion Concert",
      date: "April 5, 2025",
      time: "6:00 PM", 
      location: "Spelman College Sisters Chapel",
      price: "$25 General | $15 Students"
    }
  ];

  const featuredContent = [
    {
      title: "Our Legacy",
      description: "Over 100 years of musical excellence and cultural impact",
      icon: Award,
      color: "bg-primary"
    },
    {
      title: "Community Impact", 
      description: "Inspiring and uplifting communities through the power of music",
      icon: Heart,
      color: "bg-destructive"
    },
    {
      title: "Musical Excellence",
      description: "World-class performances that amaze and inspire audiences",
      icon: Music,
      color: "bg-secondary"
    },
    {
      title: "Sisterhood",
      description: "Building lifelong bonds through shared musical passion",
      icon: Users,
      color: "bg-accent"
    }
  ];

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        
        {/* Hero Section */}
        <section className="relative py-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Est. 1906 - Over 100 Years of Excellence
              </Badge>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Spelman College<br />Glee Club
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              The premier women's collegiate choir, dedicated to excellence in performance, 
              cultural preservation, and inspiring communities through the transformative power of music.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg"
                onClick={() => navigate('/auditions')}
              >
                <Music className="w-5 h-5 mr-2" />
                Join Our Sisterhood
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-6 text-lg"
                onClick={() => navigate('/events')}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Upcoming Events
              </Button>
            </div>
          </div>
        </section>

        {/* Motto Section */}
        <section className="py-16 px-6 bg-primary/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              "To Amaze and Inspire"
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our motto reflects our commitment to delivering performances that captivate audiences 
              and inspire positive change in our communities and beyond.
            </p>
          </div>
        </section>

        {/* Featured Content Grid */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Makes Us Special</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover the pillars that have made the Spelman College Glee Club 
                a beacon of musical excellence for over a century.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredContent.map((item, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className={`w-16 h-16 ${item.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="py-20 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Upcoming Performances</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join us for our upcoming concerts and community events. 
                Experience the magic of our voices in person.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <Badge variant="secondary">{event.date}</Badge>
                    </div>
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Star className="w-4 h-4" />
                      <span>{event.price}</span>
                    </div>
                    <Button className="w-full mt-4">
                      Learn More
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Button variant="outline" onClick={() => navigate('/events')}>
                View All Events
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Call to Action Sections */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            
            {/* Join Us */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Become a Glee Club Sister</CardTitle>
                <CardDescription className="text-white/90">
                  Join our prestigious sisterhood and be part of our musical legacy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-white/90">
                  We're always looking for talented, dedicated singers to join our family. 
                  Discover opportunities for growth, sisterhood, and musical excellence.
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => navigate('/auditions')}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Audition Information
                </Button>
              </CardContent>
            </Card>

            {/* Support Us */}
            <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Support Our Mission</CardTitle>
                <CardDescription className="text-white/90">
                  Help us continue our tradition of musical excellence and community impact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-white/90">
                  Your support helps us maintain our high standards, travel for performances, 
                  and provide scholarships for deserving students.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-white text-secondary hover:bg-white hover:text-secondary"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Make a Donation
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6 bg-primary text-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Impact in Numbers</h2>
              <p className="text-lg text-primary-foreground/80">
                Over a century of musical excellence and community engagement.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">100+</div>
                <div className="text-primary-foreground/80">Years of Excellence</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
                <div className="text-primary-foreground/80">Performances</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
                <div className="text-primary-foreground/80">Active Members</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">1000+</div>
                <div className="text-primary-foreground/80">Alumni Network</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </UniversalLayout>
  );
};

export default PublicLanding;