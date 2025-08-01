import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useArtisticDirectorAvatar } from "@/hooks/useArtisticDirectorAvatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { 
  Gavel, 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Settings,
  DollarSign,
  Star,
  MessageSquare,
  Award
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string;
}

const VicePresidentServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();
  const [vicePresident, setVicePresident] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { data: artisticDirectorData } = useArtisticDirectorAvatar();

  useEffect(() => {
    const fetchVicePresident = async () => {
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
          .eq('position', 'secretary')  // Use secretary for now since vice_president isn't in enum
          .eq('is_active', true)
          .single();

        if (data && !error) {
          const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
          const vpData = {
            position: data.position,
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            user_id: profile.user_id,
            bio: profile.bio
          } as ExecutiveBoardMember;
          setVicePresident(vpData);

          // Fetch avatar
          const { data: avatarData } = await supabase.storage
            .from('user-files')
            .list(`${vpData.user_id}/avatars`, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (avatarData && avatarData.length > 0) {
            const { data: urlData } = supabase.storage
              .from('user-files')
              .getPublicUrl(`${vpData.user_id}/avatars/${avatarData[0].name}`);
            setAvatarUrl(urlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching vice president data:', error);
      }
    };

    fetchVicePresident();
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
          title="Vice President Services"
          description="Supporting leadership and special project coordination"
          backTo="/executive-services"
        />

        {/* Vice President Profile Card */}
        {vicePresident && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Vice President" className="w-full h-full object-cover" />
                  ) : (
                    <Gavel className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">{vicePresident.full_name}</CardTitle>
                  <CardDescription className="text-lg">Vice President</CardDescription>
                </div>
              </div>
              {vicePresident.bio && (
                <p className="text-muted-foreground mt-4">{vicePresident.bio}</p>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Special initiatives</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Committee Assignments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Leadership roles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Event Coordination</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Events managed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Support</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95%</div>
              <p className="text-xs text-muted-foreground">Satisfaction rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="leadership" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leadership">Leadership Support</TabsTrigger>
            <TabsTrigger value="projects">Special Projects</TabsTrigger>
            <TabsTrigger value="coordination">Event Coordination</TabsTrigger>
            <TabsTrigger value="contact">Contact VP</TabsTrigger>
          </TabsList>

          <TabsContent value="leadership" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Leadership Support & Backup
                </CardTitle>
                <CardDescription>
                  Supporting the president and providing leadership backup when needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16 flex-col">
                    <Users className="h-5 w-5 mb-2" />
                    Executive Team Coordination
                  </Button>
                  <Button className="h-16 flex-col">
                    <Settings className="h-5 w-5 mb-2" />
                    Strategic Planning Support
                  </Button>
                  <Button className="h-16 flex-col">
                    <TrendingUp className="h-5 w-5 mb-2" />
                    Performance Monitoring
                  </Button>
                  <Button className="h-16 flex-col">
                    <MessageSquare className="h-5 w-5 mb-2" />
                    Leadership Communications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Special Projects & Initiatives
                </CardTitle>
                <CardDescription>
                  Leading special initiatives and cross-functional projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Centennial Celebration Planning</h4>
                    <p className="text-sm text-muted-foreground">Coordinating 100th anniversary events</p>
                    <Badge className="mt-2">In Progress</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Alumni Engagement Initiative</h4>
                    <p className="text-sm text-muted-foreground">Strengthening alumni connections</p>
                    <Badge variant="outline" className="mt-2">Planning</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Digital Transformation Project</h4>
                    <p className="text-sm text-muted-foreground">Modernizing club operations</p>
                    <Badge className="mt-2">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coordination" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Coordination & Management
                </CardTitle>
                <CardDescription>
                  Coordinating special events and supporting major club activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Calendar className="h-6 w-6 mb-2" />
                    <span>Schedule Event Planning</span>
                    <span className="text-xs text-muted-foreground">Coordinate with leadership</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span>Budget Planning Support</span>
                    <span className="text-xs text-muted-foreground">Financial coordination</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    <span>Committee Oversight</span>
                    <span className="text-xs text-muted-foreground">Manage working groups</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    <span>Event Documentation</span>
                    <span className="text-xs text-muted-foreground">Record keeping</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact the Vice President</CardTitle>
                  <CardDescription>
                    Get in touch for leadership support, special projects, or event coordination
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Submit Project Proposal
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Office Hours & Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Regular Office Hours</h4>
                      <p className="text-sm text-muted-foreground">Tuesdays & Thursdays, 2:00 PM - 4:00 PM</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Location</h4>
                      <p className="text-sm text-muted-foreground">Student Center, Leadership Suite</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Response Time</h4>
                      <p className="text-sm text-muted-foreground">Within 24 hours for routine inquiries</p>
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

export default VicePresidentServices;