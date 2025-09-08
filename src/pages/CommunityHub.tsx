import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MobileBottomNav } from '@/components/community/MobileBottomNav';
import { FloatingActionButton } from '@/components/community/FloatingActionButton';
import { UnifiedFeed } from '@/components/community/UnifiedFeed';
import { UserProgressWidget } from '@/components/community/UserProgressWidget';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';
import { NotificationsInterface } from '@/components/notifications/NotificationsInterface';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { UnifiedEntry, UserProgress } from '@/types/unified-feed';
import { 
  Heart, 
  Activity,
  Users,
  Sparkles,
  Grid3x3,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';

const CommunityHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'feed');
  const [loveViewMode, setLoveViewMode] = useState<'feed' | 'grid'>('feed');
  const isMobile = useIsMobile();

  // Mock data - replace with real data from hooks
  const mockEntries: UnifiedEntry[] = [
    {
      id: '1',
      type: 'announcement',
      title: 'Welcome New Members!',
      content: 'We\'re excited to welcome 12 new members to the Spelman Glee Club family! Please join us in making them feel at home.',
      author: { id: '1', name: 'Dr. Johnson', avatar: '', role: 'Director' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      visibility: 'members',
      reactions: [
        { type: 'heart', count: 24, userReacted: true },
        { type: 'clap', count: 8, userReacted: false }
      ],
      engagement: { views: 156, shares: 3, replies: 7 },
      tags: ['welcome', 'new-members']
    },
    {
      id: '2',
      type: 'love_note',
      content: 'Your solo in today\'s rehearsal gave me chills! You\'ve grown so much as a performer. Keep shining! ✨',
      author: { id: '2', name: 'Sarah M.', avatar: '', role: 'Soprano' },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      visibility: 'members',
      reactions: [
        { type: 'heart', count: 12, userReacted: false },
        { type: 'star', count: 5, userReacted: true }
      ],
      engagement: { views: 45, shares: 1, replies: 2 },
      metadata: { color: 'pink', recipient: 'Jessica T.' }
    },
    {
      id: '3',
      type: 'wellness_check',
      title: 'Daily Wellness Check',
      content: 'Feeling energized and ready for tonight\'s performance! Did my vocal warm-ups and staying hydrated 💧',
      author: { id: '3', name: 'Maya L.', avatar: '', role: 'Alto' },
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      visibility: 'members',
      reactions: [
        { type: 'thumbs_up', count: 18, userReacted: true },
        { type: 'heart', count: 6, userReacted: false }
      ],
      engagement: { views: 78, shares: 2, replies: 4 },
      metadata: { 
        wellness_score: 8, 
        streak_day: 14,
        badge_earned: 'wellness_streak_14'
      }
    }
  ];

  const mockUserProgress: UserProgress = {
    user_id: 'current-user',
    wellness_streak: 14,
    love_streak: 7,
    total_contributions: 89,
    badges: ['wellness_streak_14', 'love_streak_7', 'community_contributor'],
    level: 3,
    points: 2890
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['feed', 'wellness', 'love', 'messages'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleReaction = (entryId: string, reaction: string) => {
    console.log('Reaction:', entryId, reaction);
    // Handle reaction logic
  };

  const handleShare = (entryId: string) => {
    console.log('Share:', entryId);
    // Handle share logic
  };

  const handleReply = (entryId: string) => {
    console.log('Reply:', entryId);
    // Handle reply logic
  };

  const handleFloatingAction = (action: 'announcement' | 'wellness' | 'love' | 'message') => {
    console.log('Floating action:', action);
    // Handle floating action logic
  };

  if (!isMobile) {
    // Desktop layout - keep existing structure but simplified
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                Community Hub
              </h1>
              <p className="text-muted-foreground">
                Your unified space for community interactions
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Glee Community
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Feed */}
            <div className="lg:col-span-3">
              <UnifiedFeed 
                entries={mockEntries}
                onReaction={handleReaction}
                onShare={handleShare}
                onReply={handleReply}
              />
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <UserProgressWidget progress={mockUserProgress} />
              <BucketsOfLoveWidget />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout with bottom navigation
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Community
            </h1>
            <Badge variant="secondary" className="text-xs">
              Level {mockUserProgress.level}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {activeTab === 'feed' && (
          <>
            <UserProgressWidget progress={mockUserProgress} compact />
            <UnifiedFeed 
              entries={mockEntries}
              onReaction={handleReaction}
              onShare={handleShare}
              onReply={handleReply}
            />
          </>
        )}

        {activeTab === 'wellness' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Wellness Check-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VocalHealthLog />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'love' && (
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Buckets of Love</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={loveViewMode === 'feed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLoveViewMode('feed')}
                  className="text-xs h-7"
                >
                  Feed
                </Button>
                <Button
                  variant={loveViewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLoveViewMode('grid')}
                  className="text-xs h-7 gap-1"
                >
                  <Grid3x3 className="h-3 w-3" />
                  Grid
                </Button>
              </div>
            </div>

            {loveViewMode === 'feed' ? (
              <UnifiedFeed 
                entries={mockEntries.filter(e => e.type === 'love_note')}
                onReaction={handleReaction}
                onShare={handleShare}
                onReply={handleReply}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockEntries.filter(e => e.type === 'love_note').map(entry => (
                  <Card key={entry.id} className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/20 dark:to-pink-900/20">
                    <div className="space-y-2">
                      <p className="text-sm text-pink-700 dark:text-pink-300">
                        "{entry.content}"
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>From {entry.author.name}</span>
                        <Heart className="h-3 w-3 text-pink-500" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="gap-2 h-12">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button variant="outline" className="gap-2 h-12">
                    <Phone className="h-4 w-4" />
                    SMS
                  </Button>
                </div>
                <NotificationsInterface />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasNotifications={{
          feed: true,
          wellness: false,
          love: true,
          messages: false
        }}
      />

      {/* Floating Action Button */}
      <FloatingActionButton 
        activeTab={activeTab}
        onAction={handleFloatingAction}
      />
    </div>
  );
};

export default CommunityHub;