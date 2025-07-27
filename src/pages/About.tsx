import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAssist } from "@/components/shared/AIAssist";
import { Link } from "react-router-dom";
import { useCurrentUserAvatar } from "@/hooks/useCurrentUserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Music, 
  Users, 
  Calendar,
  Award,
  Heart,
  Star,
  MapPin,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  GraduationCap,
  Mic,
  BookOpen
} from "lucide-react";

export default function About() {
  const { user } = useAuth();
  const { data: userAvatar } = useCurrentUserAvatar();

  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section id="about-hero" className="relative h-[80vh] bg-gradient-to-br from-spelman-blue-dark via-spelman-blue-light to-spelman-blue-dark flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-[url('/lovable-uploads/6a86e8cc-1420-4397-8742-983afe6a293f.png')] bg-cover bg-center opacity-60"></div>
          <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-['Bebas_Neue']">Welcome to GleeWorld</h1>
            <p className="text-xl md:text-3xl opacity-90 mb-8 font-light">
              The Digital Home of the Spelman College Glee Club and Beyond
            </p>
            <div className="relative inline-block">
              <AIAssist 
                context="About GleeWorld and Spelman College Glee Club"
                placeholder="What is GleeWorld?"
                className="mt-4"
              />
            </div>
          </div>
        </section>

        {/* Intro Block */}
        <section id="about-intro" className="py-20 px-4 bg-background relative">
          <div className="absolute inset-0 opacity-30"></div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8 font-['Bebas_Neue']">More Than Music</h2>
              <div className="max-w-4xl mx-auto space-y-6 text-lg text-foreground leading-relaxed">
                <p>
                  GleeWorld represents the digital evolution of one of America's most prestigious collegiate choirs. 
                  Born from over 100 years of musical excellence at Spelman College, this platform bridges our 
                  storied past with an innovative future.
                </p>
                <p>
                  Here, current members access rehearsal materials and tour logistics, alumnae reconnect with 
                  their musical sisterhood, and fans worldwide experience the magic that makes our choir extraordinary. 
                  GleeWorld is where tradition meets technology, where legacy lives digitally.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="about-features" className="py-20 px-4 bg-background">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-16 font-['Bebas_Neue']">Our Community</h2>
            <div className="grid lg:grid-cols-3 gap-10">
              {/* Current Members */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-spelman-blue-light/10 to-spelman-blue-light/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="text-center pb-6">
                  <div className="w-20 h-20 bg-spelman-blue-light/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-10 h-10 text-spelman-blue-dark" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-4">🎓 Current Members</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-foreground mb-6 leading-relaxed">
                    Access your musical materials, tour information, recording studio, and connect with your sisters. 
                    Your digital headquarters for everything Glee Club.
                  </p>
                  <Link to="/dashboard">
                    <Button className="w-full bg-spelman-blue-dark hover:bg-spelman-blue-light">
                      Member Dashboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Alumnae */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-spelman-blue-light/10 to-spelman-blue-light/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="text-center pb-6">
                  <div className="w-20 h-20 bg-spelman-blue-light/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Heart className="w-10 h-10 text-spelman-blue-dark" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-4">👩🏽‍🎓 Alumnae</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-foreground mb-6 leading-relaxed">
                    Reconnect with your musical legacy, share memories, mentor current members, and stay connected 
                    to the sisterhood that shaped your musical journey.
                  </p>
                  <Link to="/alumnae">
                    <Button className="w-full bg-spelman-blue-dark hover:bg-spelman-blue-light">
                      Alumnae Portal
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Fans & Supporters */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-spelman-blue-light/10 to-spelman-blue-light/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="text-center pb-6">
                  <div className="w-20 h-20 bg-spelman-blue-light/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="w-10 h-10 text-spelman-blue-dark" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-4">🌍 Fans & Supporters</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-foreground mb-6 leading-relaxed">
                    Experience exclusive performances, purchase official merchandise, and support the next generation 
                    of musical excellence at Spelman College.
                  </p>
                  <Link to="/shop">
                    <Button className="w-full bg-spelman-blue-dark hover:bg-spelman-blue-light">
                      Shop & Support
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Mission Block */}
        <section id="about-mission" className="py-20 px-4 bg-background relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <blockquote className="text-2xl md:text-3xl font-light text-foreground italic leading-relaxed max-w-4xl mx-auto mb-12">
                "GleeWorld is not just about music. It's about preserving a legacy, building digital community, 
                enhancing artistic and academic rigor, and ensuring that the sacred tradition of the Spelman 
                Glee Club continues to amaze and inspire for generations to come."
              </blockquote>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-16">
                <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl">
                  <img 
                    src={userAvatar?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face"}
                    alt={userAvatar?.full_name || "Dr. Kevin Phillip Johnson"} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{userAvatar?.full_name || "Dr. Kevin Phillip Johnson"}</h3>
                  <p className="text-spelman-blue-dark font-medium text-lg">Artistic Director & Visionary Behind GleeWorld</p>
                  <AIAssist 
                    context="Dr. Kevin Johnson and the Glee Club's digital mission"
                    placeholder="More about the Glee Club's digital mission"
                    className="mt-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why GleeWorld Block */}
        <section id="about-why" className="py-20 px-4 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200')] bg-cover bg-center opacity-10"></div>
          <div className="max-w-6xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 font-['Bebas_Neue']">Why GleeWorld?</h2>
            <div className="text-center">
              <p className="text-xl md:text-2xl leading-relaxed max-w-4xl mx-auto font-light">
                Because the Glee Club is a universe unto itself—a cosmos of voices, dreams, traditions, and 
                possibilities that deserves a digital home as extraordinary as the music we create. In this 
                world, every note matters, every voice belongs, and every moment becomes part of our eternal song.
              </p>
            </div>
          </div>
        </section>

        {/* Quote/Motto Section */}
        <section id="about-quote" className="py-32 px-4 bg-gradient-to-r from-spelman-blue-dark via-spelman-blue-light to-spelman-blue-dark text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="animate-fade-in">
              <h2 className="text-6xl md:text-8xl font-bold mb-8 font-['Bebas_Neue'] tracking-wider">
                "To Amaze and Inspire"
              </h2>
              <p className="text-2xl md:text-3xl font-light opacity-90">
                Online and Onstage
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Footer Block */}
        <section id="about-cta" className="py-20 px-4 bg-background text-center">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8 font-['Bebas_Neue']">Enter Our World</h2>
            <p className="text-xl text-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              Whether you're a first-year member, a Centennial alumna, or a supporter who believes in the power 
              of music, we invite you to enter the world where tradition meets innovation, where voices unite 
              across generations, and where the magic of the Spelman Glee Club lives forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button asChild size="lg" className="bg-spelman-blue-dark hover:bg-spelman-blue-light text-white px-8 py-4 text-lg">
                <Link to="/calendar">
                  <Calendar className="w-5 h-5 mr-2" />
                  Explore GleeWorld
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-spelman-blue-dark text-spelman-blue-dark hover:bg-spelman-blue-dark hover:text-white px-8 py-4 text-lg">
                <Link to="/auth">
                  <Mic className="w-5 h-5 mr-2" />
                  Join Our Legacy
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}