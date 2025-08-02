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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';
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
  MapPin,
  Plus,
  StickyNote,
  Send,
  MessageSquare,
  Users,
  Trash2,
  MoreVertical
} from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { PublicCalendarViews } from "@/components/calendar/PublicCalendarViews";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

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

interface LoveMessage {
  id: string;
  user_id: string;
  message: string;
  note_color: string;
  is_anonymous: boolean;
  created_at: string;
  sender_name?: string;
  likes: number;
  user_liked?: boolean;
  decorations?: string;
}

interface LoveMessageForm {
  message: string;
  note_color: string;
  is_anonymous: boolean;
  decorations: string;
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
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    recipient: 'all_members',
    subject: '',
    message: '',
    priority: 'normal'
  });
  
  // State for love messages
  const [loveMessages, setLoveMessages] = useState<LoveMessage[]>([]);
  const [loveMessagesLoading, setLoveMessagesLoading] = useState(true);
  const [loveDialogOpen, setLoveDialogOpen] = useState(false);
  
  // State for music library
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicSearchTerm, setMusicSearchTerm] = useState("");
  
  // State for collapsible
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState("buckets");
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);

  // Prayer request form
  const prayerForm = useForm<PrayerRequestForm>({
    defaultValues: {
      content: "",
      is_anonymous: false,
    },
  });

  // Love message form
  const loveForm = useForm<LoveMessageForm>({
    defaultValues: {
      message: "",
      note_color: "blue",
      is_anonymous: false,
      decorations: "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    
    if (user && isMounted) {
      fetchNotifications();
      fetchSheetMusic();
      fetchLoveMessages();
    }
    
    return () => {
      isMounted = false;
    };
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

  const fetchLoveMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_buckets_of_love')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      // Get profiles for non-anonymous messages
      const userIds = [...new Set((data || []).filter(m => !m.is_anonymous).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, first_name, last_name')
        .in('user_id', userIds);

      // Get user's likes for these messages
      const messageIds = (data || []).map(m => m.id);
      const { data: userLikes } = await supabase
        .from('gw_buckets_of_love_likes')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      const likedMessageIds = new Set(userLikes?.map(like => like.message_id) || []);

      const messages: LoveMessage[] = (data || []).map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          message: m.message,
          note_color: m.note_color,
          is_anonymous: m.is_anonymous,
          created_at: m.created_at,
          sender_name: m.is_anonymous ? 'Anonymous' : (profile?.full_name || profile?.first_name || 'Someone'),
          likes: m.likes || 0,
          user_liked: likedMessageIds.has(m.id)
        };
      });

      setLoveMessages(messages);
    } catch (error) {
      console.error('Error fetching love messages:', error);
      setLoveMessages([]);
    } finally {
      setLoveMessagesLoading(false);
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

  const onSubmitLoveMessage = async (data: LoveMessageForm) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_buckets_of_love')
        .insert({
          user_id: user.id,
          message: data.message,
          note_color: data.note_color,
          is_anonymous: data.is_anonymous,
          decorations: data.decorations || ""
        });

      if (error) throw error;

      // Refresh messages
      await fetchLoveMessages();
      loveForm.reset();
      setLoveDialogOpen(false);
    } catch (error) {
      console.error('Error creating love message:', error);
    }
  };

  const noteColors = [
    { value: 'sky', label: 'Sky Blue', bg: 'bg-sky-200', border: 'border-sky-300' },
    { value: 'blue', label: 'Ocean Blue', bg: 'bg-blue-200', border: 'border-blue-300' },
    { value: 'indigo', label: 'Deep Blue', bg: 'bg-indigo-200', border: 'border-indigo-300' },
    { value: 'cyan', label: 'Bright Blue', bg: 'bg-cyan-200', border: 'border-cyan-300' },
    { value: 'slate', label: 'Steel Blue', bg: 'bg-slate-200', border: 'border-slate-300' },
  ];

  const emojis = ['🎈', '🎉', '💙', '⭐', '🌟', '✨', '💫', '🦋', '🌸', '🌺', '🎵', '🎶', '🏆', '👑', '💎'];
  const balloons = ['🎈', '🎉', '🎊', '🎁', '🌈'];
  const hearts = ['💙', '💚', '💜', '🤍', '🖤', '💛', '🧡', '❤️'];
  const sparkles = ['✨', '⭐', '🌟', '💫', '☆', '★'];

  const getNoteColorClasses = (color: string) => {
    switch (color) {
      case 'sky': return 'bg-sky-200 border-sky-300 hover:bg-sky-300';
      case 'blue': return 'bg-blue-200 border-blue-300 hover:bg-blue-300';
      case 'indigo': return 'bg-indigo-200 border-indigo-300 hover:bg-indigo-300';
      case 'cyan': return 'bg-cyan-200 border-cyan-300 hover:bg-cyan-300';
      case 'slate': return 'bg-slate-200 border-slate-300 hover:bg-slate-300';
      default: return 'bg-blue-200 border-blue-300 hover:bg-blue-300';
    }
  };

  const getNoteGradientColors = (color: string) => {
    switch (color) {
      case 'sky': return '#e0f2fe, #bae6fd';
      case 'blue': return '#dbeafe, #bfdbfe';
      case 'indigo': return '#e0e7ff, #c7d2fe';
      case 'cyan': return '#cffafe, #a5f3fc';
      case 'slate': return '#e2e8f0, #cbd5e1';
      default: return '#dbeafe, #bfdbfe';
    }
  };

  const handleNoteClick = (message: LoveMessage) => {
    // Display message in a simple alert for now - could be enhanced with a proper modal
    alert(`${message.sender_name}: ${message.message}`);
  };

  const handleLikeMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('toggle_love_message_like', { message_id_param: messageId });

      if (error) throw error;

      // Type the response data
      const result = data as { likes_count: number; user_liked: boolean };

      // Update local state with the response
      setLoveMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { 
                ...msg, 
                likes: result.likes_count, 
                user_liked: result.user_liked 
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const LeftColumnContent = () => (
    <div className="space-y-4 relative">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 relative -top-12 z-30 bg-background/95 backdrop-blur-sm border border-border shadow-lg">
          <TabsTrigger value="buckets" className="text-xs">
            <StickyNote className="h-3 w-3 mr-1" />
            Buckets of Love
          </TabsTrigger>
          <TabsTrigger value="reflections" className="text-xs">
            <Book className="h-3 w-3 mr-1" />
            Wellness
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="h-3 w-3 mr-1" />
            Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}
          </TabsTrigger>
        </TabsList>

        {/* Buckets of Love Tab */}
        <TabsContent value="buckets" className="space-y-3">
          <div className="flex justify-between items-center">
            <SendBucketOfLove 
              trigger={
                <Button size="sm" className="gap-2">
                  <Send className="h-3 w-3" />
                  Send Love
                </Button>
              }
            />
          </div>
          {loveMessagesLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="relative p-6">
              {/* Background bucket image */}
              <div 
                className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-30 pointer-events-none"
                style={{
                  backgroundImage: `url('/lovable-uploads/96533996-2039-4566-887a-67eadeb076f1.png')`
                }}
              />
              
              {/* Header with Send Love button */}
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Share love, encouragement, and positive vibes with the Glee Club family
                  </p>
                </div>
                
                {/* Send Love Button - moved to top right */}
                <Dialog open={loveDialogOpen} onOpenChange={setLoveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-8 ml-2 shrink-0">
                      <Plus className="h-3 w-3 mr-1" />
                      Send Love
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Send a Love Message
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...loveForm}>
                      <form onSubmit={loveForm.handleSubmit(onSubmitLoveMessage)} className="space-y-4">
                        <FormField
                          control={loveForm.control}
                          name="message"
                          rules={{ required: "Message is required" }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Love Message</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Share something positive, encouraging, or loving..."
                                  className="min-h-[80px] text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loveForm.control}
                          name="note_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Note Color</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex flex-wrap gap-2"
                                >
                                  {noteColors.map((color) => (
                                    <div key={color.value} className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value={color.value}
                                        id={color.value}
                                        className="sr-only"
                                      />
                                      <Label
                                        htmlFor={color.value}
                                        className={`
                                          w-8 h-8 rounded-lg border-2 cursor-pointer transition-all
                                          ${color.bg} ${color.border}
                                          ${field.value === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
                                        `}
                                        title={color.label}
                                      />
                                    </div>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loveForm.control}
                          name="is_anonymous"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Send Anonymously
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  Your name won't be shown with this message
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setLoveDialogOpen(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            <Send className="h-4 w-4 mr-2" />
                            Send Love
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Love Notes Grid */}
              <div className="relative z-10 grid grid-cols-7 gap-1 mb-4 h-48 overflow-y-auto">
                {loveMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`
                      relative w-[101px] h-[72px] p-1.5 rounded-lg border-2 cursor-pointer transition-all duration-200 
                      ${getNoteColorClasses(message.note_color)}
                      shadow-sm hover:shadow-md transform hover:scale-105
                    `}
                    onClick={() => handleNoteClick(message)}
                    style={{
                      background: `linear-gradient(135deg, ${getNoteGradientColors(message.note_color)})`,
                    }}
                  >
                    {/* Message text - truncated */}
                    <div className="text-[9px] text-gray-800 leading-tight mb-1 overflow-hidden h-8">
                      {message.message.length > 40 ? `${message.message.substring(0, 40)}...` : message.message}
                    </div>
                    
                    {/* Decorations */}
                    <div className="text-[9px] mb-0.5">
                      {message.decorations || '💙'}
                    </div>
                    
                    {/* Bottom section */}
                    <div className="absolute bottom-0.5 left-1 right-1 flex justify-between items-center">
                      <div className="text-[9px] text-gray-600 truncate flex-1 mr-1">
                        {message.sender_name}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeMessage(message.id);
                          }}
                          className={`text-[10px] flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                            message.user_liked 
                              ? 'text-red-600 bg-red-100 hover:bg-red-200' 
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Heart className={`h-2 w-2 ${message.user_liked ? 'fill-current' : ''}`} />
                          <span>{message.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </TabsContent>

        {/* Wellness/Reflections Tab */}
        <TabsContent value="reflections" className="space-y-3">
          {reflectionsLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : sharedReflections.length > 0 ? (
            <div className="space-y-3">
              {/* Latest Reflection */}
              {latestReflection && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">{latestReflection.title}</h3>
                    </div>
                    <Badge className={`text-xs ${getReflectionTypeColor(latestReflection.reflection_type)}`}>
                      {latestReflection.reflection_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                    {latestReflection.content}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>By Staff</span>
                    <span>{format(new Date(), 'MMM d')}</span>
                  </div>
                </div>
              )}

              {/* Quick Prayer Request */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <h3 className="font-medium text-sm">Prayer Requests</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Submit a prayer request for the community to lift up in prayer.
                </p>
                
                <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Prayer Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Submit Prayer Request
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...prayerForm}>
                      <form onSubmit={prayerForm.handleSubmit(onSubmitPrayerRequest)} className="space-y-4">
                        <FormField
                          control={prayerForm.control}
                          name="content"
                          rules={{ required: "Prayer request is required" }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prayer Request</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Please pray for..."
                                  className="resize-none"
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
                                <FormLabel>Submit anonymously</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setPrayerDialogOpen(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            <Send className="h-4 w-4 mr-2" />
                            Submit
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* View All Button */}
              <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => navigate('/wellness')}>
                <Book className="h-3 w-3 mr-1" />
                View All Reflections
              </Button>
            </div>
          ) : (
            <div className="text-center p-4">
              <Book className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No reflections available</p>
            </div>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-3">
          {notificationsLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const CategoryIcon = getCategoryIcon(notification.category || '');
                  return (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        notification.is_read ? 'bg-background' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <CategoryIcon className={`h-4 w-4 mt-0.5 ${getCategoryColor(notification.category || '')}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm leading-tight">{notification.title}</h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge variant={getPriorityColor(notification.priority)} className="text-xs h-4 px-1">
                                {notification.priority}
                              </Badge>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {notification.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-4">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No notifications</p>
            </div>
          )}
          
          {/* View All Notifications Button */}
          <div className="mt-3 pt-3 border-t">
            <NotificationCenter 
              trigger={
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  <Bell className="h-3 w-3 mr-1" />
                  Open Notification Center
                </Button>
              }
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const RightColumnContent = () => (
    <div className="space-y-4">
      {/* Calendar Section */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-2 p-3 border-b">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Calendar</h3>
        </div>
        <div className="h-[300px] overflow-hidden">
          <PublicCalendarViews />
        </div>
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/calendar')}>
              <Calendar className="h-3 w-3 mr-1" />
              Full Calendar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/events')}>
              <Clock className="h-3 w-3 mr-1" />
              All Events
            </Button>
          </div>
        </div>
      </div>

      {/* Music Section */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-2 p-3 border-b">
          <Music className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Music Library</h3>
        </div>
        <div className="p-3">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
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
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredMusic.map((music) => (
                  <div key={music.id} className="border rounded-lg p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs leading-tight mb-1 truncate">{music.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{music.composer}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {music.voice_parts && music.voice_parts.length > 0 && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {music.voice_parts.join(", ")}
                            </Badge>
                          )}
                          {music.difficulty_level && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {music.difficulty_level}
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
        </div>
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/music-library')}>
              <Music className="h-3 w-3 mr-1" />
              Music Library
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/sheet-music')}>
              <BookOpen className="h-3 w-3 mr-1" />
              Browse All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 overflow-visible relative -mt-8">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4 relative z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
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
            {/* Responsive Layout */}
            {isMobile ? (
              <div className="space-y-4">
                <LeftColumnContent />
                <RightColumnContent />
              </div>
            ) : (
              <ResizablePanelGroup direction="horizontal" className="min-h-[500px]">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <LeftColumnContent />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="pl-4">
                    <RightColumnContent />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};