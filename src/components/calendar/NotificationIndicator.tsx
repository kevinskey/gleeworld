import { Bell, BellDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const NotificationIndicator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  
  // Only show for authenticated users
  if (!user) return null;

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="relative gap-2"
    >
      {unreadCount > 0 ? (
        <BellDot className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      
      {unreadCount > 0 && (
        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      
      <span className="hidden sm:inline">
        Notifications {unreadCount > 0 && `(${unreadCount})`}
      </span>
    </Button>
  );
};