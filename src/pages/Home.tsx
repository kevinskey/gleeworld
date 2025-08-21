
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Music, Calendar, Users, BookOpen, ShoppingBag, Phone } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">GleeWorld</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/about" className="text-foreground hover:text-primary transition-colors">About</Link>
              <Link to="/events" className="text-foreground hover:text-primary transition-colors">Events</Link>
              <Link to="/join" className="text-foreground hover:text-primary transition-colors">Join</Link>
              <Link to="/shop" className="text-foreground hover:text-primary transition-colors">Shop</Link>
              <Link to="/contact" className="text-foreground hover:text-primary transition-colors">Contact</Link>
              <Button asChild>
                <Link to="/app">Member Portal</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-primary">
              Welcome to GleeWorld
            </h1>
            <p className="text-xl text-muted-foreground">
              The official digital platform of the Spelman College Glee Club, celebrating 100+ years of musical excellence. 
              Our motto: "To Amaze and Inspire."
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/app">Enter Member Portal</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground">Comprehensive tools for students, alumnae, fans, and administrators</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Music className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Music Studio</CardTitle>
                <CardDescription>
                  Record, archive, and share your musical journey with our integrated music studio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Events & Tours</CardTitle>
                <CardDescription>
                  Stay updated with concerts, rehearsals, and tour information
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Community</CardTitle>
                <CardDescription>
                  Connect with fellow members, alumnae, and the broader Glee Club community
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Educational Resources</CardTitle>
                <CardDescription>
                  Access curated resources on Black music, music theory, and AI tools
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <ShoppingBag className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Merchandise</CardTitle>
                <CardDescription>
                  Shop official Glee Club merchandise and concert memorabilia
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Phone className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Office Hours</CardTitle>
                <CardDescription>
                  Book appointments and connect with leadership for guidance and support
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to Join Our Legacy?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're a prospective member, returning alumna, or dedicated fan, 
            GleeWorld has something for everyone in our musical family.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/join">Join the Glee Club</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/events">View Upcoming Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">GleeWorld</span>
              </div>
              <p className="text-muted-foreground">
                Celebrating 100+ years of musical excellence at Spelman College.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors">About</Link>
                <Link to="/events" className="block text-muted-foreground hover:text-primary transition-colors">Events</Link>
                <Link to="/join" className="block text-muted-foreground hover:text-primary transition-colors">Join</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <div className="space-y-2">
                <Link to="/shop" className="block text-muted-foreground hover:text-primary transition-colors">Shop</Link>
                <Link to="/booking" className="block text-muted-foreground hover:text-primary transition-colors">Office Hours</Link>
                <Link to="/appointments" className="block text-muted-foreground hover:text-primary transition-colors">Appointments</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2">
                <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
                <p className="text-muted-foreground">Spelman College</p>
                <p className="text-muted-foreground">Atlanta, GA</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Spelman College Glee Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
