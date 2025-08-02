import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { 
  MapPin, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign,
  Plane,
  Hotel,
  Bus,
  Package,
  Phone
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string;
}

const TourManagerServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();
  const [tourManager, setTourManager] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchTourManager = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_executive_board_members')
          .select(`
            position,
            gw_profiles!inner(
              first_name,
              last_name,
              full_name,
              user_id,
              bio
            )
          `)
          .eq('position', 'tour_manager')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
          const tourManagerData = {
            position: data.position,
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            user_id: profile.user_id,
            bio: profile.bio
          } as ExecutiveBoardMember;
          setTourManager(tourManagerData);

          // Fetch avatar
          const { data: avatarData } = await supabase.storage
            .from('user-files')
            .list(`${tourManagerData.user_id}/avatars`, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (avatarData && avatarData.length > 0) {
            const { data: urlData } = supabase.storage
              .from('user-files')
              .getPublicUrl(`${tourManagerData.user_id}/avatars/${avatarData[0].name}`);
            setAvatarUrl(urlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching tour manager data:', error);
      }
    };

    fetchTourManager();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile || !['admin', 'super-admin', 'user'].includes(profile.role)) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="Tour Manager Services"
          description="Travel coordination, logistics, and tour management"
          backTo="/executive-services"
        />

        {/* Tour Manager Profile Card */}
        {tourManager && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Tour Manager" className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">{tourManager.full_name}</CardTitle>
                  <CardDescription className="text-lg">Tour Manager</CardDescription>
                </div>
              </div>
              {tourManager.bio && (
                <p className="text-muted-foreground mt-4">{tourManager.bio}</p>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Tours</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tour Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members Traveling</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="tours" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tours">Tour Management</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="contact">Contact Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="tours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Tour Management & Coordination
                </CardTitle>
                <CardDescription>
                  Plan, organize, and coordinate all tour activities and travel arrangements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16 flex-col" onClick={() => navigate('/tour-planner')}>
                    <Calendar className="h-5 w-5 mb-2" />
                    Tour Planner
                  </Button>
                  <Button className="h-16 flex-col" onClick={() => navigate('/tour-manager')}>
                    <Bus className="h-5 w-5 mb-2" />
                    Transportation
                  </Button>
                  <Button className="h-16 flex-col">
                    <Hotel className="h-5 w-5 mb-2" />
                    Accommodations
                  </Button>
                  <Button className="h-16 flex-col">
                    <Plane className="h-5 w-5 mb-2" />
                    Flight Arrangements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Management
                </CardTitle>
                <CardDescription>
                  Manage performance contracts and venue agreements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/contracts')}>
                    <FileText className="h-6 w-6 mb-2" />
                    <span>View All Contracts</span>
                    <span className="text-xs text-muted-foreground">Performance agreements</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Package className="h-6 w-6 mb-2" />
                    <span>Contract Templates</span>
                    <span className="text-xs text-muted-foreground">Standard agreements</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Travel Logistics & Support
                </CardTitle>
                <CardDescription>
                  Coordinate all aspects of travel arrangements and member support
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Travel Itineraries</h4>
                      <p className="text-sm text-muted-foreground mb-3">Detailed travel schedules and plans</p>
                      <Button size="sm" className="w-full">Access Itineraries</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Packing Lists</h4>
                      <p className="text-sm text-muted-foreground mb-3">What to bring for each tour</p>
                      <Button size="sm" className="w-full">View Packing Lists</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Emergency Contacts</h4>
                      <p className="text-sm text-muted-foreground mb-3">Important contact information</p>
                      <Button size="sm" className="w-full">View Contacts</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Travel Documents</h4>
                      <p className="text-sm text-muted-foreground mb-3">Required forms and documentation</p>
                      <Button size="sm" className="w-full">Access Documents</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tour Budget Management
                </CardTitle>
                <CardDescription>
                  Manage tour budgets, expenses, and financial planning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/budgets')}>
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span>Tour Budgets</span>
                    <span className="text-xs text-muted-foreground">Financial planning</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    <span>Expense Reports</span>
                    <span className="text-xs text-muted-foreground">Track spending</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact the Tour Manager</CardTitle>
                  <CardDescription>
                    Get in touch for travel questions, tour planning, or logistics support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MapPin className="mr-2 h-4 w-4" />
                    Tour Request
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Package className="mr-2 h-4 w-4" />
                    Logistics Support
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Office Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold">Office Hours</h4>
                      <p className="text-sm text-muted-foreground">Monday - Friday: 9 AM - 5 PM</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Response Time</h4>
                      <p className="text-sm text-muted-foreground">Within 24 hours for non-urgent matters</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Emergency Contact</h4>
                      <p className="text-sm text-muted-foreground">Available 24/7 during tours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TourManagerServices;