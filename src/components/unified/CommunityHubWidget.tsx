import { useState, useEffect } from "react";
import { NotificationsSection } from "./NotificationsSection";
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
import { SheetMusicViewDialog } from '@/components/music-library/SheetMusicViewDialog';
import { ExecBoardModularHub } from '@/components/executive/ExecBoardModularHub';
import { useUserRole } from '@/hooks/useUserRole';
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
import { toast } from "sonner";

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
  composer: string | null;
  arranger: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tempo_marking: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  language: string | null;
  pdf_url: string | null;
  audio_preview_url: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
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
  voice_part?: string;
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
  const { profile } = useUserRole();
  
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
  const [selectedMusicItem, setSelectedMusicItem] = useState<SheetMusic | null>(null);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  
  // State for collapsible
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState("buckets");
  const [activeVoiceFilter, setActiveVoiceFilter] = useState('all');
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
    (music.composer && music.composer.toLowerCase().includes(musicSearchTerm.toLowerCase()))
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
    if (!user) {
      toast.error("You must be logged in to pin a love note");
      return;
    }

    console.log('Submitting love message:', data);

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

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Love message created successfully');
      
      // Show success message
      toast.success("Love note pinned successfully!");
      
      // Refresh messages
      await fetchLoveMessages();
      
      // Reset form and close dialog
      loveForm.reset();
      setLoveDialogOpen(false);
      
    } catch (error) {
      console.error('Error creating love message:', error);
      toast.error("Failed to pin love note. Please try again.");
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_buckets_of_love')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id); // Ensure user can only delete their own messages

      if (error) throw error;

      // Remove from local state
      setLoveMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== messageId)
      );

    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleViewMusic = (music: SheetMusic) => {
    setSelectedMusicItem(music);
    setMusicDialogOpen(true);
  };

  const handleDownloadMusic = (music: SheetMusic) => {
    // Navigate to the full music library to download
    navigate(`/music-library?item=${music.id}`);
  };
  
  // Check if user can download PDFs based on role
  const canDownloadPDF = () => {
    if (!profile) return false;
    return (
      profile.is_admin || 
      profile.is_super_admin || 
      profile.role === 'librarian' ||
      profile.exec_board_role === 'student_conductor' ||
      profile.role === 'section_leader'
    );
  };

  // Filter love messages by voice part
  const filteredLoveMessages = loveMessages.filter(message => {
    if (activeVoiceFilter === 'all') return true;
    return message.voice_part === activeVoiceFilter;
  });
  const LeftColumnContent = () => (
    <div className="space-y-4 relative">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-amber-100 border border-amber-200 rounded-lg shadow-sm">
          <TabsTrigger value="buckets" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <StickyNote className="h-3 w-3 mr-1 text-pink-600" />
            Buckets of Love
          </TabsTrigger>
          <TabsTrigger value="reflections" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Book className="h-3 w-3 mr-1 text-purple-600" />
            Wellness Board
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Bell className="h-3 w-3 mr-1 text-blue-600" />
            Notice Board
          </TabsTrigger>
        </TabsList>

        {/* Buckets of Love Tab - Cork Board Style */}
        <TabsContent value="buckets" className="space-y-3">
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 min-h-[300px]" 
               style={{
                 backgroundImage: `
                   radial-gradient(circle at 20% 30%, #1d4ed8 1px, transparent 1px),
                   radial-gradient(circle at 70% 60%, #1d4ed8 1px, transparent 1px),
                   radial-gradient(circle at 40% 80%, #1d4ed8 1px, transparent 1px),
                   radial-gradient(circle at 90% 20%, #1d4ed8 1px, transparent 1px)
                 `,
                 backgroundSize: '80px 80px, 120px 120px, 100px 100px, 90px 90px'
               }}>
            
            {/* Voice Part Filter Tabs */}
            <div className="mb-4">
              <Tabs value={activeVoiceFilter} onValueChange={setActiveVoiceFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-lg shadow-sm h-8">
                  <TabsTrigger value="all" className="text-xs py-1 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="S1" className="text-xs py-1 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-800">
                    S1
                  </TabsTrigger>
                  <TabsTrigger value="S2" className="text-xs py-1 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
                    S2
                  </TabsTrigger>
                  <TabsTrigger value="A1" className="text-xs py-1 data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
                    A1
                  </TabsTrigger>
                  <TabsTrigger value="A2" className="text-xs py-1 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
                    A2
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Add Voice Part Field */}
            <div className="absolute top-2 left-2 z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm border border-blue-200">
                <span className="text-xs text-gray-600">Filter: {activeVoiceFilter === 'all' ? 'All Voices' : activeVoiceFilter}</span>
              </div>
            </div>

            {/* Add Love Message Button - Pinned Note Style */}
            <div className="absolute top-2 right-2 z-20">
              <Dialog open={loveDialogOpen} onOpenChange={setLoveDialogOpen}>
                <DialogTrigger asChild>
                  <button className="relative bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-sm p-2 shadow-md transform rotate-1 hover:rotate-0 transition-all duration-200">
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-blue-600 fill-current" />
                      <Plus className="h-3 w-3 text-blue-600" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-pink-500" />
                      Pin a Love Note
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
                            <FormLabel>Your Love Note</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Share some love and positivity..."
                                className="resize-none min-h-[100px] bg-yellow-50 border-yellow-200"
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
                            <FormLabel>Note Color & Pushpin</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="grid grid-cols-5 gap-2"
                              >
                                {noteColors.map((color) => (
                                  <div key={color.value} className="flex flex-col items-center">
                                    <RadioGroupItem
                                      value={color.value}
                                      id={color.value}
                                      className="sr-only"
                                    />
                                    <Label
                                      htmlFor={color.value}
                                      className={`relative cursor-pointer w-12 h-12 ${color.bg} ${color.border} border-2 rounded-sm shadow-sm hover:shadow-md transition-all transform hover:scale-105`}
                                    >
                                      <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full shadow-sm ${
                                        color.value === 'sky' ? 'bg-sky-600' :
                                        color.value === 'blue' ? 'bg-blue-600' :
                                        color.value === 'indigo' ? 'bg-indigo-600' :
                                        color.value === 'cyan' ? 'bg-cyan-600' :
                                        'bg-slate-600'
                                      }`}></div>
                                      {field.value === color.value && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                      )}
                                    </Label>
                                    <span className="text-xs mt-1">{color.label}</span>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
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
                              <FormLabel>Post anonymously</FormLabel>
                              <FormDescription>Your name won't be shown on the note</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setLoveDialogOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600 text-white">
                          <Heart className="h-4 w-4 mr-2" />
                          Pin Note
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Love Messages - Cork Board Display */}
            <ScrollArea className="h-[250px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
                {loveMessagesLoading ? (
                  <div className="col-span-full flex justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                  </div>
                ) : filteredLoveMessages.length > 0 ? (
                  filteredLoveMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`relative p-3 rounded-sm shadow-md transition-all duration-200 hover:shadow-lg ${getNoteColorClasses(message.note_color)}`}
                      style={{
                        transform: `rotate(${(index % 3 - 1) * 2}deg)`,
                        marginTop: `${(index % 2) * 4}px`
                      }}
                    >
                      {/* Pushpin */}
                      <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full shadow-sm ${
                        message.note_color === 'sky' ? 'bg-sky-600' :
                        message.note_color === 'blue' ? 'bg-blue-600' :
                        message.note_color === 'indigo' ? 'bg-indigo-600' :
                        message.note_color === 'cyan' ? 'bg-cyan-600' :
                        'bg-slate-600'
                      }`}></div>
                      
                      <p 
                        className="text-xs leading-relaxed text-gray-800 mb-2 line-clamp-3 cursor-pointer"
                        onClick={() => handleNoteClick(message)}
                      >
                        {message.message}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 font-medium">
                          {message.sender_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeMessage(message.id);
                            }}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                              message.user_liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                            }`}
                          >
                            <Heart className={`h-3 w-3 ${message.user_liked ? 'fill-current' : ''}`} />
                            {message.likes}
                          </button>
                          
                          {/* Delete button - only show for user's own messages */}
                          {user && message.user_id === user.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(message.id);
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
                              title="Delete your message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center p-8">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      {activeVoiceFilter === 'all' ? "No buckets of love yet. Be the first to spread some love!" : `No buckets of love for ${activeVoiceFilter} yet.`}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Wellness/Reflections Tab - Cork Board Style */}
        <TabsContent value="reflections" className="space-y-3">
          <div className="relative bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg p-4 min-h-[300px]" 
               style={{
                 backgroundImage: `
                   radial-gradient(circle at 25% 25%, #7c3aed 1px, transparent 1px),
                   radial-gradient(circle at 75% 75%, #7c3aed 1px, transparent 1px),
                   radial-gradient(circle at 50% 50%, #7c3aed 1px, transparent 1px)
                 `,
                 backgroundSize: '90px 90px, 110px 110px, 70px 70px'
               }}>
            
            {!reflectionsLoading && latestReflection ? (
              <div className="relative mb-4">
                <div className="bg-white rounded-sm p-4 shadow-md transform -rotate-1 hover:rotate-0 transition-all duration-200 border border-purple-200">
                  {/* Purple Pushpin */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-600 rounded-full shadow-sm"></div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Book className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium text-sm text-gray-800">{latestReflection.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs h-4 px-2 ${getReflectionTypeColor(latestReflection.reflection_type)}`}
                    >
                      {latestReflection.reflection_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-700 leading-relaxed mb-3 line-clamp-4">
                    {latestReflection.content}
                  </p>
                  
                  {latestReflection.scripture_reference && (
                    <p className="text-xs italic text-purple-600 mb-2">
                      "{latestReflection.scripture_reference}"
                    </p>
                  )}
                  
                   <p className="text-xs text-gray-500">
                     {format(new Date(latestReflection.shared_at || ''), "MMMM d, yyyy")}
                   </p>
                </div>
              </div>
            ) : reflectionsLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="text-center p-8">
                <Book className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No reflections shared yet</p>
              </div>
            )}

            {/* Prayer Request Section - Note Style */}
            <div className="absolute bottom-2 right-2">
              <div className="bg-green-100 rounded-sm p-3 shadow-md transform rotate-1 hover:rotate-0 transition-all duration-200 border border-green-200 max-w-[180px]">
                {/* Green Pushpin */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-600 rounded-full shadow-sm"></div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-3 w-3 text-green-600" />
                  <h3 className="font-medium text-xs text-gray-800">Prayer Requests</h3>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  Submit a prayer request for community prayer.
                </p>
                
                <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs h-6 bg-white hover:bg-green-50 border-green-200">
                      <Plus className="h-2 w-2 mr-1" />
                      Add Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-green-600" />
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
                                  className="resize-none bg-green-50 border-green-200"
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
                          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                            <Send className="h-4 w-4 mr-2" />
                            Submit
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* View All Button */}
            <div className="absolute bottom-2 left-2">
              <Button variant="outline" size="sm" className="text-xs h-6 bg-white hover:bg-purple-50 border-purple-200" onClick={() => navigate('/wellness')}>
                <Book className="h-2 w-2 mr-1" />
                View All
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab - Cork Board Style */}
        <TabsContent value="notifications" className="space-y-3">
          <div className="relative bg-gradient-to-br from-blue-50 to-cyan-100 rounded-lg p-4 min-h-[300px]" 
               style={{
                 backgroundImage: `
                   radial-gradient(circle at 15% 20%, #0284c7 1px, transparent 1px),
                   radial-gradient(circle at 85% 80%, #0284c7 1px, transparent 1px),
                   radial-gradient(circle at 50% 60%, #0284c7 1px, transparent 1px)
                 `,
                 backgroundSize: '85px 85px, 95px 95px, 75px 75px'
               }}>
            <NotificationsSection />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const RightColumnContent = () => (
    <div className="space-y-4">
      {/* Executive Board Modular Hub - Show for executive board members */}
      {profile?.is_exec_board && profile?.verified && (
        <ExecBoardModularHub className="mb-4" />
      )}
      
      {/* Calendar Section */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-2 p-3 border-b">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Calendar</h3>
        </div>
        <ScrollArea className="h-[300px]">
          <PublicCalendarViews />
          <div className="p-3 border-t mt-2">
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
        </ScrollArea>
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="overflow-hidden">
            <div className="animate-[scroll-left_20s_linear_infinite] whitespace-nowrap text-xs text-muted-foreground">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 5).map((event, index) => (
                  <span key={event.id} className="inline-block">
                    {event.title} - {format(new Date(event.start_date), 'MMM d')}
                    {index < Math.min(upcomingEvents.length, 5) - 1 && ' • '}
                  </span>
                ))
              ) : (
                <span>No upcoming events</span>
              )}
            </div>
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
            <ScrollArea className="h-[200px] md:h-[280px]">
              <div className="space-y-2">
                 {filteredMusic.map((music) => (
                   <div 
                     key={music.id} 
                     className="depth-subtle depth-hover cursor-pointer rounded-lg p-2 transition-all duration-300"
                     onClick={() => handleViewMusic(music)}
                   >
                     <div className="flex items-start justify-between">
                       <div className="flex-1 min-w-0">
                         <h4 className="font-medium text-xs leading-tight mb-1 truncate">{music.title}</h4>
                         <p className="text-xs text-muted-foreground truncate">{music.composer}</p>
                         <div className="flex flex-wrap gap-1 mt-1">
                           {music.voice_parts && music.voice_parts.length > 0 && (
                             <Badge variant="outline" className="text-xs h-4 px-1 depth-1">
                               {music.voice_parts.join(", ")}
                             </Badge>
                           )}
                           {music.difficulty_level && (
                             <Badge variant="outline" className="text-xs h-4 px-1 depth-1">
                               {music.difficulty_level}
                             </Badge>
                           )}
                         </div>
                       </div>
                       {canDownloadPDF() && (
                         <div className="flex gap-1 flex-shrink-0">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-6 w-6 p-0 depth-hover"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDownloadMusic(music);
                             }}
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </div>
                       )}
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
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 overflow-visible relative -mt-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 border-blue-200" data-section="community-hub">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-blue-50/50 transition-colors pb-4 relative z-20 bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Heart className="h-6 w-6 text-red-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full shadow-sm"></div>
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-900">Community Cork Board</CardTitle>
                  <p className="text-xs text-amber-700">A place for love, support, and connection</p>
                </div>
                <div className="flex gap-1">
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-2 bg-red-500">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                  {sharedReflections.length > 0 && (
                    <Badge variant="outline" className="text-xs h-5 px-2 bg-green-100 text-green-700 border-green-300">
                      New
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {isExpanded ? <ChevronUp className="h-4 w-4 text-amber-700" /> : <ChevronDown className="h-4 w-4 text-amber-700" />}
              </div>
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
      
      {/* Sheet Music View Dialog */}
      {selectedMusicItem && (
        <SheetMusicViewDialog 
          open={musicDialogOpen} 
          onOpenChange={setMusicDialogOpen} 
          item={selectedMusicItem} 
        />
      )}
    </Card>
  );
};