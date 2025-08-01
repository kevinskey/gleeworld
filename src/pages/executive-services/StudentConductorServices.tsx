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
  Music, 
  Users, 
  Calendar, 
  MessageCircle,
  BookOpen,
  Award
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string | null;
}

const StudentConductorServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [conductor, setConductor] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchConductorInfo = async () => {
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
        .eq('position', 'student_conductor')
        .eq('is_active', true)
        .single();

      if (data && !error && data.gw_profiles) {
        const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
        const conductorData = {
          position: data.position,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          user_id: profile.user_id,
          bio: profile.bio
        } as ExecutiveBoardMember;
        setConductor(conductorData);

        // Fetch avatar
        const { data: avatarData } = await supabase.storage
          .from('user-files')
          .list(`${conductorData.user_id}/avatars`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (avatarData && avatarData.length > 0) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(`${conductorData.user_id}/avatars/${avatarData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchConductorInfo();
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
          title="Student Conductor Services"
          description="Musical leadership and ensemble direction"
          backTo="/executive-services"
        />

        {/* Student Conductor Profile */}
        {conductor && (
          <Card className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={conductor.full_name} />
                  <AvatarFallback className="text-2xl bg-white/20 text-white">
                    {conductor.first_name?.[0]}{conductor.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-6 w-6" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Student Conductor
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{conductor.full_name}</h2>
                  <p className="text-white/80 mt-2">
                    Musical Director and Ensemble Leader
                  </p>
                </div>
              </div>
            </CardHeader>
            {conductor.bio && (
              <CardContent>
                <p className="text-white/90">{conductor.bio}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm text-muted-foreground">Pieces in Repertoire</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">4</div>
              <div className="text-sm text-muted-foreground">Voice Sections</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">18</div>
              <div className="text-sm text-muted-foreground">Rehearsals/Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">95%</div>
              <div className="text-sm text-muted-foreground">Performance Readiness</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="rehearsals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
            <TabsTrigger value="music-library">Music Library</TabsTrigger>
            <TabsTrigger value="sectionals">Sectionals</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
          </TabsList>

          <TabsContent value="rehearsals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Rehearsal Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Rehearsal Schedule
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Music className="h-4 w-4 mr-2" />
                    Today's Repertoire
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Attendance Tracker
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Performance Preparation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Music className="h-4 w-4 mr-2" />
                    Concert Repertoire
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Performance Notes
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Dress Rehearsals
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="music-library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Musical Resources & Library
                </CardTitle>
                <CardDescription>
                  Access sheet music, recordings, and performance materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <BookOpen className="h-6 w-6 mb-2" />
                    Sheet Music Library
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Music className="h-6 w-6 mb-2" />
                    Practice Tracks
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Award className="h-6 w-6 mb-2" />
                    Performance Recordings
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Users className="h-6 w-6 mb-2" />
                    Ensemble Arrangements
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Current Repertoire</h4>
                  <div className="space-y-2">
                    {[
                      { title: "Lift Every Voice and Sing", composer: "J. Rosamond Johnson", status: "Performance Ready" },
                      { title: "Wade in the Water", composer: "Traditional Spiritual", status: "In Progress" },
                      { title: "Total Praise", composer: "Richard Smallwood", status: "Learning" },
                      { title: "Precious Lord", composer: "Thomas A. Dorsey", status: "Review" },
                    ].map((piece, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h5 className="font-medium">{piece.title}</h5>
                          <p className="text-sm text-muted-foreground">{piece.composer}</p>
                        </div>
                        <Badge variant={piece.status === "Performance Ready" ? "default" : "secondary"}>
                          {piece.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectionals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Voice Section Training
                </CardTitle>
                <CardDescription>
                  Specialized training and development for each voice part
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { section: "Soprano I", members: 18, leader: "Section Leader TBD", focus: "High register clarity" },
                    { section: "Soprano II", members: 16, leader: "Section Leader TBD", focus: "Harmony balance" },
                    { section: "Alto I", members: 14, leader: "Section Leader TBD", focus: "Middle voice strength" },
                    { section: "Alto II", members: 12, leader: "Section Leader TBD", focus: "Foundation support" },
                  ].map((section, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{section.section}</h4>
                        <Badge variant="outline">{section.members} members</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Leader: {section.leader}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Focus: {section.focus}
                      </p>
                      <Button size="sm" className="w-full">
                        Join Sectional
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="development" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Musical Development & Training
                </CardTitle>
                <CardDescription>
                  Enhance your vocal skills and musical understanding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Vocal Training Sessions</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monday: Breath Control Workshop</p>
                      <p className="text-sm text-muted-foreground">Wednesday: Sight-Reading Practice</p>
                      <p className="text-sm text-muted-foreground">Friday: Individual Voice Coaching</p>
                      <p className="text-sm text-muted-foreground">Time: 5:00 PM - 6:00 PM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Voice Lesson
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Access Practice Materials
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Request Feedback
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Practice Tips</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Practice with recordings for tempo and pitch accuracy</li>
                    <li>• Focus on breath support for sustained phrases</li>
                    <li>• Record yourself to monitor progress</li>
                    <li>• Attend sectionals consistently for part accuracy</li>
                    <li>• Work on diction and text clarity</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentConductorServices;