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
  FileText, 
  Users, 
  Calendar, 
  Mail, 
  ClipboardList, 
  Archive,
  MessageSquare,
  Phone,
  Download,
  Upload
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_id: string;
  bio: string;
}

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  status: string;
  attendees: string[];
  agenda_items: string[];
  action_items: string[];
  discussion_points: string;
}

const SecretaryServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState<ExecutiveBoardMember | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);
  const [minutesLoading, setMinutesLoading] = useState(true);
  const { data: artisticDirectorData } = useArtisticDirectorAvatar();

  useEffect(() => {
    const fetchSecretary = async () => {
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
          .eq('position', 'secretary')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          const profile = Array.isArray(data.gw_profiles) ? data.gw_profiles[0] : data.gw_profiles;
          const secretaryData = {
            position: data.position,
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            user_id: profile.user_id,
            bio: profile.bio
          } as ExecutiveBoardMember;
          setSecretary(secretaryData);

          // Fetch avatar
          const { data: avatarData } = await supabase.storage
            .from('user-files')
            .list(`${secretaryData.user_id}/avatars`, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (avatarData && avatarData.length > 0) {
            const { data: urlData } = supabase.storage
              .from('user-files')
              .getPublicUrl(`${secretaryData.user_id}/avatars/${avatarData[0].name}`);
            setAvatarUrl(urlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching secretary data:', error);
      }
    };

    const fetchMeetingMinutes = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_meeting_minutes')
          .select('*')
          .order('meeting_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setMeetingMinutes(data || []);
      } catch (error) {
        console.error('Error fetching meeting minutes:', error);
      } finally {
        setMinutesLoading(false);
      }
    };

    fetchSecretary();
    fetchMeetingMinutes();
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
          title="Secretary Services"
          description="Communications, record keeping, and administrative support"
          backTo="/executive-services"
        />

        {/* Secretary Profile Card */}
        {secretary && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Secretary" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">{secretary.full_name}</CardTitle>
                  <CardDescription className="text-lg">Secretary</CardDescription>
                </div>
              </div>
              {secretary.bio && (
                <p className="text-muted-foreground mt-4">{secretary.bio}</p>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meeting Minutes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetingMinutes.length}</div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Minutes</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetingMinutes.filter(m => m.status === 'approved').length}</div>
              <p className="text-xs text-muted-foreground">Ready for access</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Records Maintained</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98%</div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.3h</div>
              <p className="text-xs text-muted-foreground">Average response</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Services */}
        <Tabs defaultValue="minutes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="minutes">Meeting Minutes</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="records">Record Keeping</TabsTrigger>
            <TabsTrigger value="contact">Contact Secretary</TabsTrigger>
          </TabsList>

          <TabsContent value="minutes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Meeting Minutes & Documentation
                </CardTitle>
                <CardDescription>
                  Access meeting records, agendas, and official documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16 flex-col">
                    <Download className="h-5 w-5 mb-2" />
                    Download Latest Minutes
                  </Button>
                  <Button className="h-16 flex-col">
                    <Calendar className="h-5 w-5 mb-2" />
                    View Meeting Archive
                  </Button>
                  <Button className="h-16 flex-col">
                    <ClipboardList className="h-5 w-5 mb-2" />
                    Upcoming Agenda Items
                  </Button>
                  <Button className="h-16 flex-col">
                    <Upload className="h-5 w-5 mb-2" />
                    Submit Agenda Item
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Recent Meetings</h4>
                  {minutesLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : meetingMinutes.length > 0 ? (
                    <div className="space-y-2">
                      {meetingMinutes.slice(0, 5).map((minute) => (
                        <div key={minute.id} className="p-3 border rounded-lg flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{minute.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(minute.meeting_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                minute.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                minute.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {minute.status}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {minute.meeting_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" disabled={minute.status !== 'approved'}>
                            <Download className="h-4 w-4 mr-2" />
                            {minute.status === 'approved' ? 'Download' : 'Pending'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No meeting minutes available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Official Communications
                </CardTitle>
                <CardDescription>
                  Club announcements, member communications, and correspondence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Mail className="h-6 w-6 mb-2" />
                    <span>Member Announcements</span>
                    <span className="text-xs text-muted-foreground">Send to all members</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <MessageSquare className="h-6 w-6 mb-2" />
                    <span>Executive Updates</span>
                    <span className="text-xs text-muted-foreground">Board communications</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Archive className="h-6 w-6 mb-2" />
                    <span>Communication Archive</span>
                    <span className="text-xs text-muted-foreground">Past announcements</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <ClipboardList className="h-6 w-6 mb-2" />
                    <span>Communication Templates</span>
                    <span className="text-xs text-muted-foreground">Standard formats</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Record Keeping & Documentation
                </CardTitle>
                <CardDescription>
                  Official records, member information, and administrative documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Member Records</h4>
                      <p className="text-sm text-muted-foreground mb-3">Official membership documentation</p>
                      <Button size="sm" className="w-full">Access Records</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Constitutional Documents</h4>
                      <p className="text-sm text-muted-foreground mb-3">Bylaws and official policies</p>
                      <Button size="sm" className="w-full">View Documents</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Committee Records</h4>
                      <p className="text-sm text-muted-foreground mb-3">Committee meeting notes and decisions</p>
                      <Button size="sm" className="w-full">Browse Records</Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Historical Archives</h4>
                      <p className="text-sm text-muted-foreground mb-3">Past years' documentation</p>
                      <Button size="sm" className="w-full">Access Archives</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact the Secretary</CardTitle>
                  <CardDescription>
                    Get in touch for meeting minutes, communications, or administrative support
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
                    Request Documents
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Submit Announcement
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
                      <h4 className="font-medium">Office Hours</h4>
                      <p className="text-sm text-muted-foreground">Monday - Friday, 9:00 AM - 3:00 PM</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Location</h4>
                      <p className="text-sm text-muted-foreground">Administrative Office, Music Building</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Response Time</h4>
                      <p className="text-sm text-muted-foreground">Same day for urgent matters</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Emergency Contact</h4>
                      <p className="text-sm text-muted-foreground">Available 24/7 for urgent club matters</p>
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

export default SecretaryServices;