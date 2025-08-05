import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Eye, 
  Users, 
  Heart, 
  Share2, 
  Camera, 
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';

// Mock data for analytics
const viewsData = [
  { month: 'Jan', views: 1200, engagement: 68 },
  { month: 'Feb', views: 1400, engagement: 72 },
  { month: 'Mar', views: 1800, engagement: 85 },
  { month: 'Apr', views: 2200, engagement: 91 },
  { month: 'May', views: 2600, engagement: 89 },
  { month: 'Jun', views: 3100, engagement: 95 }
];

const contentTypeData = [
  { name: 'Concert Photos', value: 45, color: '#8884d8' },
  { name: 'Behind the Scenes', value: 25, color: '#82ca9d' },
  { name: 'Rehearsal Videos', value: 20, color: '#ffc658' },
  { name: 'Press Releases', value: 10, color: '#ff7300' }
];

const socialMediaData = [
  { platform: 'Instagram', followers: 5200, engagement: 4.2, growth: 12 },
  { platform: 'Facebook', followers: 3800, engagement: 3.1, growth: 8 },
  { platform: 'Twitter', followers: 2100, engagement: 2.8, growth: 15 },
  { platform: 'YouTube', followers: 1500, engagement: 6.5, growth: 22 }
];

const recentMetrics = [
  { 
    title: 'Total Media Views', 
    value: '47.2K', 
    change: '+12%', 
    icon: Eye, 
    trend: 'up' 
  },
  { 
    title: 'Engagement Rate', 
    value: '4.8%', 
    change: '+0.3%', 
    icon: Heart, 
    trend: 'up' 
  },
  { 
    title: 'Media Shares', 
    value: '892', 
    change: '+18%', 
    icon: Share2, 
    trend: 'up' 
  },
  { 
    title: 'Press Mentions', 
    value: '24', 
    change: '+6%', 
    icon: Camera, 
    trend: 'up' 
  }
];

export const PRAnalytics = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [isLoading, setIsLoading] = useState(false);

  const handleExportData = () => {
    setIsLoading(true);
    // Simulate export process
    setTimeout(() => {
      setIsLoading(false);
      // Create CSV content
      const csvContent = `Date,Views,Engagement,Platform,Content Type
${viewsData.map(item => `${item.month},${item.views},${item.engagement}%,All Platforms,Mixed`).join('\n')}`;
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pr-analytics-${selectedTimeframe}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">PR Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track performance and engagement across all PR initiatives</p>
        </div>
        <Button 
          onClick={handleExportData} 
          disabled={isLoading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isLoading ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recentMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant={metric.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                      {metric.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <metric.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views and Engagement Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Views & Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Views"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Engagement %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Content Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Content Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={contentTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {contentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance Analysis</CardTitle>
              <p className="text-muted-foreground">
                Detailed breakdown of how different content types are performing
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentTypeData.map((content) => (
                  <div key={content.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: content.color }}
                      />
                      <span className="font-medium">{content.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={content.value} className="w-32" />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {content.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Performance</CardTitle>
              <p className="text-muted-foreground">
                Track followers, engagement, and growth across all social platforms
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialMediaData.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{platform.platform}</h4>
                      <p className="text-sm text-muted-foreground">
                        {platform.followers.toLocaleString()} followers
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">{platform.engagement}%</p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                      <Badge variant={platform.growth > 10 ? 'default' : 'secondary'}>
                        +{platform.growth}% growth
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-medium">Best Performing Day</h4>
                    <p className="text-sm text-muted-foreground">Friday evenings</p>
                    <p className="text-lg font-bold text-green-600">+25% engagement</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-medium">Top Audience</h4>
                    <p className="text-sm text-muted-foreground">Age 18-34</p>
                    <p className="text-lg font-bold text-blue-600">68% of views</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h4 className="font-medium">Peak Season</h4>
                    <p className="text-sm text-muted-foreground">Spring semester</p>
                    <p className="text-lg font-bold text-purple-600">+40% activity</p>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Concert photos receive 3x more engagement than other content types</li>
                    <li>• Instagram Stories have the highest completion rate at 89%</li>
                    <li>• Video content performs best on weekends</li>
                    <li>• Press releases shared during weekdays get more media pickup</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};