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
    if (user) {
      fetchNotifications();
      fetchSheetMusic();
      fetchLoveMessages();
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

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
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
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Left Column: Buckets, Wellness, Notifications */}
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
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
                    {loveMessagesLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Header with cute bucket image */}
                        <div className="flex flex-col items-center mb-4">
                          <img 
                            src="/lovable-uploads/96533996-2039-4566-887a-67eadeb076f1.png" 
                            alt="Sending you buckets of love"
                            className="w-32 h-auto mb-2"
                          />
                          
                          {/* Add Love Note Button */}
                          <Dialog open={loveDialogOpen} onOpenChange={setLoveDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Love Note
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[525px]">
                              <DialogHeader>
                                <DialogTitle>Share a Love Note</DialogTitle>
                              </DialogHeader>
                              <Form {...loveForm}>
                                <form onSubmit={loveForm.handleSubmit(onSubmitLoveMessage)} className="space-y-4">
                                  <FormField
                                    control={loveForm.control}
                                    name="message"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Your Message</FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Share some love and encouragement..."
                                            className="min-h-[100px]"
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
                                          <div className="flex gap-2 flex-wrap">
                                            {noteColors.map((color) => (
                                              <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => field.onChange(color.value)}
                                                className={`w-8 h-8 rounded-full border-2 ${color.bg} ${color.border} ${
                                                  field.value === color.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                                                } transition-all`}
                                                title={color.label}
                                              />
                                            ))}
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={loveForm.control}
                                    name="decorations"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Add Decorations (Optional)</FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            <div className="flex gap-1 flex-wrap">
                                              {emojis.map((emoji) => (
                                                <button
                                                  key={emoji}
                                                  type="button"
                                                  onClick={() => field.onChange(field.value + emoji)}
                                                  className="w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors"
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                            <div className="flex gap-2">
                                              <Input
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                placeholder="✨🎵💙"
                                                className="flex-1"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => field.onChange("")}
                                              >
                                                Clear
                                              </Button>
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={loveForm.control}
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
                                            Post anonymously
                                          </FormLabel>
                                        </div>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setLoveDialogOpen(false)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit">Post Love Note</Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        {/* 3D Interactive Bucket Container */}
                        <div className="relative flex justify-center items-end h-64" style={{ perspective: "800px" }}>
                          {/* 3D Bucket Structure */}
                          <div className="relative" style={{ transformStyle: "preserve-3d" }}>
                            {/* Bucket Body - Main Container */}
                            <div 
                              className="relative w-48 h-32 mx-auto"
                              style={{
                                background: "linear-gradient(145deg, #7dd3fc 0%, #0ea5e9 50%, #0284c7 100%)",
                                borderRadius: "0 0 24px 24px",
                                transform: "rotateX(10deg) rotateY(-5deg)",
                                boxShadow: "0 15px 35px rgba(14, 165, 233, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.3)",
                              }}
                            >
                              {/* Bucket Handle Left */}
                              <div 
                                className="absolute top-4 -left-6 w-8 h-12 border-4 border-blue-300 rounded-full"
                                style={{
                                  borderRightColor: "transparent",
                                  transform: "rotateY(-30deg)",
                                }}
                              />
                              
                              {/* Bucket Handle Right */}
                              <div 
                                className="absolute top-4 -right-6 w-8 h-12 border-4 border-blue-300 rounded-full"
                                style={{
                                  borderLeftColor: "transparent",
                                  transform: "rotateY(30deg)",
                                }}
                              />
                              
                              {/* Bucket Rim */}
                              <div 
                                className="absolute -top-2 left-0 right-0 h-4 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 rounded-full"
                                style={{
                                  boxShadow: "0 -2px 8px rgba(14, 165, 233, 0.4)",
                                }}
                              />
                            </div>
                          </div>

                          {/* Existing Love Messages - distributed around the bucket */}
                          {loveMessages.map((message, index) => {
                            // Better distribution - circular arrangement around center
                            const totalMessages = loveMessages.length;
                            const angle = (index / totalMessages) * 2 * Math.PI;
                            const radius = 35; // Distance from center
                            
                            // Convert polar to cartesian coordinates
                            const x = 50 + Math.cos(angle) * radius * (0.8 + Math.random() * 0.4);
                            const y = 50 + Math.sin(angle) * radius * (0.6 + Math.random() * 0.4);
                            
                            return (
                              <div 
                                key={message.id}
                                onClick={() => handleNoteClick(message)}
                                className={`${getNoteColorClasses(message.note_color)} border-2 rounded-lg p-2 shadow-md transition-all cursor-pointer hover:scale-110 hover:shadow-lg animate-fade-in absolute group`}
                                style={{ 
                                  width: '101px', // 96px (w-24) + 5px = 101px
                                  height: '80px', // keeping same height (h-20)
                                  animationDelay: `${index * 0.1}s`,
                                  left: `${Math.max(5, Math.min(75, x))}%`,
                                  top: `${Math.max(5, Math.min(65, y))}%`,
                                  transform: `rotate(${(Math.random() - 0.5) * 20}deg)`,
                                  zIndex: 1,
                                  backgroundColor: message.likes >= 3 ? '#ef4444' : undefined,
                                  borderColor: message.likes >= 3 ? '#dc2626' : undefined,
                                }}
                              >
                                <div className="h-full flex flex-col justify-between text-[10px]">
                                  <div className="flex-1">
                                    <p className={`text-[10px] leading-tight mb-1 line-clamp-2 ${message.likes >= 3 ? 'text-white' : 'text-gray-800'}`}>
                                      {message.message.length > 35 ? `${message.message.substring(0, 32)}...` : message.message}
                                    </p>
                                    {(message as any).decorations && (
                                      <div className="text-[10px] leading-none">
                                        {(message as any).decorations}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className={`font-medium truncate mr-1 text-[9px] ${message.likes >= 3 ? 'text-white' : 'text-gray-600'}`} title={message.sender_name}>
                                      {message.sender_name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLikeMessage(message.id);
                                        }}
                                        className={`flex items-center gap-1 transition-colors ${
                                          message.user_liked 
                                            ? (message.likes >= 3 ? 'text-white' : 'text-red-600')
                                            : (message.likes >= 3 ? 'text-white hover:text-red-200' : 'text-red-500 hover:text-red-600')
                                        }`}
                                      >
                                        <Heart className={`h-2 w-2 ${message.user_liked ? 'fill-current' : ''}`} />
                                        {message.likes > 0 && <span className="text-[9px]">{message.likes}</span>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

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
                                : 'No date'
                              }
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Reflection
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No reflections shared yet</p>
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
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {notifications.map((notification) => {
                            const IconComponent = getCategoryIcon(notification.category || 'Executive');
                            return (
                              <div 
                                key={notification.id} 
                                className={`border rounded-lg p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                                  !notification.is_read ? 'bg-blue-50/50 border-blue-200' : ''
                                }`}
                                onClick={() => markNotificationAsRead(notification.id)}
                              >
                                <div className="flex items-start gap-2">
                                  <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${getCategoryColor(notification.category || 'Executive')}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm leading-tight">{notification.title}</h4>
                                      {!notification.is_read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                                      {notification.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex gap-1">
                                        <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                                          {notification.priority}
                                        </Badge>
                                        {notification.category && (
                                          <Badge variant="outline" className="text-xs">
                                            {notification.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(notification.created_at), 'MMM d')}
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
                      <div className="text-center py-4">
                        <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Quick Action Buttons for Left Column */}
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

                {activeTab === "notifications" && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-8" 
                      onClick={() => {
                        setActiveTab("notifications");
                      }}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Refresh Notifications
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate('/member-portal')}>
                      <Package className="h-3 w-3 mr-1" />
                      Member Portal
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Column: Calendar and Music */}
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
