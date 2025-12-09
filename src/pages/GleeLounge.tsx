import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGleeLoungePresence } from '@/hooks/useGleeLoungePresence';
import { CreatePostCard } from '@/components/glee-lounge/CreatePostCard';
import { SocialFeed } from '@/components/glee-lounge/SocialFeed';
import { OnlineNowWidget } from '@/components/glee-lounge/OnlineNowWidget';
import { OnlineSidebar } from '@/components/glee-lounge/OnlineSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Sofa, Plus, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function GleeLounge() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileCreate, setShowMobileCreate] = useState(false);
  const [showMobileOnline, setShowMobileOnline] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { onlineUsers, isConnected } = useGleeLoungePresence();

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

  return (
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

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Connected
              </span>
            )}
          </div>
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
              <CreatePostCard userProfile={userProfile} />
            </div>

            {/* Mobile: Create post sheet */}
            <div className="lg:hidden">
              <Sheet open={showMobileCreate} onOpenChange={setShowMobileCreate}>
                <SheetContent side="bottom" className="h-auto max-h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Create Post</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <CreatePostCard
                      userProfile={userProfile}
                      onPostCreated={() => setShowMobileCreate(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Feed */}
            <SocialFeed userProfile={userProfile} />
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
}
