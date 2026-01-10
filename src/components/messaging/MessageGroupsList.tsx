import React from 'react';
import { MessageGroup } from '@/hooks/useMessaging';
import { cn } from '@/lib/utils';
import { Hash, Lock, Users, Music, Calendar, ChevronRight } from 'lucide-react';

interface MessageGroupsListProps {
  groups: MessageGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export const MessageGroupsList: React.FC<MessageGroupsListProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
}) => {
  const getGroupIcon = (type: MessageGroup['group_type']) => {
    switch (type) {
      case 'executive':
        return <Users className="h-4 w-4" />;
      case 'voice_section':
        return <Music className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'private':
        return <Lock className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getGroupTypeColor = (type: MessageGroup['group_type']) => {
    switch (type) {
      case 'executive':
        return 'bg-purple-500/20 text-purple-500';
      case 'voice_section':
        return 'bg-blue-500/20 text-blue-500';
      case 'event':
        return 'bg-green-500/20 text-green-500';
      case 'private':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="h-full">
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={cn(
              "w-full px-4 py-3 text-left transition-colors",
              "flex items-center gap-3 active:bg-accent/70",
              "hover:bg-accent/50",
              selectedGroupId === group.id && "bg-primary/10"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
              getGroupTypeColor(group.group_type)
            )}>
              {group.avatar_url ? (
                <img 
                  src={group.avatar_url} 
                  alt={group.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                group.name.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* Group Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-muted-foreground">
                  {getGroupIcon(group.group_type)}
                </span>
                <h3 className="text-base font-medium truncate text-foreground">
                  {group.name}
                </h3>
                {group.is_private && (
                  <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                Tap to open conversation
              </p>
            </div>

            {/* Chevron for mobile affordance */}
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
        
        {groups.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Hash className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">No Groups Yet</h3>
            <p className="text-sm text-muted-foreground">
              Ask an admin to create groups for you to join
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
