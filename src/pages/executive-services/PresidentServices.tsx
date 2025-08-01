import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Crown, 
  Calendar, 
  Users, 
  MessageCircle,
  FileText,
  Star
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string | null;
}

const PresidentServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [president, setPresident] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresidentInfo = async () => {
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select(`
          position,
          user_id,
          gw_profiles(
            first_name,
            last_name,
            full_name,
            user_id,
            bio
          )
        `)
        .eq('position', 'president')
        .eq('is_active', true)
        .single();

      if (data && !error && data.gw_profiles) {
        const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
        const presidentData = {
          position: data.position,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          user_id: profile.user_id,
          bio: profile.bio
        } as ExecutiveBoardMember;
        setPresident(presidentData);

        // Fetch avatar
        const { data: avatarData } = await supabase.storage
          .from('user-files')
          .list(`${presidentData.user_id}/avatars`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (avatarData && avatarData.length > 0) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(`${presidentData.user_id}/avatars/${avatarData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchPresidentInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="President Services"
          description="Executive leadership and organizational oversight"
          backTo="/executive-services"
        />

        {/* President Profile */}
        {president && (
          <Card className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={president.full_name} />
                  <AvatarFallback className="text-2xl bg-white/20 text-white">
                    {president.first_name?.[0]}{president.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-6 w-6" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      President
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{president.full_name}</h2>
                  <p className="text-white/80 mt-2">
                    Executive Leader of the Spelman College Glee Club
                  </p>
                </div>
              </div>
            </CardHeader>
            {president.bio && (
              <CardContent>
                <p className="text-white/90">{president.bio}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">75+</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-muted-foreground">Events This Year</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Active Initiatives</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">100+</div>
              <div className="text-sm text-muted-foreground">Years of Excellence</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="leadership" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="leadership" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Executive Oversight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Board Member Directory
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Executive Reports
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Strategic Planning
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    All-Hands Announcements
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Alumni Outreach
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Public Relations
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Executive Board Meetings
                </CardTitle>
                <CardDescription>
                  Schedule and manage board meetings and member assemblies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <Calendar className="h-6 w-6 mb-2" />
                    Schedule Board Meeting
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Users className="h-6 w-6 mb-2" />
                    All-Hands Assembly
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <FileText className="h-6 w-6 mb-2" />
                    Meeting Minutes
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <MessageCircle className="h-6 w-6 mb-2" />
                    Action Items Tracker
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="initiatives" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Strategic Initiatives
                </CardTitle>
                <CardDescription>
                  Lead and oversee major club initiatives and projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: "Centennial Celebration Planning", status: "In Progress", priority: "High" },
                    { title: "Alumni Network Expansion", status: "Planning", priority: "Medium" },
                    { title: "Community Outreach Program", status: "Active", priority: "High" },
                    { title: "Digital Archive Project", status: "Review", priority: "Low" },
                  ].map((initiative, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{initiative.title}</h4>
                        <p className="text-sm text-muted-foreground">Status: {initiative.status}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={initiative.priority === "High" ? "default" : initiative.priority === "Medium" ? "secondary" : "outline"}>
                          {initiative.priority}
                        </Badge>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact the President
                </CardTitle>
                <CardDescription>
                  Reach out for leadership matters and strategic discussions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Office Hours</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monday - Wednesday: 2:00 PM - 4:00 PM</p>
                      <p className="text-sm text-muted-foreground">Friday: 1:00 PM - 3:00 PM</p>
                      <p className="text-sm text-muted-foreground">Location: Glee Club Office</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Proposal
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PresidentServices;