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
  Settings, 
  Users, 
  Calendar, 
  MessageCircle,
  Clipboard,
  Wrench,
  CheckCircle
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string | null;
}

const SetUpCrewManagerServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [manager, setManager] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchManagerInfo = async () => {
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
        .eq('position', 'set_up_crew_manager')
        .eq('is_active', true)
        .single();

      if (data && !error && data.gw_profiles) {
        const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
        const managerData = {
          position: data.position,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          user_id: profile.user_id,
          bio: profile.bio
        } as ExecutiveBoardMember;
        setManager(managerData);

        // Fetch avatar
        const { data: avatarData } = await supabase.storage
          .from('user-files')
          .list(`${managerData.user_id}/avatars`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (avatarData && avatarData.length > 0) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(`${managerData.user_id}/avatars/${avatarData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchManagerInfo();
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
          title="Set-Up Crew Manager Services"
          description="Event logistics and technical coordination"
          backTo="/executive-services"
        />

        {/* Set-Up Crew Manager Profile */}
        {manager && (
          <Card className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={manager.full_name} />
                  <AvatarFallback className="text-2xl bg-white/20 text-white">
                    {manager.first_name?.[0]}{manager.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-6 w-6" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Set-Up Crew Manager
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{manager.full_name}</h2>
                  <p className="text-white/80 mt-2">
                    Event Logistics and Technical Operations Coordinator
                  </p>
                </div>
              </div>
            </CardHeader>
            {manager.bio && (
              <CardContent>
                <p className="text-white/90">{manager.bio}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">15</div>
              <div className="text-sm text-muted-foreground">Events Set Up</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">25</div>
              <div className="text-sm text-muted-foreground">Crew Members</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Wrench className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">48</div>
              <div className="text-sm text-muted-foreground">Equipment Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">98%</div>
              <div className="text-sm text-muted-foreground">Setup Success Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="crew-management" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="crew-management">Crew Management</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
          </TabsList>

          <TabsContent value="crew-management" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Crew Coordination
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    View Crew Roster
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Assign Event Crews
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Crew Communication
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="h-5 w-5" />
                    Event Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <Clipboard className="h-4 w-4 mr-2" />
                    Setup Checklists
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Technical Requirements
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post-Event Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Equipment Management
                </CardTitle>
                <CardDescription>
                  Track, maintain, and coordinate all technical equipment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <Wrench className="h-6 w-6 mb-2" />
                    Equipment Inventory
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Clipboard className="h-6 w-6 mb-2" />
                    Check-Out System
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Settings className="h-6 w-6 mb-2" />
                    Maintenance Log
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <MessageCircle className="h-6 w-6 mb-2" />
                    Report Issues
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Equipment Status</h4>
                  <div className="space-y-2">
                    {[
                      { item: "Sound System", status: "Available", condition: "Excellent", location: "Storage Room A" },
                      { item: "Microphones (12)", status: "In Use", condition: "Good", location: "Main Hall" },
                      { item: "Lighting Kit", status: "Available", condition: "Good", location: "Storage Room B" },
                      { item: "Extension Cables", status: "Maintenance", condition: "Fair", location: "Repair Shop" },
                    ].map((equipment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h5 className="font-medium">{equipment.item}</h5>
                          <p className="text-sm text-muted-foreground">Location: {equipment.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={equipment.status === "Available" ? "default" : equipment.status === "In Use" ? "secondary" : "outline"}>
                            {equipment.status}
                          </Badge>
                          <Badge variant="outline">
                            {equipment.condition}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Setup & Strike Scheduling
                </CardTitle>
                <CardDescription>
                  Coordinate setup and strike times for all events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { 
                      event: "Fall Concert", 
                      setupTime: "Friday 4:00 PM", 
                      strikeTime: "Sunday 10:00 PM",
                      crewNeeded: 8,
                      crewAssigned: 6 
                    },
                    { 
                      event: "Alumni Weekend Performance", 
                      setupTime: "Saturday 2:00 PM", 
                      strikeTime: "Saturday 11:00 PM",
                      crewNeeded: 6,
                      crewAssigned: 6 
                    },
                    { 
                      event: "Community Outreach Concert", 
                      setupTime: "Sunday 10:00 AM", 
                      strikeTime: "Sunday 4:00 PM",
                      crewNeeded: 5,
                      crewAssigned: 3 
                    },
                    { 
                      event: "Recording Session", 
                      setupTime: "Tuesday 6:00 PM", 
                      strikeTime: "Tuesday 9:00 PM",
                      crewNeeded: 4,
                      crewAssigned: 4 
                    },
                  ].map((schedule, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{schedule.event}</h4>
                        <Badge variant={schedule.crewAssigned >= schedule.crewNeeded ? "default" : "outline"}>
                          {schedule.crewAssigned}/{schedule.crewNeeded} crew
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                        <p>Setup: {schedule.setupTime}</p>
                        <p>Strike: {schedule.strikeTime}</p>
                      </div>
                      <Button size="sm" variant={schedule.crewAssigned < schedule.crewNeeded ? "default" : "outline"}>
                        {schedule.crewAssigned < schedule.crewNeeded ? "Join Crew" : "View Details"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volunteer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join the Set-Up Crew
                </CardTitle>
                <CardDescription>
                  Help with event setup and strike - gain valuable experience!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Benefits of Joining</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Learn technical skills (sound, lighting, staging)</li>
                      <li>• Behind-the-scenes concert experience</li>
                      <li>• Build teamwork and leadership skills</li>
                      <li>• Flexible scheduling around your availability</li>
                      <li>• Recognition for service hours</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Get Started</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Join Crew Application
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Training Schedule
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ask Questions
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Training & Support</h4>
                  <p className="text-sm text-muted-foreground">
                    New crew members receive comprehensive training on all equipment and safety procedures. No prior experience required - we'll teach you everything you need to know!
                  </p>
                </div>

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Time Commitment</h4>
                  <p className="text-sm text-muted-foreground">
                    Typical setup: 2-3 hours | Strike: 1-2 hours | Training sessions: 1 hour | Minimum commitment: 2 events per semester
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

export default SetUpCrewManagerServices;