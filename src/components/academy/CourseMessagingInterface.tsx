import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, UserPlus, ArrowLeft, Search, Users, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCourseMessaging } from '@/hooks/useCourseMessaging';
import { useCreateDirectMessage } from '@/hooks/useMessaging';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { GroupHeader } from '@/components/messaging/GroupHeader';
import { toast } from 'sonner';

interface CourseMessagingInterfaceProps {
  courseId: string;
  courseName: string;
  isEnrolled: boolean;
}

interface EnrolledMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  voice_part?: string;
}

const MUS_070_ID = 'a0000000-0000-0000-0000-000000000070';

export const CourseMessagingInterface: React.FC<CourseMessagingInterfaceProps> = ({
  courseId,
  courseName,
  isEnrolled
}) => {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showDMDialog, setShowDMDialog] = useState(false);
  const [enrolledMembers, setEnrolledMembers] = useState<EnrolledMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { courseGroup, isMember, loading: groupLoading, joinCourseGroup } = useCourseMessaging(courseId, courseName);
  const createDirectMessage = useCreateDirectMessage();

  useEffect(() => {
    if (isEnrolled) {
      fetchEnrolledMembers();
    } else {
      setMembersLoading(false);
    }
  }, [courseId, isEnrolled, user]);

  const fetchEnrolledMembers = async () => {
    try {
      setMembersLoading(true);
      
      if (courseId === MUS_070_ID) {
        // For MUS 070, get all glee club members
        const { data } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, avatar_url, email, voice_part')
          .or('role.eq.member,is_admin.eq.true,is_super_admin.eq.true')
          .order('full_name');
        setEnrolledMembers(data || []);
      } else {
        // For other courses, get enrolled students
        const { data: enrollments } = await supabase
          .from('gw_course_enrollments')
          .select('user_id')
          .eq('course_id', courseId);
        
        if (enrollments && enrollments.length > 0) {
          const userIds = enrollments.map(e => e.user_id);
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, avatar_url, email, voice_part')
            .in('user_id', userIds)
            .order('full_name');
          setEnrolledMembers(profiles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching enrolled members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDirectMessage = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      const conversation = await createDirectMessage.mutateAsync(targetUserId);
      setSelectedGroupId(conversation.id);
      setShowDMDialog(false);
      toast.success('Direct message started');
    } catch (error) {
      console.error('Failed to create direct message:', error);
      toast.error('Failed to start direct message');
    }
  };

  const handleJoinGroup = async () => {
    const success = await joinCourseGroup();
    if (success && courseGroup) {
      setSelectedGroupId(courseGroup.id);
    }
  };

  const filteredMembers = enrolledMembers.filter(member => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search) ||
      member.voice_part?.toLowerCase().includes(search)
    );
  }).filter(member => member.user_id !== user?.id); // Exclude current user

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Course Messages</h3>
          <p className="text-muted-foreground">
            Enroll in this course to access messaging with your classmates.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (groupLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If viewing a specific chat
  if (selectedGroupId) {
    return (
      <div className="h-[600px] flex flex-col bg-background rounded-lg border">
        <GroupHeader
          groupId={selectedGroupId}
          groupName={courseGroup?.id === selectedGroupId ? `${courseName} Discussion` : 'Direct Message'}
          showBackButton
          onBack={() => setSelectedGroupId(null)}
        />
        <div className="flex-1 overflow-hidden">
          <ChatWindow groupId={selectedGroupId} />
        </div>
      </div>
    );
  }

  // Main messaging interface
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{courseName} Messages</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDMDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Message Classmate
        </Button>
      </div>

      {/* Course Discussion Group */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Class Discussion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courseGroup ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {courseName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{courseName} Discussion</div>
                  <div className="text-sm text-muted-foreground">
                    {enrolledMembers.length} classmates
                  </div>
                </div>
              </div>
              {isMember ? (
                <Button onClick={() => setSelectedGroupId(courseGroup.id)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Open Chat
                </Button>
              ) : (
                <Button onClick={handleJoinGroup}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Discussion
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No discussion group available for this course yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Classmates List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Your Classmates ({enrolledMembers.length - 1})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classmates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredMembers.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {getUserInitials(member.full_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.full_name}</div>
                      {member.voice_part && (
                        <Badge variant="secondary" className="text-xs">
                          {member.voice_part}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDirectMessage(member.user_id)}
                    disabled={createDirectMessage.isPending}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No classmates found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* DM Dialog */}
      <Dialog open={showDMDialog} onOpenChange={setShowDMDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message a Classmate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredMembers.map(member => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleDirectMessage(member.user_id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {getUserInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
