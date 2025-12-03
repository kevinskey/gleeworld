import React, { useState } from 'react';
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
import { GroupMembersDialog } from './GroupMembersDialog';
import { PollsDialog } from './PollsDialog';
import { EventsDialog } from './EventsDialog';
import { useUnvotedPollCount } from '@/hooks/useUnvotedPollCount';
import { useCanManageGroupMembers } from '@/hooks/useCanManageGroupMembers';

interface GroupHeaderProps {
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  groupId,
  groupName,
  groupAvatar,
  onBack,
  showBackButton = false,
}) => {
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showPollsDialog, setShowPollsDialog] = useState(false);
  const [showEventsDialog, setShowEventsDialog] = useState(false);
  const { unvotedCount } = useUnvotedPollCount(groupId);
  const { canManage } = useCanManageGroupMembers();
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
        {/* Prominent Polls Button */}
        <Button
          variant="ghost"
          onClick={() => setShowPollsDialog(true)}
          className="relative h-8 md:h-9 px-2 md:px-3 text-white hover:bg-white/20 flex items-center gap-1"
        >
          <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline text-xs md:text-sm font-medium">Polls</span>
          {unvotedCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full animate-pulse">
              {unvotedCount}
            </Badge>
          )}
        </Button>

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
          <DropdownMenuContent align="end" className="w-64 p-2 bg-background shadow-lg border z-50">
            <DropdownMenuItem 
              className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent"
              onClick={() => setShowEventsDialog(true)}
            >
              <Calendar className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Events</span>
              <Badge className="ml-2 bg-blue-500 text-white h-6 min-w-6 px-2 text-xs font-semibold rounded-full">
                18
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent"
              onClick={() => setShowPollsDialog(true)}
            >
              <BarChart3 className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Polls</span>
              {unvotedCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white h-6 min-w-6 px-2 text-xs font-semibold rounded-full animate-pulse">
                  {unvotedCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent">
              <Image className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Gallery</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent"
              onClick={() => setShowMembersDialog(true)}
            >
              <Users className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent">
              <Wrench className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Services</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-3 px-3 cursor-pointer rounded-md hover:bg-accent focus:bg-accent">
              <Settings className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
              <span className="flex-1 text-base font-medium">Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GroupMembersDialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
        groupId={groupId}
        groupName={groupName}
        canManageMembers={canManage}
      />

      <PollsDialog
        open={showPollsDialog}
        onOpenChange={setShowPollsDialog}
        groupId={groupId}
      />

      <EventsDialog
        open={showEventsDialog}
        onOpenChange={setShowEventsDialog}
        groupId={groupId}
        groupName={groupName}
      />
    </div>
  );
};
