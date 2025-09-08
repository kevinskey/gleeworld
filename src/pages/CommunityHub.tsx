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
    // Desktop layout - simplified version without complex components
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
            {/* Main Feed - simplified */}
            <div className="lg:col-span-3 space-y-4">
              {mockEntries.map((entry) => (
                <Card key={entry.id} className="bg-white">
                  <CardContent className="p-4">
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
                      <div className="flex-1">
                        {entry.title && <h3 className="font-semibold mb-1">{entry.title}</h3>}
                        <p className="text-sm text-gray-700">{entry.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <BucketsOfLoveWidget />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout with bottom navigation
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Community Hub</h1>
            </div>
            <Button
              size="sm"
              onClick={() => handleFloatingAction('announcement')}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
            >
              <Plus className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Top Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-6 border-b border-gray-100">
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
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                )}
                onClick={() => id === 'all' ? handleTabChange('feed') : handleTabChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-3 max-w-full overflow-hidden">
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {mockEntries.map((entry) => (
              <Card key={entry.id} className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-600 capitalize">
                              {entry.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(entry.timestamp, { addSuffix: true }).replace('about ', '')}
                            </span>
                          </div>
                          {entry.title && (
                            <h3 className="text-base font-semibold text-gray-900 mb-1">
                              {entry.title}
                            </h3>
                          )}
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {entry.content}
                          </p>

                          {/* Streak Display */}
                          {entry.metadata?.streak_day && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-lg">😊</span>
                              <span className="text-sm font-medium text-gray-600">
                                {entry.metadata.streak_day}-day streak
                              </span>
                            </div>
                          )}

                          {/* Author for love notes */}
                          {entry.type === 'love_note' && (
                            <div className="mt-2 text-xs text-gray-500">
                              {entry.author.name} • {formatDistanceToNow(entry.timestamp, { addSuffix: true }).replace('about ', '')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reactions */}
                      {entry.reactions && entry.reactions.length > 0 && (
                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
                          {entry.reactions.map((reaction) => (
                            <button
                              key={reaction.type}
                              onClick={() => handleReaction(entry.id, reaction.type)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Other tabs remain the same but simplified */}
        {activeTab === 'wellness' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Activity className="h-5 w-5" />
                Daily Wellness Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VocalHealthLog />
            </CardContent>
          </Card>
        )}

        {activeTab === 'love' && (
          <div className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600">
                  <Heart className="h-5 w-5" />
                  Send Love Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BucketsOfLoveWidget />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'messages' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationsInterface />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="grid grid-cols-4 py-2">
          {[
            { id: 'feed', label: 'Feed', icon: Home, color: 'text-blue-500' },
            { id: 'wellness', label: 'Wellness', icon: Activity, color: 'text-green-500' },
            { id: 'love', label: 'Love', icon: Heart, color: 'text-pink-500' },
            { id: 'messages', label: 'Messages', icon: Mail, color: 'text-purple-500' }
          ].map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 transition-colors",
                activeTab === id ? color : "text-gray-400"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                activeTab === id ? `${color.replace('text-', 'bg-')}/10` : ""
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