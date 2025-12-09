import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnlineUser } from '@/hooks/useGleeLoungePresence';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { MessageCircle, Hand, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OnlineSidebarProps {
  users: OnlineUser[];
  onWave?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export function OnlineSidebar({ users, onWave, onMessage }: OnlineSidebarProps) {
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <Users className="h-4 w-4" />
          Who's Online
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {users.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No one else is here yet. Be the first to hang out!
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={getAvatarUrl(user.avatar_url) || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.joined_at ? (
                        `Joined ${formatDistanceToNow(new Date(user.joined_at), { addSuffix: true })}`
                      ) : (
                        'Online now'
                      )}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onWave?.(user.user_id)}
                      title="Wave"
                    >
                      <Hand className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onMessage?.(user.user_id)}
                      title="Message"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
