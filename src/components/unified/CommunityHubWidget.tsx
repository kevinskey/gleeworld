import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Book, 
  Bell, 
  Music, 
  Heart, 
  Search, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Package,
  BookOpen,
  Eye,
  Download,
  DollarSign,
  Shirt,
  Package2,
  MapPin
} from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  priority: string;
  created_at: string;
  category?: string;
}

interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  voice_parts?: string[];
  difficulty_level: string;
  is_public: boolean;
  created_at: string;
  key_signature?: string;
  time_signature?: string;
  tempo?: string;
}

interface PrayerRequestForm {
  content: string;
  is_anonymous: boolean;
}

export const CommunityHubWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { sharedReflections, loading: reflectionsLoading } = useSharedSpiritualReflections();
  const { createPrayerRequest } = usePrayerRequests();
  const { events: upcomingEvents, loading: eventsLoading } = usePublicGleeWorldEvents();
  
  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  
  // State for music library
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicSearchTerm, setMusicSearchTerm] = useState("");
  
  // State for collapsible
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState("reflections");
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);

  // Prayer request form
  const prayerForm = useForm<PrayerRequestForm>({
    defaultValues: {
      content: "",
      is_anonymous: false,
    },
  });

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSheetMusic();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Fetch executive board notifications
      const { data, error } = await supabase
        .from('gw_executive_board_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      // Transform the data to match our Notification interface
      const notifications: Notification[] = (data || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        notification_type: n.notification_type,
        is_read: n.is_read,
        priority: n.priority,
        created_at: n.created_at,
        category: 'Executive'
      }));
      
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error fetching sheet music:', error);
    } finally {
      setMusicLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gw_executive_board_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getReflectionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_devotional': return 'bg-blue-100 text-blue-800';
      case 'weekly_message': return 'bg-green-100 text-green-800';
      case 'prayer': return 'bg-purple-100 text-purple-800';
      case 'scripture_study': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Treasurer': return DollarSign;
      case 'Wardrobe': return Shirt;
      case 'Equipment': return Package2;
      default: return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Treasurer': return 'text-green-600';
      case 'Wardrobe': return 'text-purple-600';
      case 'Equipment': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  const filteredMusic = sheetMusic.filter(music =>
    music.title.toLowerCase().includes(musicSearchTerm.toLowerCase()) ||
    music.composer.toLowerCase().includes(musicSearchTerm.toLowerCase())
  );

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  const latestReflection = sharedReflections[0];

  const onSubmitPrayerRequest = async (data: PrayerRequestForm) => {
    const result = await createPrayerRequest(data.content, data.is_anonymous);
    if (result) {
      prayerForm.reset();
      setPrayerDialogOpen(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Community Hub</CardTitle>
                <div className="flex gap-1">
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-2">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                  {sharedReflections.length > 0 && (
                    <Badge variant="outline" className="text-xs h-5 px-2">
                      New
                    </Badge>
                  )}
                </div>
              </div>
              {isMobile && (
                <div className="flex items-center">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <CardContent className="pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="reflections" className="text-xs">
                  <Book className="h-3 w-3 mr-1" />
                  Wellness
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs">
                  <Bell className="h-3 w-3 mr-1" />
                  Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="music" className="text-xs">
                  <Music className="h-3 w-3 mr-1" />
                  Music
                </TabsTrigger>
              </TabsList>

              {/* Spiritual Reflections Tab */}
              <TabsContent value="reflections" className="space-y-3">
                {reflectionsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : latestReflection ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm leading-tight pr-2">{latestReflection.title}</h4>
                        {latestReflection.is_featured && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">Featured</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                          {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                        </Badge>
                        {latestReflection.scripture_reference && (
                          <Badge variant="outline" className="text-xs">
                            <Heart className="h-3 w-3 mr-1" />
                            {latestReflection.scripture_reference}
                          </Badge>
                        )}
                      </div>
                      
                      <ScrollArea className="h-16 mb-2">
                        <p className="text-xs text-muted-foreground pr-4 leading-relaxed">
                          {latestReflection.content}
                        </p>
                      </ScrollArea>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {latestReflection.shared_at 
                            ? format(new Date(latestReflection.shared_at), 'MMM d')
                            : 'Recent'
                          }
                        </div>
                        {sharedReflections.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            +{sharedReflections.length - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No spiritual reflections available
                  </p>
                )}
              </TabsContent>

              {/* Enhanced Notifications Tab */}
              <TabsContent value="notifications" className="space-y-3">
                {notificationsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length > 0 ? (
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                      {notifications.map((notification) => {
                        const CategoryIcon = getCategoryIcon(notification.category || '');
                        return (
                          <div 
                            key={notification.id} 
                            className={`border rounded-lg p-3 space-y-2 ${
                              !notification.is_read ? 'bg-muted/50 border-primary/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <CategoryIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${getCategoryColor(notification.category || '')}`} />
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {notification.category && (
                                      <Badge variant="outline" className="text-xs h-4 px-1">
                                        {notification.category}
                                      </Badge>
                                    )}
                                    <Badge variant={getPriorityColor(notification.priority)} className="text-xs h-4 px-1">
                                      {notification.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                  </span>
                                  {!notification.is_read && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => markNotificationAsRead(notification.id)}
                                      className="text-xs h-5 px-2"
                                    >
                                      ✓
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No notifications
                  </p>
                )}
              </TabsContent>

              {/* Music Library Tab */}
              <TabsContent value="music" className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search music..."
                    value={musicSearchTerm}
                    onChange={(e) => setMusicSearchTerm(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>

                {musicLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : filteredMusic.length > 0 ? (
                  <ScrollArea className="h-40">
                    <div className="space-y-2 pr-4">
                      {filteredMusic.map((music) => (
                        <div key={music.id} className="border rounded-lg p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs truncate">{music.title}</h4>
                              <p className="text-xs text-muted-foreground truncate">by {music.composer || "Unknown"}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {music.voice_parts && music.voice_parts.length > 0 && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    {music.voice_parts.join(', ')}
                                  </Badge>
                                )}
                                {music.key_signature && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    {music.key_signature}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {musicSearchTerm ? "No music found" : "No music available"}
                  </p>
                )}
              </TabsContent>

              {/* Calendar Events Tab */}
              <TabsContent value="calendar" className="space-y-3">
                {eventsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                      {upcomingEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{event.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.start_date), 'MMM dd, h:mm a')}
                                {event.location && (
                                  <>
                                    <MapPin className="h-3 w-3 ml-1" />
                                    <span className="truncate">{event.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs h-4 px-1 flex-shrink-0">
                              {event.event_type || 'Event'}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No upcoming events</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Action Buttons - only show on Spirit tab */}
            {activeTab === "reflections" && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/spiritual-reflections')}>
                  <Book className="h-3 w-3 mr-1" />
                  All Reflections
                </Button>
                <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                      <Heart className="h-3 w-3 mr-1" />
                      Prayer Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Submit Prayer Request</DialogTitle>
                    </DialogHeader>
                    <Form {...prayerForm}>
                      <form onSubmit={prayerForm.handleSubmit(onSubmitPrayerRequest)} className="space-y-4">
                        <FormField
                          control={prayerForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prayer Request</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Share your prayer request..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={prayerForm.control}
                          name="is_anonymous"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Submit anonymously
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setPrayerDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Submit Request</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Quick Action Buttons - show on Alerts tab */}
            {activeTab === "notifications" && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/notifications')}>
                  <Bell className="h-3 w-3 mr-1" />
                  All Notifications
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/member-portal')}>
                  <Package className="h-3 w-3 mr-1" />
                  Member Portal
                </Button>
              </div>
            )}

            {/* Quick Action Buttons - show on Calendar tab */}
            {activeTab === "calendar" && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/calendar')}>
                  <Calendar className="h-3 w-3 mr-1" />
                  Full Calendar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/events')}>
                  <Clock className="h-3 w-3 mr-1" />
                  All Events
                </Button>
              </div>
            )}

            {/* Quick Action Buttons - show on Music tab */}
            {activeTab === "music" && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/music-library')}>
                  <Music className="h-3 w-3 mr-1" />
                  Music Library
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/sheet-music')}>
                  <BookOpen className="h-3 w-3 mr-1" />
                  Browse All
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};