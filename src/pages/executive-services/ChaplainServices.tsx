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
  Heart, 
  BookOpen, 
  Calendar, 
  MessageCircle,
  Users,
  Sparkles
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string | null;
}

const ChaplainServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [chaplain, setChaplain] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchChaplainInfo = async () => {
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
        .eq('position', 'chaplain')
        .eq('is_active', true)
        .single();

      if (data && !error) {
        const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
        const chaplainData = {
          position: data.position,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          user_id: profile.user_id,
          bio: profile.bio
        } as ExecutiveBoardMember;
        setChaplain(chaplainData);

        // Fetch avatar
        const { data: avatarData } = await supabase.storage
          .from('user-files')
          .list(`${chaplainData.user_id}/avatars`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (avatarData && avatarData.length > 0) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(`${chaplainData.user_id}/avatars/${avatarData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchChaplainInfo();
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
          title="Chaplain Services"
          description="Spiritual guidance and community wellness support"
          backTo="/executive-services"
        />

        {/* Chaplain Profile */}
        {chaplain && (
          <Card className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={chaplain.full_name} />
                  <AvatarFallback className="text-2xl bg-white/20 text-white">
                    {chaplain.first_name?.[0] || chaplain.full_name?.[0]}{chaplain.last_name?.[0] || chaplain.full_name?.split(' ')?.[1]?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-6 w-6" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Chaplain
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{chaplain.full_name}</h2>
                  <p className="text-white/80 mt-2">
                    Spiritual Leader and Community Care Coordinator
                  </p>
                </div>
              </div>
            </CardHeader>
            {chaplain.bio && (
              <CardContent>
                <p className="text-white/90">{chaplain.bio}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">45</div>
              <div className="text-sm text-muted-foreground">Prayer Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-muted-foreground">Devotionals Shared</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Spiritual Circles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">25</div>
              <div className="text-sm text-muted-foreground">Wellness Sessions</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="spiritual-care" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="spiritual-care">Spiritual Care</TabsTrigger>
            <TabsTrigger value="devotionals">Devotionals</TabsTrigger>
            <TabsTrigger value="wellness">Wellness</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="spiritual-care" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Prayer & Reflection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Heart className="h-4 w-4 mr-2" />
                    Submit Prayer Request
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Prayer Circle Sign-up
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Meditation Sessions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community Outreach
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Community Service
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Heart className="h-4 w-4 mr-2" />
                    Volunteer Opportunities
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Service Projects
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devotionals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Daily Devotionals & Reflections
                </CardTitle>
                <CardDescription>
                  Access spiritual guidance and daily inspirations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <BookOpen className="h-6 w-6 mb-2" />
                    Today's Devotional
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Sparkles className="h-6 w-6 mb-2" />
                    Weekly Reflection
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Heart className="h-6 w-6 mb-2" />
                    Scripture Study
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Users className="h-6 w-6 mb-2" />
                    Discussion Groups
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wellness" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Mental & Spiritual Wellness
                </CardTitle>
                <CardDescription>
                  Comprehensive wellness support for mind, body, and spirit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: "Mindfulness & Meditation", description: "Weekly guided meditation sessions", time: "Wednesdays 6:00 PM" },
                    { title: "Stress Relief Workshop", description: "Coping strategies for academic pressure", time: "Fridays 4:00 PM" },
                    { title: "Spiritual Counseling", description: "One-on-one guidance sessions", time: "By Appointment" },
                    { title: "Gratitude Journaling", description: "Community gratitude sharing circle", time: "Sundays 7:00 PM" },
                  ].map((program, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{program.title}</h4>
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{program.time}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Join Session
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Get Support
                </CardTitle>
                <CardDescription>
                  Confidential support and guidance for all members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Office Hours</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tuesday - Thursday: 3:00 PM - 5:00 PM</p>
                      <p className="text-sm text-muted-foreground">Saturday: 10:00 AM - 12:00 PM</p>
                      <p className="text-sm text-muted-foreground">Location: Chapel Office</p>
                      <p className="text-sm text-muted-foreground">Or by appointment</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Crisis Support</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Emergency Support
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Heart className="h-4 w-4 mr-2" />
                        Grief Counseling
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Peer Support Network
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Confidentiality Notice</h4>
                  <p className="text-sm text-muted-foreground">
                    All conversations and support sessions are completely confidential. Your privacy and trust are sacred to our community care approach.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChaplainServices;