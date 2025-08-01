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
  Sparkles,
  HandHeart
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string | null;
}

const AssistantChaplainServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [assistantChaplain, setAssistantChaplain] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssistantChaplainInfo = async () => {
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
        .eq('position', 'assistant_chaplain')
        .eq('is_active', true)
        .single();

      if (data && !error && data.gw_profiles) {
        const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
        const assistantChaplainData = {
          position: data.position,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          user_id: profile.user_id,
          bio: profile.bio
        } as ExecutiveBoardMember;
        setAssistantChaplain(assistantChaplainData);

        // Fetch avatar
        const { data: avatarData } = await supabase.storage
          .from('user-files')
          .list(`${assistantChaplainData.user_id}/avatars`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (avatarData && avatarData.length > 0) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(`${assistantChaplainData.user_id}/avatars/${avatarData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchAssistantChaplainInfo();
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
          title="Assistant Chaplain Services"
          description="Supporting spiritual care and community wellness"
          backTo="/executive-services"
        />

        {/* Assistant Chaplain Profile */}
        {assistantChaplain && (
          <Card className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={assistantChaplain.full_name} />
                  <AvatarFallback className="text-2xl bg-white/20 text-white">
                    {assistantChaplain.first_name?.[0] || assistantChaplain.full_name?.[0]}{assistantChaplain.last_name?.[0] || assistantChaplain.full_name?.split(' ')?.[1]?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HandHeart className="h-6 w-6" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Assistant Chaplain
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{assistantChaplain.full_name}</h2>
                  <p className="text-white/80 mt-2">
                    Supporting Spiritual Care and Community Wellness
                  </p>
                </div>
              </div>
            </CardHeader>
            {assistantChaplain.bio && (
              <CardContent>
                <p className="text-white/90">{assistantChaplain.bio}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <HandHeart className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">32</div>
              <div className="text-sm text-muted-foreground">Care Packages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">15</div>
              <div className="text-sm text-muted-foreground">Study Groups Led</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">6</div>
              <div className="text-sm text-muted-foreground">Peer Support Circles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">18</div>
              <div className="text-sm text-muted-foreground">Wellness Activities</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="peer-support" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="peer-support">Peer Support</TabsTrigger>
            <TabsTrigger value="study-groups">Study Groups</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="assistance">Assistance</TabsTrigger>
          </TabsList>

          <TabsContent value="peer-support" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HandHeart className="h-5 w-5" />
                    Peer Care Network
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <HandHeart className="h-4 w-4 mr-2" />
                    Join Support Circle
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Peer Mentoring Program
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Heart className="h-4 w-4 mr-2" />
                    Check-in Sessions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community Building
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Social Mixers
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Bonding Activities
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Group Outings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="study-groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Support & Study Groups
                </CardTitle>
                <CardDescription>
                  Collaborative learning and academic assistance programs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <BookOpen className="h-6 w-6 mb-2" />
                    Study Group Sign-up
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Users className="h-6 w-6 mb-2" />
                    Peer Tutoring
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Calendar className="h-6 w-6 mb-2" />
                    Study Sessions
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Heart className="h-6 w-6 mb-2" />
                    Academic Encouragement
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Current Study Groups</h4>
                  <div className="space-y-2">
                    {[
                      { subject: "Music Theory", day: "Tuesdays", time: "7:00 PM", participants: 8 },
                      { subject: "Biology Study Group", day: "Wednesdays", time: "6:00 PM", participants: 6 },
                      { subject: "Statistics Help", day: "Thursdays", time: "5:30 PM", participants: 10 },
                      { subject: "Spanish Conversation", day: "Fridays", time: "4:00 PM", participants: 7 },
                    ].map((group, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h5 className="font-medium">{group.subject}</h5>
                          <p className="text-sm text-muted-foreground">{group.day} at {group.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{group.participants} members</Badge>
                          <Button size="sm">Join</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Wellness & Social Activities
                </CardTitle>
                <CardDescription>
                  Fun activities to promote mental health and community bonding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { 
                      title: "Movie Night & Self-Care", 
                      description: "Relaxing movie screening with snacks and self-care tips", 
                      time: "Saturday 7:00 PM",
                      participants: 15 
                    },
                    { 
                      title: "Creative Arts Workshop", 
                      description: "Painting, crafting, and creative expression for stress relief", 
                      time: "Sunday 2:00 PM",
                      participants: 12 
                    },
                    { 
                      title: "Game Day Social", 
                      description: "Board games, card games, and friendly competition", 
                      time: "Friday 6:00 PM",
                      participants: 20 
                    },
                    { 
                      title: "Nature Walk & Reflection", 
                      description: "Outdoor mindfulness and group reflection time", 
                      time: "Saturday 10:00 AM",
                      participants: 8 
                    },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{activity.participants} going</Badge>
                        <Button size="sm">RSVP</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assistance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Get Help & Support
                </CardTitle>
                <CardDescription>
                  Various forms of assistance and support for members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Available Support</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <HandHeart className="h-4 w-4 mr-2" />
                        Care Package Request
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Someone to Talk To
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Academic Assistance
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Event Planning Help
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Office Hours</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monday - Wednesday: 4:00 PM - 6:00 PM</p>
                      <p className="text-sm text-muted-foreground">Friday: 2:00 PM - 4:00 PM</p>
                      <p className="text-sm text-muted-foreground">Saturday: 11:00 AM - 1:00 PM</p>
                      <p className="text-sm text-muted-foreground">Location: Assistant Chaplain Office</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Care Philosophy</h4>
                  <p className="text-sm text-muted-foreground">
                    We believe in supporting every member's academic, social, and spiritual journey. No request is too small, and every member deserves care and encouragement. We're here to lift each other up!
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

export default AssistantChaplainServices;