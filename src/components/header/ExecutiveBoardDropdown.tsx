import React, { useState, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Users, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ExecutiveBoardMember {
  id: string;
  user_id: string;
  position: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface GroupedMembers {
  [position: string]: ExecutiveBoardMember[];
}

const POSITION_DISPLAY_NAMES: Record<string, string> = {
  'president': 'President',
  'vice_president': 'Vice President',
  'secretary': 'Secretary',
  'treasurer': 'Treasurer',
  'business_manager': 'Business Manager',
  'pr_coordinator': 'PR Coordinator',
  'social_media_manager': 'Social Media Manager',
  'tour_manager': 'Tour Manager',
  'historian': 'Historian',
  'chaplain': 'Chaplain',
  'section_leader': 'Section Leader',
  'librarian': 'Librarian',
  'wardrobe_manager': 'Wardrobe Manager',
  'music_director': 'Music Director',
  'assistant_director': 'Assistant Director'
};

const POSITION_ORDER = [
  'president',
  'vice_president', 
  'secretary',
  'treasurer',
  'business_manager',
  'pr_coordinator',
  'social_media_manager',
  'tour_manager',
  'historian',
  'chaplain',
  'section_leader',
  'librarian',
  'wardrobe_manager',
  'music_director',
  'assistant_director'
];

export const ExecutiveBoardDropdown = () => {
  const [members, setMembers] = useState<ExecutiveBoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExecutiveMembers();
  }, []);

  const fetchExecutiveMembers = async () => {
    try {
      setLoading(true);
      
      // Get active executive board members
      const { data: membersData, error: membersError } = await supabase
        .from('gw_executive_board_members')
        .select('id, user_id, position, is_active')
        .eq('is_active', true)
        .order('position');

      if (membersError) {
        console.error('Error fetching executive board members:', membersError);
        return;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Get profile information for each member
      const memberProfiles = await Promise.all(
        membersData.map(async (member) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            id: member.id,
            user_id: member.user_id,
            position: member.position,
            is_active: member.is_active,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
            avatar_url: profile?.avatar_url || null,
          };
        })
      );

      setMembers(memberProfiles);
    } catch (error) {
      console.error('Error fetching executive board members:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupMembersByPosition = (members: ExecutiveBoardMember[]): GroupedMembers => {
    return members.reduce((acc, member) => {
      if (!acc[member.position]) {
        acc[member.position] = [];
      }
      acc[member.position].push(member);
      return acc;
    }, {} as GroupedMembers);
  };

  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleMemberClick = (userId: string) => {
    navigate(`/member-view/${userId}`);
  };

  const groupedMembers = groupMembersByPosition(members);
  const sortedPositions = POSITION_ORDER.filter(position => groupedMembers[position]);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 p-0 rounded-md">
        <Crown className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 p-0 rounded-md hover:bg-accent/20"
          type="button"
        >
          <Crown className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-yellow-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-background border border-border shadow-lg z-[200]" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-600" />
          Executive Board
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sortedPositions.length === 0 ? (
          <DropdownMenuItem disabled>
            No active executive board members
          </DropdownMenuItem>
        ) : (
          sortedPositions.map(position => (
            <DropdownMenuSub key={position}>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium">
                    {POSITION_DISPLAY_NAMES[position] || position.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {groupedMembers[position].length}
                    </span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {groupedMembers[position].map(member => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => handleMemberClick(member.user_id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarImage 
                          src={member.avatar_url || undefined} 
                          alt={member.full_name || member.email || 'Board Member'}
                        />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-secondary text-white">
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">
                          {member.full_name || 'Unknown Member'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate('/admin/executive-board')}
          className="cursor-pointer text-sm text-muted-foreground"
        >
          <Users className="mr-2 h-4 w-4" />
          Manage Executive Board
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};