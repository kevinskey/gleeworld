import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { UnifiedEntry, UserProgress, ENTRY_COLORS } from '@/types/unified-feed';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';
import { NotificationsInterface } from '@/components/notifications/NotificationsInterface';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { PageShell, PageCard, ProseWrapper } from '@/components/community/PageShell';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Heart, 
  Activity,
  Users,
  Sparkles,
  MessageSquare,
  Mail,
  Phone,
  Plus,
  Home,
  Megaphone,
  ThumbsUp,
  Star
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
    // Desktop layout using PageShell
    return (
      <PageShell
        title="Community Hub"
        subtitle="Your unified space for community interactions"
        actions={
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Glee Community
          </Badge>
        }
        useGrid={true}
        gridCols="grid-cols-1 lg:grid-cols-4"
        maxWidth="7xl"
      >
        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6 lg:space-y-8">
          {mockEntries.map((entry) => (
            <PageCard key={entry.id}>
              <div className="flex gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${ENTRY_COLORS[entry.type]}20` }}
                >
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
                  >
                    {entry.type === 'announcement' && <Megaphone className="h-3 w-3 text-white" />}
                    {entry.type === 'wellness_check' && <Activity className="h-3 w-3 text-white" />}
                    {entry.type === 'love_note' && <Heart className="h-3 w-3 text-white fill-current" />}
                    {entry.type === 'message' && <Mail className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1 space-y-3 md:space-y-4">
                  {entry.title && (
                    <h3 className="text-lg md:text-xl font-semibold leading-tight">
                      {entry.title}
                    </h3>
                  )}
                  <ProseWrapper>
                    <p>{entry.content}</p>
                  </ProseWrapper>
                </div>
              </div>
            </PageCard>
          ))}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6 lg:space-y-8">
          <BucketsOfLoveWidget />
        </div>
      </PageShell>
    );
  }

  // Mobile layout with bottom navigation using responsive spacing
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-card border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">Community Hub</h1>
            </div>
            <Button
              size="sm"
              onClick={() => handleFloatingAction('announcement')}
              className="w-10 h-10 rounded-full p-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Top Filter Tabs */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex gap-6 border-b">
            {[
              { id: 'all', label: 'All' },
              { id: 'announcements', label: 'Announcements' },
              { id: 'love', label: 'Love' },
              { id: 'wellness', label: 'Wellness' }
            ].map(({ id, label }) => (
              <button
                key={id}
                className={cn(
                  "pb-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'feed' && id === 'all'
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
                onClick={() => id === 'all' ? handleTabChange('feed') : handleTabChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content with responsive spacing */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 md:space-y-6 max-w-full overflow-hidden">
        {activeTab === 'feed' && (
          <div className="space-y-4 md:space-y-6">
            {mockEntries.map((entry) => (
              <PageCard key={entry.id}>
                <div className="flex gap-3">
                  {/* Icon */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${ENTRY_COLORS[entry.type]}20` }}
                  >
                    {entry.type === 'announcement' && (
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
                      >
                        <Megaphone className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {entry.type === 'wellness_check' && (
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
                      >
                        <Activity className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {entry.type === 'love_note' && (
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
                      >
                        <Heart className="h-3 w-3 text-white fill-current" />
                      </div>
                    )}
                    {entry.type === 'message' && (
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
                      >
                        <Mail className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {entry.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(entry.timestamp, { addSuffix: true }).replace('about ', '')}
                          </span>
                        </div>
                        {entry.title && (
                          <h3 className="text-base md:text-lg font-semibold leading-tight">
                            {entry.title}
                          </h3>
                        )}
                        <ProseWrapper className="prose-sm md:prose-base">
                          <p>{entry.content}</p>
                        </ProseWrapper>

                        {/* Streak Display */}
                        {entry.metadata?.streak_day && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">😊</span>
                            <span className="text-sm font-medium text-muted-foreground">
                              {entry.metadata.streak_day}-day streak
                            </span>
                          </div>
                        )}

                        {/* Author for love notes */}
                        {entry.type === 'love_note' && (
                          <div className="text-xs text-muted-foreground">
                            {entry.author.name} • {formatDistanceToNow(entry.timestamp, { addSuffix: true }).replace('about ', '')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {entry.reactions && entry.reactions.length > 0 && (
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                        {entry.reactions.map((reaction) => (
                          <button
                            key={reaction.type}
                            onClick={() => handleReaction(entry.id, reaction.type)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {reaction.type === 'heart' && <Heart className="h-3 w-3" />}
                            {reaction.type === 'thumbs_up' && <ThumbsUp className="h-3 w-3" />}
                            {reaction.type === 'star' && <Star className="h-3 w-3" />}
                            {reaction.type === 'clap' && <span>👏</span>}
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PageCard>
            ))}
          </div>
        )}

        {/* Other tabs with consistent spacing */}
        {activeTab === 'wellness' && (
          <PageCard
            title="Daily Wellness Check"
            description="Track your vocal health and overall wellbeing"
          >
            <VocalHealthLog />
          </PageCard>
        )}

        {activeTab === 'love' && (
          <PageCard
            title="Send Love Note"
            description="Share appreciation with your fellow Glee Club members"
          >
            <BucketsOfLoveWidget />
          </PageCard>
        )}

        {activeTab === 'messages' && (
          <PageCard
            title="Messages"
            description="Stay connected with notifications and updates"
          >
            <NotificationsInterface />
          </PageCard>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t safe-area-pb">
        <div className="grid grid-cols-4 py-2">
          {[
            { id: 'feed', label: 'Feed', icon: Home },
            { id: 'wellness', label: 'Wellness', icon: Activity },
            { id: 'love', label: 'Love', icon: Heart },
            { id: 'messages', label: 'Messages', icon: Mail }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 transition-colors",
                activeTab === id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                activeTab === id ? "bg-primary/10" : ""
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;