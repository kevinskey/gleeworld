import { useState } from "react";
import { PublicCalendarViews } from "@/components/calendar/PublicCalendarViews";
import { PublicUpcomingEvents } from "@/components/calendar/PublicUpcomingEvents";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { 
  Music, 
  Calendar, 
  Users, 
  ShoppingBag, 
  Mail, 
  Star,
  Heart,
  Gift,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PublicCalendar = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleNewsletterSignup = () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to sign up for our newsletter.",
        variant: "destructive"
      });
      return;
    }
    
    // Here you would typically send the email to your newsletter service
    toast({
      title: "Newsletter Signup",
      description: "Thank you for signing up! You'll receive our latest updates.",
    });
    setEmail("");
  };

  const merchandise = [
    {
      id: 1,
      name: "Glee Club T-Shirt",
      price: "$25",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
      description: "Premium cotton with official Spelman Glee Club logo"
    },
    {
      id: 2,
      name: "Concert Hoodie",
      price: "$45",
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&h=300&fit=crop",
      description: "Cozy hoodie perfect for concerts and events"
    },
    {
      id: 3,
      name: "Music Note Mug",
      price: "$15",
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=300&fit=crop",
      description: "Ceramic mug with elegant musical design"
    },
    {
      id: 4,
      name: "Tote Bag",
      price: "$20",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop",
      description: "Eco-friendly canvas bag with Glee World branding"
    }
  ];

  const sections = [
    {
      id: 'hero',
      content: (
        <Card className="overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <h2 className="text-3xl sm:text-5xl font-bold text-gray-900">Join the GleeWorld Community</h2>
              <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
            </div>
            <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto">
              Experience the magic of Spelman College Glee Club! Stay connected with all our performances, 
              exclusive content, and be part of our growing community of music lovers.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/auth?role=fan">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Become a Fan
                </Button>
              </Link>
              <Link to="/shop">
                <Button size="lg" variant="outline" className="border-gray-400 text-gray-900 hover:bg-gray-100">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Merchandise
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'events',
      content: (
        <Card className="p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-primary animate-pulse" />
              <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold text-gray-900">Upcoming Events</h2>
              <Music className="h-8 w-8 sm:h-10 sm:w-10 text-secondary animate-pulse" />
            </div>
            <p className="text-lg text-gray-700">
              Don't miss any of our amazing performances and events
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <PublicCalendarViews />
            </div>
            
            <div className="order-1 lg:order-2">
              <PublicUpcomingEvents limit={8} showHeader={false} />
            </div>
          </div>
        </Card>
      )
    },
    {
      id: 'merchandise',
      content: (
        <Card className="p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <ShoppingBag className="h-8 w-8 text-primary animate-pulse" />
              <h2 className="text-3xl sm:text-5xl font-bold text-gray-900">Official Merchandise</h2>
              <Gift className="h-8 w-8 text-secondary animate-pulse" />
            </div>
            <p className="text-lg text-gray-700">
              Show your Glee Club pride with our exclusive merchandise
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {merchandise.map((item) => (
              <Card key={item.id} className="group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/20">
                <div className="aspect-square overflow-hidden rounded-t-lg">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-lg font-bold">{item.price}</Badge>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/shop">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                View All Merchandise
              </Button>
            </Link>
          </div>
        </Card>
      )
    },
    {
      id: 'newsletter',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Mail className="h-8 w-8 text-primary animate-pulse" />
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Stay in the Loop
                </CardTitle>
              </div>
              <p className="text-gray-700">
                Get exclusive updates, behind-the-scenes content, and early access to tickets
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/80 backdrop-blur-md border-gray-300 text-gray-900 placeholder:text-gray-600"
                />
                <Button 
                  onClick={handleNewsletterSignup}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Subscribe to Newsletter
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Heart className="h-8 w-8 text-secondary animate-pulse" />
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Join as a Fan
                </CardTitle>
              </div>
              <p className="text-gray-700">
                Become an official fan and unlock exclusive perks and content
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center p-3 bg-white/20 rounded-lg">
                    <Star className="h-6 w-6 text-primary mb-1" />
                    <span className="text-xs font-medium text-gray-900">Exclusive Content</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/20 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary mb-1" />
                    <span className="text-xs font-medium text-gray-900">Early Access</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/20 rounded-lg">
                    <Gift className="h-6 w-6 text-primary mb-1" />
                    <span className="text-xs font-medium text-gray-900">Fan Perks</span>
                  </div>
                </div>
                <Link to="/auth?role=fan">
                  <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    Register as Fan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  if (isMobile) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Carousel className="w-full" opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {sections.map((section) => (
                <CarouselItem key={section.id} className="min-h-screen flex items-center">
                  <div className="w-full">
                    {section.content}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 space-y-12">
        {sections.map((section) => section.content)}
      </div>
    </PublicLayout>
  );
};

export default PublicCalendar;