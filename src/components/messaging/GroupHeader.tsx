import React from 'react';
import { ArrowLeft, MoreVertical, Search, Calendar, BarChart3, Image, Users, Settings, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface GroupHeaderProps {
  groupName: string;
  groupAvatar?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  groupName,
  groupAvatar,
  onBack,
  showBackButton = false,
}) => {
  const groupInitials = groupName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-[hsl(var(--message-header))] text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 text-white hover:bg-white/20 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-white/30">
          <AvatarImage src={groupAvatar} />
          <AvatarFallback className="bg-white/20 text-white font-medium">
            {groupInitials}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="font-semibold text-lg truncate">{groupName}</h1>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20"
        >
          <Search className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/20"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Calendar className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Events</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BarChart3 className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Polls</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Image className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Gallery</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Users className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wrench className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Services</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-3 text-[hsl(var(--message-header))]" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
