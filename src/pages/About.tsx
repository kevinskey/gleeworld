import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
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
  ArrowRight
} from "lucide-react";

const About = () => {
  const achievements = [
    {
      year: "1924",
      title: "Founded",
      description: "Established as one of the premier collegiate choirs in the nation"
    },
    {
      year: "2000+",
      title: "Performances",
      description: "Countless performances across the United States and internationally"
    },
    {
      year: "100+",
      title: "Active Members",
      description: "Current membership of talented students from diverse backgrounds"
    },
    {
      year: "15+",
      title: "Awards",
      description: "Recognition for excellence in choral performance and community service"
    }
  ];

  const values = [
    {
      icon: Music,
      title: "Musical Excellence",
      description: "We strive for the highest standards in choral performance, constantly pushing the boundaries of vocal artistry."
    },
    {
      icon: Users,
      title: "Sisterhood",
      description: "Building lifelong bonds through shared musical experiences and mutual support."
    },
    {
      icon: Heart,
      title: "Community Service",
      description: "Using our voices to uplift communities and support meaningful causes."
    },
    {
      icon: Star,
      title: "Cultural Heritage",
      description: "Celebrating and preserving African American musical traditions while embracing diverse repertoire."
    }
  ];

  const leadership = [
    {
      name: "Dr. Kevin Johnson",
      role: "Director of Choral Activities",
      bio: "Dr. Johnson brings over 15 years of experience in choral direction and has led the Glee Club to numerous accolades.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face"
    },
    {
      name: "Prof. Maria Williams",
      role: "Assistant Director",
      bio: "Prof. Williams specializes in vocal pedagogy and helps develop each member's individual vocal talents.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332-00?w=300&h=300&fit=crop&crop=face"
    },
    {
      name: "Sarah Mitchell",
      role: "Student President",
      bio: "Senior Music Education major leading the Glee Club with passion and dedication.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face"
    }
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <Badge className="bg-primary/20 text-primary-foreground px-4 py-2 text-lg">
            Est. 1924
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            About the Spelman College Glee Club
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            For nearly a century, the Spelman College Glee Club has been a beacon of musical 
            excellence, sisterhood, and cultural pride. We are more than a choir – we are a 
            family united by our love of music and commitment to excellence.
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="border-primary/20 bg-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-lg text-center leading-relaxed">
              To cultivate musical excellence while fostering sisterhood, academic achievement, 
              and community engagement. We strive to preserve and celebrate our rich cultural 
              heritage while inspiring the next generation of leaders through the transformative 
              power of music.
            </p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">Our Legacy</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <Card key={index} className="text-center border-primary/20 bg-white/5 backdrop-blur-md">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary mb-2">{achievement.year}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{achievement.title}</h3>
                  <p className="text-sm text-gray-300">{achievement.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-primary/20 bg-white/5 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg">
                      <value.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                      <p className="text-gray-300">{value.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Leadership */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">Leadership</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {leadership.map((leader, index) => (
              <Card key={index} className="border-primary/20 bg-white/5 backdrop-blur-md">
                <CardContent className="p-6 text-center">
                  <img
                    src={leader.image}
                    alt={leader.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-lg font-semibold text-white mb-1">{leader.name}</h3>
                  <p className="text-primary mb-3">{leader.role}</p>
                  <p className="text-sm text-gray-300">{leader.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Information */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">Connect With Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/20 bg-white/5 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Visit Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300">
                  <strong>Spelman College</strong><br />
                  350 Spelman Lane SW<br />
                  Atlanta, GA 30314
                </p>
                <p className="text-gray-300">
                  <strong>Rehearsals:</strong><br />
                  Mondays, Wednesdays, Fridays<br />
                  5:00 PM - 6:15 PM
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-white/5 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Get In Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-gray-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    gleeclub@spelman.edu
                  </p>
                  <p className="text-gray-300 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    (404) 270-5200
                  </p>
                  <p className="text-gray-300 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    spelman.edu/academics/programs/music
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Join Our Musical Journey</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Interested in becoming part of our musical family? Explore our upcoming events, 
              learn about auditions, or support our mission.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/public-calendar">
                  View Events <Calendar className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/shop">
                  Support Us <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default About;