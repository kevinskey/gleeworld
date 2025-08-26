import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  Eye, 
  Settings, 
  Users, 
  Activity, 
  Globe,
  Calendar,
  Music,
  Image,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  Gift,
  Ticket
} from 'lucide-react';

interface FanEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  event_type: string;
  is_public: boolean;
  [key: string]: any; // Allow additional fields from database
}

interface Product {
  id: string;
  name?: string;
  title?: string; // Alternative name field
  price: number;
  is_active: boolean;
  category?: string;
  product_type?: string; // Alternative category field
  inventory_count?: number;
  inventory_quantity?: number; // Alternative inventory field
  [key: string]: any; // Allow additional fields
}

interface FanDashboardData {
  events: FanEvent[];
  exclusiveContent: any[];
  products: Product[];
  videos: any[];
  announcements: any[];
  fanPerks: any[];
}

interface FanAnalytics {
  totalFans: number;
  activeFans: number;
  rsvpCount: number;
  purchaseCount: number;
}

export const FanDashboardMonitor = () => {
  const [dashboardData, setDashboardData] = useState<FanDashboardData>({
    events: [],
    exclusiveContent: [],
    products: [],
    videos: [],
    announcements: [],
    fanPerks: []
  });
  const [analytics, setAnalytics] = useState<FanAnalytics>({
    totalFans: 0,
    activeFans: 0,
    rsvpCount: 0,
    purchaseCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchFanDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch fan-accessible events
      const { data: events } = await supabase
        .from('gw_events')
        .select('*')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(10);

      // Fetch fan profiles count
      const { count: fanCount } = await supabase
        .from('gw_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'fan');

      // Fetch active products
      const { data: products } = await supabase
        .from('gw_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      // Fetch featured videos
      const { data: videos } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(6);

      // Fetch announcements
      const { data: announcements } = await supabase
        .from('gw_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setDashboardData({
        events: events || [],
        exclusiveContent: [],
        products: products || [],
        videos: videos || [],
        announcements: announcements || [],
        fanPerks: []
      });

      setAnalytics({
        totalFans: fanCount || 0,
        activeFans: Math.floor((fanCount || 0) * 0.7), // Estimate active fans
        rsvpCount: 0,
        purchaseCount: 0
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching fan dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFanDashboardData();
  }, []);

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Heart className="h-8 w-8" />
            Fan Dashboard Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage what fans see on their dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            onClick={fetchFanDashboardData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href="/dashboard/fan" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              View Fan Dashboard
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Fans</p>
                <p className="text-2xl font-bold">{analytics.totalFans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Fan Events</p>
                <p className="text-2xl font-bold">{dashboardData.events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{dashboardData.products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Featured Content</p>
                <p className="text-2xl font-bold">{dashboardData.videos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Content Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Fan Events</TabsTrigger>
          <TabsTrigger value="products">Merchandise</TabsTrigger>
          <TabsTrigger value="content">Media Content</TabsTrigger>
          <TabsTrigger value="perks">Fan Perks</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events Available to Fans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.events.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="outline">{event.event_type}</Badge>
                          <Badge variant="secondary">
                            <Ticket className="h-3 w-3 mr-1" />
                            Available to Fans
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.start_date)} • {event.location || 'Location TBD'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming fan events</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Create Fan Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Fan Merchandise & Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name || product.title || 'Unnamed Product'}</h4>
                          <p className="text-lg font-bold text-primary mt-1">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        {getStatusBadge(product.is_active)}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Category: {product.category || product.product_type || 'General'}</span>
                        {(product.inventory_count || product.inventory_quantity) && (
                          <span>Stock: {product.inventory_count || product.inventory_quantity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active products available</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Products
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Featured Media Content for Fans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.videos.map((video) => (
                    <div key={video.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-16 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {video.view_count.toLocaleString()} views
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(video.published_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No featured content available</p>
                  <p className="text-sm mt-2">Sync content to display to fans</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Fan Perks & Exclusive Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Early Event Access</h4>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fans get priority RSVP access to concerts and events
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Exclusive Content</h4>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access to behind-the-scenes videos and recordings
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Merchandise Discounts</h4>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Special pricing on Glee Club merchandise
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};