import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  X,
  UserPlus,
  Users,
  Search,
  Send,
  Radio,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveVideoSessionProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onClose: () => void;
}

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export const LiveVideoSession = ({ userProfile, onClose }: LiveVideoSessionProps) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedMembers, setInvitedMembers] = useState<Member[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Fetch members for invitation
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .neq('user_id', userProfile?.user_id || '')
        .order('full_name');
      
      if (data) {
        setMembers(data);
      }
    };
    fetchMembers();
  }, [userProfile?.user_id]);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          variant: 'destructive',
          title: 'Camera Access Error',
          description: 'Unable to access your camera. Please check permissions.',
        });
      }
    };
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const handleGoLive = () => {
    setIsLive(true);
    toast({
      title: '🔴 You are now LIVE!',
      description: invitedMembers.length > 0 
        ? `${invitedMembers.length} member(s) have been notified`
        : 'Start inviting members to join your session',
    });
  };

  const handleEndSession = () => {
    setIsLive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const handleInviteMembers = () => {
    const newlyInvited = members.filter(m => selectedMembers.includes(m.user_id));
    setInvitedMembers(prev => [...prev, ...newlyInvited.filter(n => !prev.find(p => p.user_id === n.user_id))]);
    setSelectedMembers([]);
    setShowInvite(false);
    
    toast({
      title: 'Invitations Sent!',
      description: `${newlyInvited.length} member(s) have been invited to join`,
    });
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !invitedMembers.find(i => i.user_id === m.user_id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-card">
        <CardHeader className="border-b flex flex-row items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className={`h-5 w-5 ${isLive ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
              {isLive ? 'LIVE Session' : 'Go Live'}
            </CardTitle>
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                ● LIVE
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleEndSession}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Video Area */}
            <div className="flex-1 relative bg-black aspect-video lg:aspect-auto lg:min-h-[400px]">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-3">
                      <AvatarImage src={userProfile?.avatar_url || ''} />
                      <AvatarFallback className="text-2xl">
                        {userProfile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}

              {/* User name overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">
                  {userProfile?.full_name || 'You'}
                </span>
              </div>

              {/* Controls overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button
                  variant={isVideoOn ? 'secondary' : 'destructive'}
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={toggleVideo}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant={isMicOn ? 'secondary' : 'destructive'}
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={toggleMic}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                {isLive ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={handleEndSession}
                  >
                    <Phone className="h-5 w-5 rotate-135" />
                  </Button>
                ) : (
                  <Button
                    className="rounded-full h-12 px-6 bg-red-600 hover:bg-red-700"
                    onClick={handleGoLive}
                  >
                    <Radio className="h-5 w-5 mr-2" />
                    Go Live
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar - Invite Members */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l">
              <div className="p-3 border-b">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowInvite(!showInvite)}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Members
                </Button>
              </div>

              {showInvite ? (
                <div className="p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => toggleMemberSelection(member.user_id)}
                        >
                          <Checkbox checked={selectedMembers.includes(member.user_id)} />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {member.full_name?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate flex-1">{member.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedMembers.length > 0 && (
                    <Button className="w-full gap-2" onClick={handleInviteMembers}>
                      <Send className="h-4 w-4" />
                      Invite ({selectedMembers.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Invited ({invitedMembers.length})</span>
                  </div>
                  <ScrollArea className="h-48">
                    {invitedMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No members invited yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {invitedMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {member.full_name?.charAt(0) || 'M'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate flex-1">{member.full_name}</span>
                            <Badge variant="outline" className="text-xs">Invited</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
