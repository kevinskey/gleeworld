import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PublicUpcomingEvents } from '@/components/calendar/PublicUpcomingEvents';
import { FeaturedProducts } from '@/components/products/FeaturedProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import historicBackground from '@/assets/historic-glee-background.jpg';
import { 
  Music, 
  Users, 
  Calendar, 
  Award,
  ArrowRight,
  Star,
  Heart,
  ShoppingBag
} from 'lucide-react';

const LandingPage = () => {
  const isMobile = useIsMobile();

  const sections = [
    {
      id: 'hero',
      content: (
        <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
          <div className="container mx-auto text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="text-primary font-medium">
                Celebrating 100+ Years of Excellence
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Spelman College Glee Club
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                "To Amaze and Inspire" through the power of music, unity, and cultural uplift
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="group">
                Explore Our Legacy
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="group">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Shop Merchandise
              </Button>
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'stats',
      content: (
        <section className="py-16 px-4 border-b">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Music, value: "100+", label: "Years of Excellence" },
                { icon: Users, value: "500+", label: "Alumni Network" },
                { icon: Calendar, value: "50+", label: "Annual Performances" },
                { icon: Award, value: "25+", label: "Awards & Honors" }
              ].map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'events',
      content: (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <PublicUpcomingEvents limit={6} showHeader={true} />
          </div>
        </section>
      )
    },
    {
      id: 'products',
      content: (
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <FeaturedProducts limit={8} />
          </div>
        </section>
      )
    },
    {
      id: 'history',
      content: (
        <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-background">
          <div className="container mx-auto">
            <div className="text-center space-y-8 mb-16">
              <Badge variant="outline" className="text-primary">
                Our Historic Legacy
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Over a Century of Musical Excellence
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Founded in 1924, the Spelman College Glee Club has been the heartbeat of musical tradition 
                at Spelman College, carrying forward the vision of our founder Doc Johnson.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  year: "1924",
                  title: "Foundation",
                  description: "The Spelman College Glee Club was founded with Doc Johnson's vision to 'amaze and inspire' through music."
                },
                {
                  year: "1930s",
                  title: "Early Recognition", 
                  description: "Gained national recognition for preserving and performing African American spirituals and classical music."
                },
                {
                  year: "1950s",
                  title: "Cultural Ambassador",
                  description: "Became cultural ambassadors, touring nationally and representing the excellence of Spelman College."
                },
                {
                  year: "1970s",
                  title: "Civil Rights Era",
                  description: "Played a vital role during the Civil Rights Movement, using music as a powerful voice for change."
                },
                {
                  year: "1990s",
                  title: "International Stage",
                  description: "Expanded to international performances, sharing African American musical heritage globally."
                },
                {
                  year: "Today",
                  title: "Digital Innovation",
                  description: "Embracing technology while maintaining our core mission of musical excellence and cultural preservation."
                }
              ].map((milestone, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                        {milestone.year}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {milestone.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {milestone.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16 text-center">
              <div className="bg-primary/10 rounded-2xl p-8 space-y-4">
                <div className="text-primary text-2xl font-bold">
                  "To Amaze and Inspire"
                </div>
                <p className="text-muted-foreground italic max-w-2xl mx-auto">
                  This motto, established by our founder Doc Johnson, continues to guide every note we sing, 
                  every performance we give, and every life we touch through the power of music.
                </p>
              </div>
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'about',
      content: (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Badge variant="outline" className="text-primary">
                    Our Mission
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold">
                    A Legacy of Musical Excellence
                  </h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  For over a century, the Spelman College Glee Club has been a beacon of musical excellence, 
                  cultural pride, and sisterhood. We continue Doc Johnson's vision to "amaze and inspire" 
                  through the transformative power of music.
                </p>
                <div className="space-y-4">
                  {[
                    "Preserving African American musical traditions",
                    "Fostering leadership and sisterhood",
                    "Inspiring future generations of musicians"
                  ].map((point, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
                <Button className="group">
                  Learn Our Story
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              
              <div className="relative">
                <Card className="overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Music className="h-24 w-24 text-primary/40" />
                  </div>
                </Card>
                <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground rounded-full p-3">
                  <Star className="h-6 w-6 fill-current" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'testimonials',
      content: (
        <section className="py-20 px-4 bg-primary/5">
          <div className="container mx-auto text-center space-y-12">
            <div className="space-y-2">
              <Badge variant="secondary" className="text-primary">
                What Our Community Says
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Voices of Inspiration
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "The Glee Club taught me the power of unity through music. It's where I found my voice.",
                  author: "Class of 2018",
                  role: "Alumna"
                },
                {
                  quote: "Every performance is a celebration of our heritage and a gift to our community.",
                  author: "Current Member",
                  role: "Soprano Section"
                },
                {
                  quote: "The sisterhood and musical excellence continue to inspire generations.",
                  author: "Class of 1995",
                  role: "Alumni Council"
                }
              ].map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <CardContent className="space-y-4">
                    <div className="text-primary">
                      <Heart className="h-6 w-6 mx-auto" />
                    </div>
                    <blockquote className="text-muted-foreground italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="text-sm">
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'cta',
      content: (
        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                Join Our Musical Legacy
              </h2>
              <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Whether you're interested in joining our sisterhood, attending our performances, 
                or supporting our mission, there's a place for you in the Glee Club family.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="group">
                Join the Glee Club
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                View Upcoming Events
              </Button>
            </div>
          </div>
        </section>
      )
    }
  ];

  if (isMobile) {
    return (
      <UniversalLayout containerized={false}>
        <div 
          className="relative bg-cover bg-right bg-no-repeat min-h-screen"
          style={{ backgroundImage: `url(${historicBackground})` }}
        >
          <div className="absolute inset-0 bg-background/40"></div>
          <div className="relative z-10">
            <Carousel className="w-full" opts={{ align: "start", loop: true }}>
              <CarouselContent>
                {sections.map((section) => (
                  <CarouselItem key={section.id} className="min-h-screen">
                    {section.content}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout containerized={false}>
      <div 
        className="relative bg-cover bg-right bg-no-repeat min-h-screen"
        style={{ backgroundImage: `url(${historicBackground})` }}
      >
        <div className="absolute inset-0 bg-background/40"></div>
        <div className="relative z-10">
          {sections.map((section) => section.content)}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default LandingPage;