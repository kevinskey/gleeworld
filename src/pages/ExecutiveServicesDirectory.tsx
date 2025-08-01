import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  DollarSign, 
  Bus, 
  Megaphone,
  Users,
  Calendar,
  FileText,
  Phone,
  MessageCircle,
  Crown,
  Gavel,
  Music
} from "lucide-react";

const ExecutiveServicesDirectory = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">Please log in to access Executive Services.</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (!profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Restricted</h1>
          <p className="text-muted-foreground">This page is only accessible to Glee Club members.</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const executiveServices = [
    {
      title: "President Services",
      description: "Leadership guidance, organizational oversight, and strategic planning",
      icon: Crown,
      path: "/executive-services/president",
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      services: ["Leadership Guidance", "Strategic Planning", "Member Support", "Organization Oversight"]
    },
    {
      title: "Chaplain Services",
      description: "Spiritual care, devotionals, wellness support, and prayer requests",
      icon: MessageCircle,
      path: "/executive-services/chaplain",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      services: ["Spiritual Care", "Devotionals", "Wellness Support", "Prayer Requests"]
    },
    {
      title: "Student Conductor Services",
      description: "Musical leadership, rehearsal management, and performance preparation",
      icon: Music,
      path: "/executive-services/student-conductor",
      color: "text-red-500",
      bgColor: "bg-red-50",
      services: ["Rehearsal Management", "Music Library", "Sectionals", "Development Programs"]
    },
    {
      title: "Assistant Chaplain Services",
      description: "Supporting spiritual care and wellness initiatives",
      icon: Users,
      path: "/executive-services/assistant-chaplain",
      color: "text-teal-500",
      bgColor: "bg-teal-50",
      services: ["Prayer Support", "Wellness Programs", "Spiritual Guidance", "Member Care"]
    },
    {
      title: "Setup Crew Manager Services",
      description: "Event logistics, equipment management, and venue coordination",
      icon: Calendar,
      path: "/executive-services/setup-crew-manager",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      services: ["Event Setup", "Equipment Management", "Venue Coordination", "Logistics Planning"]
    },
    {
      title: "Librarian Services",
      description: "Access music library, request scores, and manage musical resources",
      icon: BookOpen,
      path: "/executive-services/librarian",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      services: ["Music Library Search", "Score Requests", "Download History", "Direct Contact"]
    },
    {
      title: "Treasurer Services", 
      description: "Financial management, expense reporting, and budget tracking",
      icon: DollarSign,
      path: "/executive-services/treasurer",
      color: "text-green-500",
      bgColor: "bg-green-50",
      services: ["Budget Overview", "Expense Reporting", "Payment Requests", "Financial Assistance"]
    },
    {
      title: "Tour Manager Services",
      description: "Travel coordination, logistics, and tour information",
      icon: Bus,
      path: "/executive-services/tour-manager",
      color: "text-purple-500", 
      bgColor: "bg-purple-50",
      services: ["Upcoming Tours", "Travel Information", "Packing Lists", "Emergency Contacts"]
    },
    {
      title: "PR Coordinator Services",
      description: "Social media, event promotion, and public relations",
      icon: Megaphone,
      path: "/executive-services/pr-coordinator",
      color: "text-pink-500",
      bgColor: "bg-pink-50", 
      services: ["Social Media", "Event Promotion", "Media Requests", "Photography"]
    }
  ];

  const contactExecutives = [
    { position: "President", name: "Maya Johnson", email: "president@spelman.edu", icon: Crown },
    { position: "Vice President", name: "Zara Davis", email: "vicepresident@spelman.edu", icon: Gavel },
    { position: "Secretary", name: "Amara Wilson", email: "secretary@spelman.edu", icon: FileText },
    { position: "Music Director", name: "Dr. Patricia Smith", email: "musicdirector@spelman.edu", icon: Music },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Executive Board Services</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Access services and connect with executive board members for all your Glee Club needs
          </p>
          <Badge variant="secondary" className="text-sm">
            Member Access Only
          </Badge>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {executiveServices.map((service, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${service.bgColor}`}>
                    <service.icon className={`h-6 w-6 ${service.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription className="mt-2">{service.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {service.services.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      {item}
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(service.path)}
                >
                  Access {service.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Executive Board Contact Directory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Executive Board Directory
            </CardTitle>
            <CardDescription>
              Direct contact information for all executive board members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contactExecutives.map((exec, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <exec.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{exec.position}</h4>
                      <p className="text-sm text-muted-foreground">{exec.name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                      <MessageCircle className="h-3 w-3 mr-2" />
                      Send Message
                    </Button>
                    <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                      <Calendar className="h-3 w-3 mr-2" />
                      Schedule Meeting
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common requests and frequently used services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-16 flex-col">
                <MessageCircle className="h-5 w-5 mb-2" />
                Submit General Inquiry
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <Calendar className="h-5 w-5 mb-2" />
                View Upcoming Events
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <FileText className="h-5 w-5 mb-2" />
                Access Member Resources
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Frequently Asked Questions</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Q:</strong> How do I request new music for our library?</p>
                  <p className="text-muted-foreground">A: Use the Librarian Services page to submit music requests.</p>
                  
                  <p><strong>Q:</strong> When are expense reimbursements processed?</p>
                  <p className="text-muted-foreground">A: Check with Treasurer Services for current processing times.</p>
                  
                  <p><strong>Q:</strong> How can I get my event promoted on social media?</p>
                  <p className="text-muted-foreground">A: Submit promotion requests through PR Coordinator Services.</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Emergency Contacts</h4>
                <div className="space-y-2 text-sm">
                  <p><strong><a href="https://www.spelman.edu/student-life/public-safety/contact-public-safety.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Campus Public Safety</a>:</strong> 404-525-6401</p>
                  <p><strong>Glee Club Emergency Line:</strong> (404) 270-GLEE</p>
                  <p><strong>Director Emergency:</strong> 470-622-1392</p>
                </div>
                <Button size="sm" variant="destructive" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Emergency Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveServicesDirectory;