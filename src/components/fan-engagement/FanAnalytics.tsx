import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, Heart, MessageSquare, Star, Calendar, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  totalFans: number;
  activePosts: number;
  featuredContent: number;
  engagementRate: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  popularContent: Array<{
    id: string;
    title: string;
    type: string;
    views: number;
    engagement: number;
  }>;
}

export const FanAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalFans: 0,
    activePosts: 0,
    featuredContent: 0,
    engagementRate: 0,
    recentActivity: [],
    popularContent: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch fan count
      const { data: fanData, error: fanError } = await supabase
        .from('gw_profiles')
        .select('user_id', { count: 'exact' })
        .eq('role', 'fan');
      
      if (fanError) throw fanError;

      // Fetch active posts
      const { data: postsData, error: postsError } = await supabase
        .from('bulletin_posts')
        .select('id', { count: 'exact' })
        .eq('is_public', true);
      
      if (postsError) throw postsError;

      // Fetch featured content
      const { data: featuredData, error: featuredError } = await supabase
        .from('gw_spotlight_content')
        .select('id', { count: 'exact' })
        .eq('is_featured', true)
        .eq('is_active', true);
      
      if (featuredError) throw featuredError;

      // Fetch recent bulletin posts for activity
      const { data: recentPosts, error: recentError } = await supabase
        .from('bulletin_posts')
        .select('title, created_at, category')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentError) throw recentError;

      // Fetch popular spotlight content
      const { data: spotlightData, error: spotlightError } = await supabase
        .from('gw_spotlight_content')
        .select('id, title, spotlight_type, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (spotlightError) throw spotlightError;

      // Process recent activity
      const recentActivity = recentPosts?.map(post => ({
        type: 'post',
        description: `New ${post.category} post: "${post.title}"`,
        timestamp: post.created_at
      })) || [];

      // Process popular content (mock engagement data for now)
      const popularContent = spotlightData?.map((content, index) => ({
        id: content.id,
        title: content.title,
        type: content.spotlight_type,
        views: Math.floor(Math.random() * 1000) + 100,
        engagement: Math.floor(Math.random() * 100) + 20
      })) || [];

      setAnalyticsData({
        totalFans: fanData?.length || 0,
        activePosts: postsData?.length || 0,
        featuredContent: featuredData?.length || 0,
        engagementRate: Math.floor(Math.random() * 20) + 75, // Mock data
        recentActivity: recentActivity.slice(0, 5),
        popularContent
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'day':
        return 'Last 24 Hours';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      default:
        return 'Last 7 Days';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fans</p>
                <p className="text-2xl font-bold">{analyticsData.totalFans}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12% from last {timeRange}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Posts</p>
                <p className="text-2xl font-bold">{analyticsData.activePosts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +3 this {timeRange}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
                <p className="text-2xl font-bold">{analyticsData.engagementRate}%</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +5% from last {timeRange}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Featured Content</p>
                <p className="text-2xl font-bold">{analyticsData.featuredContent}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center text-sm text-blue-600">
              <Eye className="h-4 w-4 mr-1" />
              Active featured items
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Popular Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.recentActivity.length > 0 ? (
                analyticsData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline">{activity.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity to display
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.popularContent.length > 0 ? (
                analyticsData.popularContent.map((content, index) => (
                  <div key={content.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <p className="text-sm font-medium line-clamp-1">{content.title}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{content.views} views</span>
                        <span>{content.engagement}% engagement</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{content.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No content data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download detailed analytics reports for {getTimeRangeLabel().toLowerCase()}
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
              Export as CSV
            </button>
            <button className="px-4 py-2 border border-input rounded-md text-sm hover:bg-accent">
              Export as PDF
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};