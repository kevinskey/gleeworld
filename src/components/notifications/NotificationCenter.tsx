import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bell, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Check, 
  Trash2, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Settings,
  RefreshCw,
  ChevronDown,
  X,
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { format, isToday, isYesterday, subDays } from "date-fns";

interface NotificationCenterProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type FilterType = 'all' | 'unread' | 'read' | 'starred';
type SortType = 'newest' | 'oldest' | 'priority' | 'type';
type NotificationType = 'urgent' | 'success' | 'warning' | 'info' | 'system' | 'reminder';

export const NotificationCenter = ({ trigger, isOpen, onOpenChange }: NotificationCenterProps) => {
  const { notifications, loading, refetch, markNotificationAsRead, deleteNotification } = useUserDashboardContext();
  
  // State for filters and selections
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState<Set<NotificationType>>(new Set());

  // Auto-refresh notifications
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Filter and sort notifications
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => {
        switch (filterType) {
          case 'unread':
            return !notification.is_read;
          case 'read':
            return notification.is_read;
          case 'starred':
            return notification.priority >= 3; // High priority (assuming 3+ is high/urgent)
          default:
            return true;
        }
      });
    }

    // Apply notification type filter
    if (selectedNotificationTypes.size > 0) {
      filtered = filtered.filter(notification =>
        selectedNotificationTypes.has(notification.type as NotificationType)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority':
          // Since priority is a number, sort by numeric value directly
          return b.priority - a.priority;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [notifications, searchQuery, filterType, sortType, selectedNotificationTypes]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string, priority: number) => {
    if (priority >= 4) return <AlertCircle className="h-4 w-4 text-red-500" />;
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get notification color based on type
  const getNotificationTypeColor = (type: string, priority: number) => {
    if (priority >= 4) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'system': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'reminder': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format notification date
  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else if (date > subDays(new Date(), 7)) {
      return format(date, 'EEEE at h:mm a');
    } else {
      return format(date, 'MMM d, yyyy at h:mm a');
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredAndSortedNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredAndSortedNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(id => {
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.is_read) {
        markNotificationAsRead(id);
      }
    });
    setSelectedNotifications(new Set());
  };

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => {
      deleteNotification(id);
    });
    setSelectedNotifications(new Set());
  };

  // Statistics
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority >= 4).length,
    today: notifications.filter(n => isToday(new Date(n.created_at))).length
  };

  const NotificationCenterContent = () => (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h2 className="text-2xl font-semibold">Notification Center</h2>
              <p className="text-sm text-muted-foreground">
                Manage your notifications and stay updated
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
              <div className="text-xs text-muted-foreground">Unread</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
              <div className="text-xs text-muted-foreground">Urgent</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.today}</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="starred">Important</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortType} onValueChange={(value: SortType) => setSortType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="space-y-3">
              <h4 className="font-medium">Notification Types</h4>
              <div className="flex flex-wrap gap-2">
                {(['urgent', 'success', 'warning', 'info', 'system', 'reminder'] as NotificationType[]).map(type => (
                  <Button
                    key={type}
                    variant={selectedNotificationTypes.has(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newSet = new Set(selectedNotificationTypes);
                      if (newSet.has(type)) {
                        newSet.delete(type);
                      } else {
                        newSet.add(type);
                      }
                      setSelectedNotificationTypes(newSet);
                    }}
                  >
                    {getNotificationIcon(type, 0)}
                    <span className="ml-2 capitalize">{type}</span>
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
            <span className="text-sm font-medium">
              {selectedNotifications.size} notification{selectedNotifications.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkMarkAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark as Read
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedNotifications(new Set())}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          {/* Select All */}
          {filteredAndSortedNotifications.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedNotifications.size === filteredAndSortedNotifications.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredAndSortedNotifications.length})
              </span>
            </div>
          )}
        </div>

        <ScrollArea className="h-full px-4">
          <div className="space-y-2 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading notifications...</span>
              </div>
            ) : filteredAndSortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              filteredAndSortedNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-all cursor-pointer hover:shadow-md ${
                    !notification.is_read 
                      ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/10' 
                      : 'hover:bg-muted/50'
                  } ${selectedNotifications.has(notification.id) ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedNotifications.has(notification.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedNotifications);
                          if (checked) {
                            newSet.add(notification.id);
                          } else {
                            newSet.delete(notification.id);
                          }
                          setSelectedNotifications(newSet);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 ml-2">
                            {notification.type && (
                              <Badge 
                                className={`text-xs ${getNotificationTypeColor(notification.type, notification.priority)}`}
                                variant="secondary"
                              >
                                {notification.type}
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.is_read && (
                                  <DropdownMenuItem onClick={() => markNotificationAsRead(notification.id)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => deleteNotification(notification.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatNotificationDate(notification.created_at)}
                          </div>
                          
                          {notification.category && (
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (isOpen !== undefined && onOpenChange) {
    // Controlled mode - for integration with external state
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <NotificationCenterContent />
        </DialogContent>
      </Dialog>
    );
  }

  // Default mode with trigger
  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-5xl h-[90vh] p-0">
        <NotificationCenterContent />
      </DialogContent>
    </Dialog>
  );
};