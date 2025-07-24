import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, MousePointer, Share2, TrendingUp, Calendar, User } from "lucide-react";
import { SpotlightContent } from "@/hooks/useSpotlightContent";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SpotlightAnalyticsProps {
  spotlights: SpotlightContent[];
}

interface AnalyticsData {
  spotlight_id: string;
  action_type: string;
  created_at: string;
  spotlight_title: string;
  spotlight_type: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const SpotlightAnalytics = ({ spotlights }: SpotlightAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [spotlights]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gw_spotlight_analytics')
        .select(`
          spotlight_id,
          action_type,
          created_at,
          spotlight_content:gw_spotlight_content(title, spotlight_type)
        `)
        .gte('created_at', subDays(new Date(), 30).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = data?.map(item => ({
        spotlight_id: item.spotlight_id,
        action_type: item.action_type,
        created_at: item.created_at,
        spotlight_title: (item.spotlight_content as any)?.title || 'Unknown',
        spotlight_type: (item.spotlight_content as any)?.spotlight_type || 'unknown'
      })) || [];

      setAnalytics(processedData);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overview stats
  const totalViews = analytics.filter(a => a.action_type === 'view').length;
  const totalClicks = analytics.filter(a => a.action_type === 'click').length;
  const totalShares = analytics.filter(a => a.action_type === 'share').length;
  
  // Top performing content
  const contentPerformance = spotlights.map(spotlight => {
    const views = analytics.filter(a => a.spotlight_id === spotlight.id && a.action_type === 'view').length;
    const clicks = analytics.filter(a => a.spotlight_id === spotlight.id && a.action_type === 'click').length;
    const shares = analytics.filter(a => a.spotlight_id === spotlight.id && a.action_type === 'share').length;
    
    return {
      id: spotlight.id,
      title: spotlight.title,
      type: spotlight.spotlight_type,
      views,
      clicks,
      shares,
      total: views + clicks + shares,
      is_featured: spotlight.is_featured,
      is_active: spotlight.is_active
    };
  }).sort((a, b) => b.total - a.total);

  // Daily activity data for the last 7 days
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayAnalytics = analytics.filter(a => {
      const createdAt = new Date(a.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });

    return {
      date: format(date, 'MMM dd'),
      views: dayAnalytics.filter(a => a.action_type === 'view').length,
      clicks: dayAnalytics.filter(a => a.action_type === 'click').length,
      shares: dayAnalytics.filter(a => a.action_type === 'share').length
    };
  }).reverse();

  // Content type distribution
  const typeData = Object.entries(
    analytics.reduce((acc, item) => {
      acc[item.spotlight_type] = (acc[item.spotlight_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    name: type,
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-blue-600">{totalViews}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold text-green-600">{totalClicks}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <MousePointer className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shares</p>
                <p className="text-2xl font-bold text-purple-600">{totalShares}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Share2 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Content</p>
                <p className="text-2xl font-bold text-gray-900">
                  {spotlights.filter(s => s.is_active).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Content Performance</TabsTrigger>
          <TabsTrigger value="trends">Activity Trends</TabsTrigger>
          <TabsTrigger value="distribution">Type Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>
                Spotlight content ranked by total engagement (views, clicks, shares)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentPerformance.slice(0, 10).map((content, index) => (
                  <div key={content.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{content.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {content.type}
                          </Badge>
                          {content.is_featured && (
                            <Badge variant="outline" className="text-xs text-yellow-600">
                              Featured
                            </Badge>
                          )}
                          {!content.is_active && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{content.views}</p>
                        <p className="text-gray-500">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-green-600">{content.clicks}</p>
                        <p className="text-gray-500">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-purple-600">{content.shares}</p>
                        <p className="text-gray-500">Shares</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-900">{content.total}</p>
                        <p className="text-gray-500">Total</p>
                      </div>
                    </div>
                  </div>
                ))}

                {contentPerformance.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No analytics data available yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
              <CardDescription>
                View user engagement patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#3B82F6" name="Views" />
                    <Bar dataKey="clicks" fill="#10B981" name="Clicks" />
                    <Bar dataKey="shares" fill="#8B5CF6" name="Shares" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown of engagement by content type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest user interactions with spotlight content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded border">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action_type}</span> on{' '}
                          <span className="font-medium">{activity.spotlight_title}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {analytics.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};