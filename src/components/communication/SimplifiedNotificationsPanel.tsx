import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Bell, Send, User, Users, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const SimplifiedNotificationsPanel = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, sendNotification } = useNotifications();
  const { users, loading: usersLoading } = useUsers();
  const [activeTab, setActiveTab] = useState("view");
  const [sendLoading, setSendLoading] = useState(false);
  
  // Form state for sending notifications
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as string,
    recipient: "self" as "self" | "specific",
    selectedUserId: ""
  });

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title || !formData.message) return;

    setSendLoading(true);
    try {
      let targetUserId = user.id;

      if (formData.recipient === "specific" && formData.selectedUserId) {
        targetUserId = formData.selectedUserId;
      }

      await sendNotification(
        targetUserId,
        formData.title,
        formData.message,
        {
          type: formData.type,
          category: "general",
          priority: 1
        }
      );

      // Reset form
      setFormData({
        title: "",
        message: "",
        type: "info",
        recipient: "self",
        selectedUserId: ""
      });

      setActiveTab("view");
    } catch (error) {
      console.error("Failed to send notification:", error);
    } finally {
      setSendLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-50 border-green-200 text-green-800";
      case "warning": return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "error": return "bg-red-50 border-red-200 text-red-800";
      default: return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <Check className="h-4 w-4 text-green-600" />;
      case "warning": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "error": return <Bell className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Send and manage notifications
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-2 py-1">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              View ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4 mt-6">
            {notificationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                <p className="text-sm">You'll see your notifications here when you receive them.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all ${
                      !notification.is_read 
                        ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" 
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getTypeColor(notification.type)}`}
                          >
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="send" className="space-y-6 mt-6">
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Send to
                </Label>
                <Select
                  value={formData.recipient}
                  onValueChange={(value: "self" | "specific") => 
                    setFormData(prev => ({ ...prev, recipient: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Myself (test notification)</SelectItem>
                    <SelectItem value="specific">Specific user</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recipient === "specific" && (
                <div className="space-y-2">
                  <Label htmlFor="recipientUser">Select User</Label>
                  <Select
                    value={formData.selectedUserId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, selectedUserId: value }))}
                    disabled={usersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a user"} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{user.full_name || user.email}</span>
                            <span className="text-muted-foreground text-sm">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Notification Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter notification title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                disabled={sendLoading || !formData.title || !formData.message}
                className="w-full"
              >
                {sendLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};