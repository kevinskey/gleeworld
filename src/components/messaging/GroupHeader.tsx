import React from 'react';
import { ArrowLeft, MoreVertical, Search, Calendar, BarChart3, Image, Users, Settings, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="bg-[hsl(var(--message-header))] text-white px-1.5 md:px-4 py-2 md:py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-7 w-7 md:h-9 md:w-9 text-white hover:bg-white/20 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        )}
        
        <Avatar className="h-7 w-7 md:h-10 md:w-10 flex-shrink-0 border-2 border-white/30">
          <AvatarImage src={groupAvatar} />
          <AvatarFallback className="bg-white/20 text-white font-medium text-[10px] md:text-sm">
            {groupInitials}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="font-semibold text-xs md:text-base lg:text-lg truncate">{groupName}</h1>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9 text-white hover:bg-white/20"
        >
          <Search className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 text-white hover:bg-white/20"
            >
              <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56">
            <DropdownMenuItem className="text-sm">
              <Calendar className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span className="flex-1">Events</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-[hsl(var(--message-header))] text-white h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                18
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              <BarChart3 className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span className="flex-1">Polls</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-[hsl(var(--message-header))] text-white h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                1
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              <Image className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span>Gallery</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              <Users className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span>Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              <Wrench className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span>Services</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              <Settings className="h-4 w-4 mr-2 sm:mr-3 text-[hsl(var(--message-header))]" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
