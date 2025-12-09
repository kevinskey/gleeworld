import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineUser } from '@/hooks/useGleeLoungePresence';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { Users } from 'lucide-react';

interface OnlineNowWidgetProps {
  users: OnlineUser[];
  onExpand?: () => void;
}

export function OnlineNowWidget({ users, onExpand }: OnlineNowWidgetProps) {
  const displayUsers = users.slice(0, 5);
  const extraCount = Math.max(0, users.length - 5);

  if (users.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No one else online</span>
      </div>
    );
  }

  return (
    <button
      onClick={onExpand}
      className="flex items-center gap-2 px-3 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg hover:bg-accent/50 transition-colors w-full"
    >
      <div className="flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>
      
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <Avatar key={user.user_id} className="h-7 w-7 border-2 border-background">
            <AvatarImage src={getAvatarUrl(user.avatar_url) || undefined} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {extraCount > 0 && (
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted border-2 border-background text-xs font-medium">
            +{extraCount}
          </div>
        )}
      </div>
      
      <span className="text-sm font-medium text-foreground">
        {users.length} online
      </span>
    </button>
  );
}
