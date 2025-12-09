import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { formatDistanceToNow, format, startOfDay, subDays } from 'date-fns';
import {
  Armchair,
  BarChart3,
  MessageSquare,
  Heart,
  Users,
  TrendingUp,
  Eye,
  Calendar,
  Activity,
  Loader2,
  RefreshCw,
  Shield,
  Settings,
  Image,
} from 'lucide-react';

interface AnalyticsData {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  uniquePosters: number;
  postsToday: number;
  postsThisWeek: number;
  avgPostsPerDay: number;
  topPosters: { user_id: string; full_name: string; avatar_url: string | null; post_count: number }[];
  recentActivity: { type: string; user_name: string; created_at: string; content: string }[];
  mediaStats: { withMedia: number; withoutMedia: number };
  locationStats: { withLocation: number; withoutLocation: number };
}

interface LoungeSettings {
  allowPosts: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  allowMedia: boolean;
  requireApproval: boolean;
}

export function GleeLoungeAnalyticsModule() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [settings, setSettings] = useState<LoungeSettings>({
    allowPosts: true,
    allowComments: true,
    allowReactions: true,
    allowMedia: true,
    requireApproval: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    try {
      // Fetch total posts
      const { count: totalPosts } = await supabase
        .from('gw_social_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', false);

      // Fetch total comments
      const { count: totalComments } = await supabase
        .from('gw_social_comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', false);

      // Fetch total reactions
      const { count: totalReactions } = await supabase
        .from('gw_social_reactions')
        .select('*', { count: 'exact', head: true });

      // Fetch unique posters
      const { data: uniquePostersData } = await supabase
        .from('gw_social_posts')
        .select('user_id')
        .eq('is_hidden', false);
      const uniquePosters = new Set(uniquePostersData?.map(p => p.user_id)).size;

      // Fetch posts today
      const today = startOfDay(new Date()).toISOString();
      const { count: postsToday } = await supabase
        .from('gw_social_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
        .eq('is_hidden', false);

      // Fetch posts this week
      const weekAgo = subDays(new Date(), 7).toISOString();
      const { count: postsThisWeek } = await supabase
        .from('gw_social_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo)
        .eq('is_hidden', false);

      // Fetch top posters
      const { data: postsData } = await supabase
        .from('gw_social_posts')
        .select('user_id')
        .eq('is_hidden', false);

      const posterCounts: Record<string, number> = {};
      postsData?.forEach(p => {
        posterCounts[p.user_id] = (posterCounts[p.user_id] || 0) + 1;
      });

      const topPosterIds = Object.entries(posterCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const topPosters: AnalyticsData['topPosters'] = [];
      for (const [userId, count] of topPosterIds) {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', userId)
          .single();
        
        topPosters.push({
          user_id: userId,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          post_count: count,
        });
      }

      // Fetch recent activity
      const { data: recentPosts } = await supabase
        .from('gw_social_posts')
        .select('id, user_id, content, created_at')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity: AnalyticsData['recentActivity'] = [];
      for (const post of recentPosts || []) {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('user_id', post.user_id)
          .single();
        
        recentActivity.push({
          type: 'post',
          user_name: profile?.full_name || 'Unknown',
          created_at: post.created_at,
          content: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : '') || '',
        });
      }

      // Media stats
      const { data: mediaPosts } = await supabase
        .from('gw_social_posts')
        .select('media_urls')
        .eq('is_hidden', false);

      const withMedia = mediaPosts?.filter(p => p.media_urls && p.media_urls.length > 0).length || 0;
      const withoutMedia = (mediaPosts?.length || 0) - withMedia;

      // Location stats
      const { data: locationPosts } = await supabase
        .from('gw_social_posts')
        .select('location_tag')
        .eq('is_hidden', false);

      const withLocation = locationPosts?.filter(p => p.location_tag).length || 0;
      const withoutLocation = (locationPosts?.length || 0) - withLocation;

      // Calculate avg posts per day (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { count: last30DaysPosts } = await supabase
        .from('gw_social_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo)
        .eq('is_hidden', false);
      const avgPostsPerDay = Math.round(((last30DaysPosts || 0) / 30) * 10) / 10;

      setAnalytics({
        totalPosts: totalPosts || 0,
        totalComments: totalComments || 0,
        totalReactions: totalReactions || 0,
        uniquePosters,
        postsToday: postsToday || 0,
        postsThisWeek: postsThisWeek || 0,
        avgPostsPerDay,
        topPosters,
        recentActivity,
        mediaStats: { withMedia, withoutMedia },
        locationStats: { withLocation, withoutLocation },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('dashboard_settings')
        .select('setting_name, setting_value')
        .like('setting_name', 'glee_lounge_%');

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach(s => {
          settingsMap[s.setting_name] = s.setting_value || '';
        });

        setSettings({
          allowPosts: settingsMap['glee_lounge_allow_posts'] !== 'false',
          allowComments: settingsMap['glee_lounge_allow_comments'] !== 'false',
          allowReactions: settingsMap['glee_lounge_allow_reactions'] !== 'false',
          allowMedia: settingsMap['glee_lounge_allow_media'] !== 'false',
          requireApproval: settingsMap['glee_lounge_require_approval'] === 'true',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSetting = async (key: keyof LoungeSettings, value: boolean) => {
    try {
      const settingName = `glee_lounge_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
      
      await supabase
        .from('dashboard_settings')
        .upsert({
          setting_name: settingName,
          setting_value: value.toString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_name',
        });

      setSettings(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: 'Setting updated',
        description: `${key} has been ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error updating setting',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAnalytics(), fetchSettings()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Armchair className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Glee Lounge Analytics</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <TrendingUp className="h-4 w-4 mr-1" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-1" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Total Posts</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.totalPosts || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Comments</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.totalComments || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Reactions</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.totalReactions || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Active Members</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.uniquePosters || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Posts Today</span>
                </div>
                <p className="text-xl font-bold">{analytics?.postsToday || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm text-muted-foreground">Posts This Week</span>
                </div>
                <p className="text-xl font-bold">{analytics?.postsThisWeek || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-pink-500" />
                  <span className="text-sm text-muted-foreground">Avg Posts/Day</span>
                </div>
                <p className="text-xl font-bold">{analytics?.avgPostsPerDay || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Media Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>With Media</span>
                    <span className="font-medium">{analytics?.mediaStats.withMedia || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Text Only</span>
                    <span className="font-medium">{analytics?.mediaStats.withoutMedia || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Location Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>With Location</span>
                    <span className="font-medium">{analytics?.locationStats.withLocation || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Without Location</span>
                    <span className="font-medium">{analytics?.locationStats.withoutLocation || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.topPosters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No posts yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics?.topPosters.map((poster, index) => (
                    <div key={poster.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarUrl(poster.avatar_url) || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(poster.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{poster.full_name}</span>
                      </div>
                      <Badge variant="outline">{poster.post_count} posts</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                {analytics?.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics?.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                        <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.user_name}</span> posted
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            "{activity.content}"
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Lounge Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowPosts" className="font-medium">Allow New Posts</Label>
                  <p className="text-sm text-muted-foreground">Members can create new posts</p>
                </div>
                <Switch
                  id="allowPosts"
                  checked={settings.allowPosts}
                  onCheckedChange={(checked) => updateSetting('allowPosts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowComments" className="font-medium">Allow Comments</Label>
                  <p className="text-sm text-muted-foreground">Members can comment on posts</p>
                </div>
                <Switch
                  id="allowComments"
                  checked={settings.allowComments}
                  onCheckedChange={(checked) => updateSetting('allowComments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowReactions" className="font-medium">Allow Reactions</Label>
                  <p className="text-sm text-muted-foreground">Members can react to posts</p>
                </div>
                <Switch
                  id="allowReactions"
                  checked={settings.allowReactions}
                  onCheckedChange={(checked) => updateSetting('allowReactions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowMedia" className="font-medium">Allow Media Uploads</Label>
                  <p className="text-sm text-muted-foreground">Members can upload photos and videos</p>
                </div>
                <Switch
                  id="allowMedia"
                  checked={settings.allowMedia}
                  onCheckedChange={(checked) => updateSetting('allowMedia', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireApproval" className="font-medium">Require Post Approval</Label>
                  <p className="text-sm text-muted-foreground">Posts require admin approval before appearing</p>
                </div>
                <Switch
                  id="requireApproval"
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => updateSetting('requireApproval', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
