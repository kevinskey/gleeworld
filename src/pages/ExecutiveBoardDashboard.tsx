import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecutiveBoardDirectory } from "@/components/shared/ExecutiveBoardDirectory";
import { GeneralInquiryDialog } from "@/components/forms/GeneralInquiryDialog";
import { 
  Crown,
  Shield,
  Home,
  Settings,
  Calendar,
  DollarSign,
  MapPin,
  BookOpen,
  FileText,
  Music2,
  Heart,
  Camera,
  MessageSquare,
  BarChart3,
  Shirt,
  Users,
  Bus,
  Megaphone,
  Phone,
  Gavel
} from "lucide-react";

export const ExecutiveBoardDashboard = () => {
  console.log('ExecutiveBoardDashboard: Component started rendering');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    console.log('ExecutiveBoardDashboard: useEffect triggered, user:', user?.id);
    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) {
      setUserRole('guest');
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, error } = await supabase
        .from('gw_profiles')
        .select('exec_board_role, role')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        console.log('ExecutiveBoardDashboard: Profile data found:', profileData);
        const role = profileData.exec_board_role || profileData.role || 'member';
        console.log('ExecutiveBoardDashboard: Setting user role to:', role);
        setUserRole(role);
      } else {
        console.log('ExecutiveBoardDashboard: No profile data found, setting to member');
        setUserRole('member');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('member');
    } finally {
      setLoading(false);
    }
  };

  // Executive services data - same as ExecutiveServicesDirectory
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
      icon: MessageSquare,
      path: "/executive-services/chaplain",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      services: ["Spiritual Care", "Devotionals", "Wellness Support", "Prayer Requests"]
    },
    {
      title: "Student Conductor Services",
      description: "Musical leadership, rehearsal management, and performance preparation",
      icon: Music2,
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

  const getQuickActionsForRole = (role: string) => {
    const commonActions = [
      { name: 'Calendar', path: '/calendar', icon: Calendar },
      { name: 'Handbook', path: '/handbook', icon: BookOpen }
    ];

    switch (role) {
      case 'president':
        return [
          { name: 'Executive Hub', path: '/executive-board', icon: Crown },
          { name: 'Event Planner', path: '/event-planner', icon: Calendar },
          { name: 'Budget Management', path: '/budgets', icon: DollarSign },
          { name: 'Announcements', path: '/admin/announcements/new', icon: MessageSquare }
        ];
      case 'secretary':
        return [
          { name: 'Executive Hub', path: '/executive-board', icon: Crown },
          { name: 'Attendance', path: '/attendance', icon: FileText },
          { name: 'Meeting Minutes', path: '/calendar', icon: Calendar },
          { name: 'Communications', path: '/admin/announcements/new', icon: MessageSquare }
        ];
      case 'treasurer':
        return [
          { name: 'Treasurer Dashboard', path: '/treasurer', icon: DollarSign },
          { name: 'Budget Management', path: '/budgets', icon: DollarSign },
          { name: 'Payments', path: '/payments', icon: DollarSign },
          { name: 'Accounting', path: '/accounting', icon: BarChart3 }
        ];
      case 'tour_manager':
        return [
          { name: 'Tour Manager', path: '/tour-manager', icon: MapPin },
          { name: 'Tour Planner', path: '/tour-planner', icon: MapPin },
          { name: 'Contracts', path: '/contracts', icon: FileText },
          { name: 'Budgets', path: '/budgets', icon: DollarSign }
        ];
      case 'librarian':
        return [
          { name: 'Librarian Dashboard', path: '/librarian', icon: BookOpen },
          { name: 'Music Library', path: '/music-library', icon: Music2 },
          ...commonActions
        ];
      case 'historian':
        return [
          { name: 'Historian Dashboard', path: '/historian', icon: Camera },
          { name: 'Archives', path: '/executive-board', icon: Camera },
          ...commonActions
        ];
      case 'pr_coordinator':
        return [
          { name: 'PR Hub', path: '/pr-hub', icon: MessageSquare },
          { name: 'Announcements', path: '/admin/announcements/new', icon: MessageSquare },
          { name: 'Press Kit', path: '/press-kit', icon: FileText },
          ...commonActions
        ];
      case 'chaplain':
        return [
          { name: 'Chaplain Hub', path: '/chaplain', icon: Heart },
          { name: 'Wellness', path: '/wellness', icon: Heart },
          { name: 'Spiritual Messages', path: '/admin/announcements/new', icon: MessageSquare },
          ...commonActions
        ];
      case 'student_conductor':
        return [
          { name: 'Conductor Dashboard', path: '/student-conductor', icon: Music2 },
          { name: 'Music Library', path: '/music-library', icon: BookOpen },
          { name: 'Attendance', path: '/attendance', icon: FileText },
          { name: 'Performance Suite', path: '/performance', icon: Music2 }
        ];
      case 'wardrobe_manager':
        return [
          { name: 'Wardrobe Hub', path: '/wardrobe', icon: Shirt },
          { name: 'Inventory', path: '/wardrobe', icon: Shirt },
          ...commonActions
        ];
      default:
        // For admins or other roles
        return [
          { name: 'Executive Hub', path: '/executive-board', icon: Crown },
          { name: 'Calendar', path: '/calendar', icon: Calendar },
          { name: 'Budgets', path: '/budgets', icon: DollarSign },
          { name: 'Handbook', path: '/handbook', icon: BookOpen }
        ];
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading Dashboard...</div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">Glee World Hub</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Your role: {userRole}
          </p>
        </div>

        {/* Community Hub */}
        <CommunityHubWidget />

        {/* Executive Board Services Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Executive Board Services</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
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
                    <div className="mt-2 text-muted-foreground text-sm">{service.description}</div>
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
        <ExecutiveBoardDirectory variant="full" />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <div className="text-muted-foreground text-sm">
              Common requests and frequently used services
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GeneralInquiryDialog />
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
                  <p><strong><a href="https://www.spelman.edu/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Spelman College Website</a></strong></p>
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
    </UniversalLayout>
  );
};