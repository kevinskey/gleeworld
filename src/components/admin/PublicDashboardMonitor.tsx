import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Monitor, 
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
  Edit3,
  Trash2,
  Save,
  X,
  Plus,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean | null;
  display_order: number | null;
  slide_duration_seconds: number | null;
  action_button_enabled: boolean | null;
  action_button_text: string | null;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  event_type: string;
  is_public: boolean;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  view_count: number;
  published_at: string;
  is_featured: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  [key: string]: any; // Allow additional fields
}

interface PublicDashboardData {
  heroSlides: HeroSlide[];
  events: Event[];
  albums: any[];
  videos: Video[];
  announcements: Announcement[];
  recentActivity: any[];
}

interface Analytics {
  totalVisitors: number;
  dailyVisitors: number;
  popularSections: string[];
  avgTimeOnPage: number;
}

export const PublicDashboardMonitor = () => {
  const [dashboardData, setDashboardData] = useState<PublicDashboardData>({
    heroSlides: [],
    events: [],
    albums: [],
    videos: [],
    announcements: [],
    recentActivity: []
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    totalVisitors: 0,
    dailyVisitors: 0,
    popularSections: [],
    avgTimeOnPage: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [editingItem, setEditingItem] = useState<{ type: string; id: string } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editMode, setEditMode] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch hero slides
      const { data: heroSlides } = await supabase
        .from('gw_hero_slides')
        .select('*')
        .eq('usage_context', 'homepage')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Fetch public events
      const { data: events } = await supabase
        .from('gw_events')
        .select('*')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(6);

      // Fetch YouTube videos
      const { data: videos } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(6);

      // Fetch announcements - Using any since the schema fields don't match exactly
      const { data: announcements } = await supabase
        .from('gw_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setDashboardData({
        heroSlides: heroSlides || [],
        events: events || [],
        albums: [], // Will be populated from music hook
        videos: videos || [],
        announcements: announcements || [],
        recentActivity: []
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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

  // Edit and Delete Functions
  const startEdit = (type: string, id: string, currentData: any) => {
    setEditingItem({ type, id });
    setEditForm(currentData);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    try {
      const { type, id } = editingItem;
      let updatePromise;
      
      switch (type) {
        case 'hero':
          updatePromise = supabase
            .from('gw_hero_slides')
            .update(editForm)
            .eq('id', id);
          break;
        case 'event':
          updatePromise = supabase
            .from('gw_events')
            .update(editForm)
            .eq('id', id);
          break;
        case 'announcement':
          updatePromise = supabase
            .from('gw_announcements')
            .update(editForm)
            .eq('id', id);
          break;
        case 'video':
          updatePromise = supabase
            .from('youtube_videos')
            .update(editForm)
            .eq('id', id);
          break;
        default:
          throw new Error('Unknown item type');
      }

      const { error } = await updatePromise;
      if (error) throw error;

      toast.success('Item updated successfully');
      setEditingItem(null);
      setEditForm({});
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (type: string, id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      let deletePromise;
      
      switch (type) {
        case 'hero':
          deletePromise = supabase
            .from('gw_hero_slides')
            .delete()
            .eq('id', id);
          break;
        case 'event':
          deletePromise = supabase
            .from('gw_events')
            .delete()
            .eq('id', id);
          break;
        case 'announcement':
          deletePromise = supabase
            .from('gw_announcements')
            .delete()
            .eq('id', id);
          break;
        case 'video':
          deletePromise = supabase
            .from('youtube_videos')
            .delete()
            .eq('id', id);
          break;
        default:
          throw new Error('Unknown item type');
      }

      const { error } = await deletePromise;
      if (error) throw error;

      toast.success('Item deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const toggleActive = async (type: string, id: string, currentStatus: boolean) => {
    try {
      let updatePromise;
      
      switch (type) {
        case 'hero':
          updatePromise = supabase
            .from('gw_hero_slides')
            .update({ is_active: !currentStatus })
            .eq('id', id);
          break;
        case 'event':
          updatePromise = supabase
            .from('gw_events')
            .update({ is_public: !currentStatus })
            .eq('id', id);
          break;
        case 'video':
          updatePromise = supabase
            .from('youtube_videos')
            .update({ is_featured: !currentStatus })
            .eq('id', id);
          break;
        default:
          throw new Error('Unknown item type');
      }

      const { error } = await updatePromise;
      if (error) throw error;

      toast.success(`Item ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Edit Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Monitor className="h-8 w-8" />
            Public Dashboard Monitor
            {editMode && (
              <Badge variant="destructive" className="ml-2">
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Mode Active
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage what visitors see on the public dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? "destructive" : "secondary"}
            size="sm"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            onClick={fetchDashboardData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              View Public
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
              <Image className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hero Slides</p>
                <p className="text-2xl font-bold">{dashboardData.heroSlides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Public Events</p>
                <p className="text-2xl font-bold">{dashboardData.events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Featured Videos</p>
                <p className="text-2xl font-bold">{dashboardData.videos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Announcements</p>
                <p className="text-2xl font-bold">{dashboardData.announcements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Content Tabs */}
      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Hero Slides Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.heroSlides.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.heroSlides.map((slide, index) => (
                    <div key={slide.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        {editingItem?.type === 'hero' && editingItem?.id === slide.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">Slide {index + 1}</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive('hero', slide.id, slide.is_active || false)}
                              >
                                {slide.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                {slide.is_active ? 'Active' : 'Inactive'}
                              </Button>
                            </div>
                            <Input
                              value={editForm.title || ''}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              placeholder="Slide title"
                              className="mb-2"
                            />
                            <Textarea
                              value={editForm.description || ''}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Slide description"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={editForm.slide_duration_seconds || ''}
                                onChange={(e) => setEditForm({ ...editForm, slide_duration_seconds: parseInt(e.target.value) })}
                                placeholder="Duration (seconds)"
                                className="w-32"
                              />
                              <Input
                                value={editForm.action_button_text || ''}
                                onChange={(e) => setEditForm({ ...editForm, action_button_text: e.target.value })}
                                placeholder="Button text"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">Slide {index + 1}</Badge>
                              {getStatusBadge(slide.is_active || false)}
                              <span className="text-sm text-muted-foreground">
                                Duration: {slide.slide_duration_seconds || 10}s
                              </span>
                            </div>
                            <h4 className="font-medium">{slide.title || 'Untitled Slide'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {slide.description || 'No description'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {slide.action_button_enabled && (
                          <Badge variant="secondary">Has Button</Badge>
                        )}
                        {editMode && (
                          <>
                            {editingItem?.type === 'hero' && editingItem?.id === slide.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEdit('hero', slide.id, slide)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteItem('hero', slide.id, slide.title || 'Untitled')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hero slides configured</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Hero Slides
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Public Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.events.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        {editingItem?.type === 'event' && editingItem?.id === event.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editForm.title || ''}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              placeholder="Event title"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="datetime-local"
                                value={editForm.start_date?.split('.')[0] || ''}
                                onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                              />
                              <Input
                                value={editForm.location || ''}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                placeholder="Location"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.start_date)} • {event.location || 'Location TBD'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.event_type}</Badge>
                        {editMode && (
                          <>
                            {editingItem?.type === 'event' && editingItem?.id === event.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEdit('event', event.id, event)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteItem('event', event.id, event.title)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming public events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Featured Media Content
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
                  <p>No featured videos available</p>
                  <p className="text-sm mt-2">Sync your YouTube channel to display videos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.announcements.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.announcements.map((announcement) => (
                    <div key={announcement.id} className="p-3 border rounded-lg">
                      {editingItem?.type === 'announcement' && editingItem?.id === announcement.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            placeholder="Announcement title"
                          />
                          <Textarea
                            value={editForm.content || ''}
                            onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                            placeholder="Announcement content"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Published</Badge>
                              {editMode && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => startEdit('announcement', announcement.id, announcement)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteItem('announcement', announcement.id, announcement.title)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {announcement.content?.substring(0, 150)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {formatDate(announcement.created_at)}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No public announcements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};