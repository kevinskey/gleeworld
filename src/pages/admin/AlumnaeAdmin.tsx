import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { 
  Shield, 
  Users, 
  BookOpen, 
  MessageCircle, 
  CheckCircle, 
  XCircle,
  Eye,
  UserCheck,
  UserX,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PendingStory {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  graduation_year?: number;
  user_id: string;
  created_at: string;
  is_approved: boolean;
}

interface PendingMessage {
  id: string;
  content: string;
  visible_to: string;
  recipient_type: string;
  target_graduation_year?: number;
  sender_id: string;
  created_at: string;
  is_approved: boolean;
}

interface AlumnaeProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  graduation_year?: number;
  voice_part?: string;
  role: string;
  verified: boolean;
  mentor_opt_in: boolean;
  reunion_rsvp: boolean;
  bio?: string;
  created_at: string;
}

interface MentorStats {
  total_mentors: number;
  active_mentors: number;
  reunion_rsvps: number;
}

export default function AlumnaeAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pendingStories, setPendingStories] = useState<PendingStory[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [alumnaeProfiles, setAlumnaeProfiles] = useState<AlumnaeProfile[]>([]);
  const [mentorStats, setMentorStats] = useState<MentorStats>({
    total_mentors: 0,
    active_mentors: 0,
    reunion_rsvps: 0
  });
  
  const [selectedStory, setSelectedStory] = useState<PendingStory | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatusAndFetchData();
  }, [user, navigate]);

  const checkAdminStatusAndFetchData = async () => {
    if (!user) return;

    try {
      // Check if user is admin - look at the profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const adminStatus = profileData?.role === 'admin' || profileData?.role === 'super-admin';
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await fetchAdminData();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Error loading admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch pending stories
      const { data: storiesData } = await supabase
        .from('alumnae_stories')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      // Fetch pending messages
      const { data: messagesData } = await supabase
        .from('alumnae_messages')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      // Fetch alumnae profiles
      const { data: profilesData } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('role', 'alumna')
        .order('created_at', { ascending: false });

      // Calculate mentor stats
      const mentors = profilesData?.filter(p => p.mentor_opt_in) || [];
      const rsvps = profilesData?.filter(p => p.reunion_rsvp) || [];

      setPendingStories(storiesData || []);
      setPendingMessages(messagesData || []);
      setAlumnaeProfiles(profilesData || []);
      setMentorStats({
        total_mentors: mentors.length,
        active_mentors: mentors.filter(m => m.verified).length,
        reunion_rsvps: rsvps.length
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error loading data');
    }
  };

  const handleApproveStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('alumnae_stories')
        .update({ is_approved: true })
        .eq('id', storyId);

      if (error) throw error;
      
      toast.success('Story approved!');
      await fetchAdminData();
      setSelectedStory(null);
    } catch (error) {
      console.error('Error approving story:', error);
      toast.error('Failed to approve story');
    }
  };

  const handleRejectStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('alumnae_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      
      toast.success('Story rejected and deleted');
      await fetchAdminData();
      setSelectedStory(null);
    } catch (error) {
      console.error('Error rejecting story:', error);
      toast.error('Failed to reject story');
    }
  };

  const handleApproveMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('alumnae_messages')
        .update({ is_approved: true })
        .eq('id', messageId);

      if (error) throw error;
      
      toast.success('Message approved!');
      await fetchAdminData();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error approving message:', error);
      toast.error('Failed to approve message');
    }
  };

  const handleRejectMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('alumnae_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      toast.success('Message rejected and deleted');
      await fetchAdminData();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error rejecting message:', error);
      toast.error('Failed to reject message');
    }
  };

  const handleVerifyAlumna = async (userId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ verified: verify })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(`Alumna ${verify ? 'verified' : 'unverified'}!`);
      await fetchAdminData();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification');
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  if (!isAdmin) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                This area is restricted to administrators only.
              </p>
              <Button onClick={() => navigate('/alumnae')}>
                Return to Alumnae Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-primary flex items-center justify-center gap-2">
            <Shield className="h-8 w-8" />
            Alumnae Administration
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage alumnae content, verification, and community features
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alumnae</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alumnaeProfiles.length}</div>
              <p className="text-xs text-muted-foreground">
                {alumnaeProfiles.filter(p => p.verified).length} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mentorStats.active_mentors}</div>
              <p className="text-xs text-muted-foreground">
                {mentorStats.total_mentors} total opted in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Stories</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingStories.length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reunion RSVPs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mentorStats.reunion_rsvps}</div>
              <p className="text-xs text-muted-foreground">
                Confirmed attendees
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="stories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stories">Pending Stories</TabsTrigger>
            <TabsTrigger value="messages">Pending Messages</TabsTrigger>
            <TabsTrigger value="alumnae">Alumnae Management</TabsTrigger>
          </TabsList>

          {/* Pending Stories */}
          <TabsContent value="stories">
            <Card>
              <CardHeader>
                <CardTitle>Stories Awaiting Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingStories.length > 0 ? (
                    pendingStories.map((story) => (
                      <div key={story.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{story.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Submitted {format(new Date(story.created_at), 'MMM dd, yyyy')}
                              {story.graduation_year && ` • Class of ${story.graduation_year}`}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStory(story)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                        <p className="text-sm line-clamp-2">{story.content}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveStory(story.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectStory(story.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No pending stories
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Messages */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages Awaiting Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingMessages.length > 0 ? (
                    pendingMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Submitted {format(new Date(message.created_at), 'MMM dd, yyyy')} •
                              To: {message.recipient_type}
                              {message.target_graduation_year && ` (Class of ${message.target_graduation_year})`}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{message.visible_to}</Badge>
                              <Badge variant="secondary">{message.recipient_type}</Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMessage(message)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                        <p className="text-sm line-clamp-3">{message.content}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveMessage(message.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectMessage(message.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No pending messages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alumnae Management */}
          <TabsContent value="alumnae">
            <Card>
              <CardHeader>
                <CardTitle>Alumnae Verification & Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alumnaeProfiles.map((profile) => (
                    <div key={profile.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{profile.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <div className="flex gap-2 mt-2">
                            {profile.graduation_year && (
                              <Badge variant="outline">
                                Class of {profile.graduation_year}
                              </Badge>
                            )}
                            {profile.voice_part && (
                              <Badge variant="secondary">{profile.voice_part}</Badge>
                            )}
                            {profile.mentor_opt_in && (
                              <Badge variant="default">Mentor</Badge>
                            )}
                            {profile.reunion_rsvp && (
                              <Badge className="bg-green-500">RSVP'd</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={profile.verified ? "default" : "secondary"}>
                            {profile.verified ? "Verified" : "Unverified"}
                          </Badge>
                          {profile.verified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAlumna(profile.user_id, false)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Unverify
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyAlumna(profile.user_id, true)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Story Review Dialog */}
        <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Story: {selectedStory?.title}</DialogTitle>
            </DialogHeader>
            {selectedStory && (
              <div className="space-y-4">
                {selectedStory.image_url && (
                  <img
                    src={selectedStory.image_url}
                    alt={selectedStory.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Submitted {format(new Date(selectedStory.created_at), 'MMM dd, yyyy')}
                    {selectedStory.graduation_year && ` • Class of ${selectedStory.graduation_year}`}
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <p>{selectedStory.content}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleApproveStory(selectedStory.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Story
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectStory(selectedStory.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject & Delete
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedStory(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Message Review Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Message</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Submitted {format(new Date(selectedMessage.created_at), 'MMM dd, yyyy')}
                  </p>
                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline">To: {selectedMessage.recipient_type}</Badge>
                    <Badge variant="secondary">Visibility: {selectedMessage.visible_to}</Badge>
                    {selectedMessage.target_graduation_year && (
                      <Badge>Class of {selectedMessage.target_graduation_year}</Badge>
                    )}
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p>{selectedMessage.content}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleApproveMessage(selectedMessage.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Message
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectMessage(selectedMessage.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject & Delete
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </UniversalLayout>
  );
}