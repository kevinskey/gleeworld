import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGleeLoungePresence } from '@/hooks/useGleeLoungePresence';
import { CreatePostCard } from '@/components/glee-lounge/CreatePostCard';
import { MobileCreatePost } from '@/components/glee-lounge/MobileCreatePost';
import { SocialFeed, SocialFeedRef } from '@/components/glee-lounge/SocialFeed';
import { OnlineNowWidget } from '@/components/glee-lounge/OnlineNowWidget';
import { OnlineSidebar } from '@/components/glee-lounge/OnlineSidebar';
import { GleeLoungeWithMusicLibrary } from '@/components/glee-lounge/GleeLoungeWithMusicLibrary';
import { LiveVideoSession } from '@/components/glee-lounge/LiveVideoSession';

import { CreateVideoSessionDialog } from '@/components/glee-lounge/video-sessions/CreateVideoSessionDialog';
import { VideoSessionViewer } from '@/components/glee-lounge/video-sessions/VideoSessionViewer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Sofa, Plus, Users, ArrowLeft, Music, Radio, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ActiveSession {
  id: string;
  roomName: string;
  isRecording: boolean;
}

export default function GleeLounge() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileCreate, setShowMobileCreate] = useState(false);
  const [showMobileOnline, setShowMobileOnline] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [showCreateVideoSession, setShowCreateVideoSession] = useState(false);
  const [activeVideoSession, setActiveVideoSession] = useState<ActiveSession | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { onlineUsers, isConnected } = useGleeLoungePresence();
  const feedRef = useRef<SocialFeedRef>(null);

  const handlePostCreated = () => {
    // Refresh the feed immediately when user creates a post
    feedRef.current?.refresh();
    setShowMobileCreate(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleWave = (userId: string) => {
    const user = onlineUsers.find(u => u.user_id === userId);
    toast({
      title: `👋 Waved at ${user?.full_name || 'someone'}!`,
      description: 'They know you said hi',
    });
    // TODO: Connect to messaging system for actual wave notification
  };

  const handleMessage = (userId: string) => {
    // TODO: Open DM with user via existing messaging system
    toast({
      title: 'Opening message...',
      description: 'Direct messaging will be connected soon',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Compact layout when Music Library is open
  if (showMusicLibrary) {
    return (
      <GleeLoungeWithMusicLibrary
        showMusicLibrary={showMusicLibrary}
        onToggleMusicLibrary={() => setShowMusicLibrary(false)}
      >
        <div className="h-full flex flex-col bg-background relative">
          {/* Compact Header */}
          <header className="sticky top-0 z-40 bg-card border-b border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sofa className="h-4 w-4 text-primary" />
                <span className="font-semibold text-xs">Lounge</span>
              </div>
            </div>
          </header>

          {/* Compact Feed */}
          <div className="flex-1 overflow-auto p-2">
            <SocialFeed ref={feedRef} userProfile={userProfile} compact={true} />
          </div>

          {/* Floating Exit Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMusicLibrary(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-lg gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            Exit Split View
          </Button>
        </div>
      </GleeLoungeWithMusicLibrary>
    );
  }

  // Full layout when Music Library is closed
  const loungeContent = (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sofa className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Glee Lounge</h1>
            </div>
          </div>

          {/* Right side actions - desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCreateVideoSession(true)}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Video className="h-4 w-4" />
              <span>Video Session</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowLiveVideo(true)}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              <Radio className="h-4 w-4" />
              <span>Go Live</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMusicLibrary(true)}
              className="gap-2"
            >
              <Music className="h-4 w-4" />
              <span>Music Library</span>
            </Button>
            {isConnected && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Connected
              </span>
            )}
          </div>

          {/* Mobile: Music Library icon only */}
          <div className="sm:hidden flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMusicLibrary(true)}
            >
              <Music className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile: Action buttons row */}
        <div className="sm:hidden px-4 pb-3 flex gap-2">
          <Button
            variant="default"
            onClick={() => setShowCreateVideoSession(true)}
            className="flex-1 gap-2"
          >
            <Video className="h-4 w-4" />
            <span>Video Session</span>
          </Button>
          <Button
            variant="default"
            onClick={() => setShowLiveVideo(true)}
            className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Radio className="h-4 w-4" />
            <span>Go Live</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Mobile: Online widget at top */}
        <div className="lg:hidden mb-4">
          <Sheet open={showMobileOnline} onOpenChange={setShowMobileOnline}>
            <SheetTrigger asChild>
              <div>
                <OnlineNowWidget
                  users={onlineUsers}
                  onExpand={() => setShowMobileOnline(true)}
                />
              </div>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Who's Online
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <OnlineSidebar
                  users={onlineUsers}
                  onWave={handleWave}
                  onMessage={handleMessage}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>


        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0">
            {/* Desktop: Create post card */}
            <div className="hidden lg:block">
              <CreatePostCard userProfile={userProfile} onPostCreated={handlePostCreated} />
            </div>

            {/* Mobile: Create post sheet */}
            <div className="lg:hidden">
              <Sheet open={showMobileCreate} onOpenChange={setShowMobileCreate}>
                <SheetContent 
                  side="bottom" 
                  className="h-auto max-h-[85vh] rounded-t-2xl px-4 pb-safe"
                >
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2 mb-4" />
                  <MobileCreatePost
                    userProfile={userProfile}
                    onPostCreated={handlePostCreated}
                    onClose={() => setShowMobileCreate(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Feed */}
            <SocialFeed ref={feedRef} userProfile={userProfile} compact={false} />
          </div>

          {/* Desktop: Online sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <OnlineSidebar
              users={onlineUsers}
              onWave={handleWave}
              onMessage={handleMessage}
            />
          </div>
        </div>
      </main>

      {/* Mobile: Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setShowMobileCreate(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {loungeContent}
      
      {/* Solo Live Video */}
      {showLiveVideo && (
        <LiveVideoSession
          userProfile={userProfile}
          onClose={() => setShowLiveVideo(false)}
        />
      )}
      
      {/* Create Video Session Dialog */}
      <CreateVideoSessionDialog
        open={showCreateVideoSession}
        onOpenChange={setShowCreateVideoSession}
        onSessionCreated={(id, roomName) => {
          setActiveVideoSession({ id, roomName, isRecording: false });
        }}
      />
      
      {/* Active Video Session Viewer */}
      {activeVideoSession && (
        <VideoSessionViewer
          sessionId={activeVideoSession.id}
          roomName={activeVideoSession.roomName}
          isRecordingEnabled={activeVideoSession.isRecording}
          onClose={() => setActiveVideoSession(null)}
        />
      )}
    </>
  );
}
