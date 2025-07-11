
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2 text-gray-900 text-sm">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-brand-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-sm">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={!notification.is_read ? 'ring-2 ring-brand-400/50' : ''}
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-gray-900 flex items-start gap-2 text-2xl sm:text-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{notification.title}</span>
                  {!notification.is_read && (
                    <Badge className="bg-brand-600 text-white text-xs ml-2 flex-shrink-0">New</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm mt-1">
                  {new Date(notification.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`${getNotificationColor(notification.type)} text-xs`}>
                  {notification.type}
                </Badge>
                {!notification.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="border-brand-300 text-brand-700 hover:bg-brand-50 text-xs px-2 py-1"
                  >
                    <Check className="h-3 w-3" />
                    <span className="sr-only">Mark as read</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-700 mb-2 text-sm break-words">{notification.message}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{new Date(notification.created_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
