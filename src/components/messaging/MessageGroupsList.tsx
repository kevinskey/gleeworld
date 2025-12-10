import React from 'react';
import { MessageGroup } from '@/hooks/useMessaging';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Hash, Lock, Users, Music, Calendar } from 'lucide-react';

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
        return <Users className="h-3 w-3" />;
      case 'voice_section':
        return <Music className="h-3 w-3" />;
      case 'event':
        return <Calendar className="h-3 w-3" />;
      case 'private':
        return <Lock className="h-3 w-3" />;
      default:
        return <Hash className="h-3 w-3" />;
    }
  };

  const getGroupTypeColor = (type: MessageGroup['group_type']) => {
    switch (type) {
      case 'executive':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'voice_section':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'event':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'private':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-1 space-y-0.5">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={cn(
              "w-full px-2 py-1.5 rounded text-left transition-all duration-200 hover:bg-accent/50",
              "flex items-center gap-2 group",
              selectedGroupId === group.id && "bg-primary/10 border border-primary/20"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0",
              selectedGroupId === group.id 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
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
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "transition-colors",
                  selectedGroupId === group.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {getGroupIcon(group.group_type)}
                </span>
                <h3 className={cn(
                  "text-sm font-medium truncate transition-colors",
                  selectedGroupId === group.id ? "text-foreground" : "text-foreground"
                )}>
                  {group.name}
                </h3>
                {group.is_private && (
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        ))}
        
        {groups.length === 0 && (
          <div className="text-center py-8">
            <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Groups Yet</h3>
            <p className="text-sm text-muted-foreground">
              Ask an admin to create groups for you to join
            </p>
          </div>
        )}
      </div>
    </div>
  );
};