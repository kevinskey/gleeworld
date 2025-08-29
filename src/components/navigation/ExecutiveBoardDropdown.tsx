import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Crown, ChevronRight, User, Eye } from 'lucide-react';
import { useExecutiveBoardMembers } from '@/hooks/useExecutiveBoardMembers';

export const ExecutiveBoardDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { members, loading } = useExecutiveBoardMembers();

  if (loading) {
    return (
      <DropdownMenuItem disabled className="cursor-not-allowed">
        <Crown className="mr-2 h-4 w-4" />
        Loading Executive Board...
      </DropdownMenuItem>
    );
  }

  if (!members || members.length === 0) {
    return (
      <DropdownMenuItem 
        onClick={() => navigate('/admin/executive-board')}
        className="cursor-pointer"
      >
        <Crown className="mr-2 h-4 w-4" />
        Executive Board
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Crown className="mr-2 h-4 w-4" />
        Executive Board
        <ChevronRight className="ml-auto h-4 w-4" />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 bg-background border border-border shadow-lg z-[210]">
        {/* Overview Dashboard */}
        <DropdownMenuItem 
          onClick={() => navigate('/admin/executive-board')}
          className="cursor-pointer border-b"
        >
          <Eye className="mr-2 h-4 w-4" />
          Executive Overview
        </DropdownMenuItem>
        
        {/* Individual Member Dashboards */}
        {members.map((member) => (
          <DropdownMenuItem 
            key={member.user_id}
            onClick={() => navigate(`/admin/executive-board/member/${member.user_id}`)}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">{member.full_name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {member.position?.replace(/_/g, ' ')}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};