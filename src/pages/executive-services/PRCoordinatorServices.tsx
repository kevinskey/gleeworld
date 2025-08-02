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
  Megaphone, 
  Users, 
  Calendar, 
  Camera, 
  Share2,
  Instagram,
  MessageSquare,
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

const PRCoordinatorServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();
  const [prCoordinator, setPRCoordinator] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPRCoordinator = async () => {
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
          .eq('position', 'pr_coordinator')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
          const prCoordinatorData = {
            position: data.position,
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            user_id: profile.user_id,
            bio: profile.bio
          } as ExecutiveBoardMember;
          setPRCoordinator(prCoordinatorData);

          // Fetch avatar
          const { data: avatarData } = await supabase.storage
            .from('user-files')
            .list(`${prCoordinatorData.user_id}/avatars`, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (avatarData && avatarData.length > 0) {
            const { data: urlData } = supabase.storage
              .from('user-files')
              .getPublicUrl(`${prCoordinatorData.user_id}/avatars/${avatarData[0].name}`);
            setAvatarUrl(urlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching PR coordinator data:', error);
      }
    };

    fetchPRCoordinator();
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
          title="PR Coordinator Services"
          description="Social media, event promotion, and public relations"
          backTo="/executive-services"
        />

        {/* PR Coordinator Profile Card */}
        {prCoordinator && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="PR Coordinator" className="w-full h-full object-cover" />
                  ) : (
                    <Megaphone className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">{prCoordinator.full_name}</CardTitle>
                  <CardDescription className="text-lg">PR Coordinator</CardDescription>
                </div>
              </div>
              {prCoordinator.bio && (
                <p className="text-muted-foreground mt-4">{prCoordinator.bio}</p>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Main Services */}
        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="promotion">Event Promotion</TabsTrigger>
            <TabsTrigger value="media">Media Relations</TabsTrigger>
            <TabsTrigger value="contact">Contact PR</TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Social Media Management
                </CardTitle>
                <CardDescription>
                  Manage Glee Club social media presence and engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16 flex-col" onClick={() => navigate('/pr-hub')}>
                    <Instagram className="h-5 w-5 mb-2" />
                    Social Media Hub
                  </Button>
                  <Button className="h-16 flex-col" onClick={() => navigate('/admin/announcements/new')}>
                    <MessageSquare className="h-5 w-5 mb-2" />
                    Send Announcements
                  </Button>
                  <Button className="h-16 flex-col" onClick={() => navigate('/press-kit')}>
                    <Camera className="h-5 w-5 mb-2" />
                    Press Kit
                  </Button>
                  <Button className="h-16 flex-col">
                    <Share2 className="h-5 w-5 mb-2" />
                    Content Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Event Promotion & Marketing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Event promotion tools coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Media Relations & Press
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Media management tools coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact the PR Coordinator</CardTitle>
                <CardDescription>
                  Get in touch for event promotion, media requests, or social media support
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
                  <Megaphone className="mr-2 h-4 w-4" />
                  Promotion Request
                </Button>
                <Button variant="outline" className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Photo Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PRCoordinatorServices;