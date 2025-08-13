import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  MessageSquare,
  Calendar,
  User,
  Settings,
  Trash2,
  Check,
  Filter,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message' | 'event' | 'task';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  action_url?: string;
  metadata?: any;
}

const getNotificationIcon = (type: string) => {
  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertTriangle,
    message: MessageSquare,
    event: Calendar,
    task: User,
  };
  return iconMap[type as keyof typeof iconMap] || Bell;
};

const getNotificationColor = (type: string, priority: string) => {
  if (priority === 'urgent') return 'border-l-red-500 bg-red-50';
  if (priority === 'high') return 'border-l-orange-500 bg-orange-50';
  
  const colorMap = {
    info: 'border-l-blue-500 bg-blue-50',
    success: 'border-l-green-500 bg-green-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    error: 'border-l-red-500 bg-red-50',
    message: 'border-l-purple-500 bg-purple-50',
    event: 'border-l-indigo-500 bg-indigo-50',
    task: 'border-l-cyan-500 bg-cyan-50',
  };
  return colorMap[type as keyof typeof colorMap] || 'border-l-gray-500 bg-gray-50';
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
};

export const EnhancedNotificationsPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Mock data for now - replace with actual Supabase query
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'New Rehearsal Scheduled',
          message: 'Rehearsal for "Amazing Grace" scheduled for tomorrow at 3 PM in Sisters Chapel.',
          type: 'event',
          priority: 'high',
          is_read: false,
          created_at: new Date().toISOString(),
          sender_name: 'Director Johnson',
          action_url: '/calendar'
        },
        {
          id: '2',
          title: 'Sheet Music Updated',
          message: 'New arrangement for "Lift Every Voice" has been uploaded to the music library.',
          type: 'info',
          priority: 'medium',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender_name: 'Music Coordinator'
        },
        {
          id: '3',
          title: 'Concert Uniform Reminder',
          message: 'Please bring your concert dress for fitting this Friday.',
          type: 'warning',
          priority: 'medium',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          sender_name: 'Wardrobe Team'
        },
        {
          id: '4',
          title: 'Great Performance!',
          message: 'Congratulations on an amazing performance at the Founder\'s Day celebration!',
          type: 'success',
          priority: 'low',
          is_read: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          sender_name: 'President'
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'unread') return !n.is_read && matchesSearch;
    if (activeTab === 'read') return n.is_read && matchesSearch;
    
    if (filter !== 'all') {
      if (filter === 'urgent') return n.priority === 'urgent' && matchesSearch;
      if (filter === 'messages') return n.type === 'message' && matchesSearch;
      if (filter === 'events') return n.type === 'event' && matchesSearch;
    }
    
    return matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const Icon = getNotificationIcon(notification.type);
    
    return (
      <div 
        className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${
          getNotificationColor(notification.type, notification.priority)
        } ${!notification.is_read ? 'ring-2 ring-primary/20' : 'opacity-75'}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-foreground">
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <Badge variant="default" className="text-xs px-2 py-0">New</Badge>
                  )}
                  {notification.priority === 'urgent' && (
                    <Badge variant="destructive" className="text-xs px-2 py-0">Urgent</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {notification.sender_name && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={notification.sender_avatar} />
                          <AvatarFallback className="text-xs">
                            {notification.sender_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{notification.sender_name}</span>
                        <span>•</span>
                      </div>
                    )}
                    <span>{formatTimeAgo(notification.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border shadow-lg">
                        {!notification.is_read && (
                          <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                            <Check className="h-3 w-3 mr-2" />
                            Mark as read
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteNotification(notification.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border shadow-lg">
                <DropdownMenuItem onClick={() => setFilter('all')}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('urgent')}>Urgent</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('messages')}>Messages</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('events')}>Events</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pb-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </div>
          
          <Separator />
          
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-4 space-y-3">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>All caught up! No unread notifications.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="read" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-4 space-y-3">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No read notifications</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};