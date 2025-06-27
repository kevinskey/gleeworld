
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Check } from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";

export const UserNotificationsList = () => {
  const { notifications, loading, error, markNotificationAsRead } = useUserDashboard();

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spelman-400"></div>
            <span className="ml-2 text-white">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-300 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-spelman-400/50 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Notifications</h3>
            <p className="text-white/70">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`glass-card border-spelman-400/20 ${
            !notification.is_read ? 'ring-2 ring-spelman-400/50' : ''
          }`}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {notification.title}
                  {!notification.is_read && (
                    <Badge className="bg-spelman-400 text-white text-xs">New</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {new Date(notification.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getNotificationColor(notification.type)}>
                  {notification.type}
                </Badge>
                {!notification.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-white/90 mb-2">{notification.message}</p>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Calendar className="h-3 w-3" />
              <span>{new Date(notification.created_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
