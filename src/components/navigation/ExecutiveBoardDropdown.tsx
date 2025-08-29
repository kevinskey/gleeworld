import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Crown, User, Eye, ChevronDown } from 'lucide-react';
import { useExecutiveBoardMembers } from '@/hooks/useExecutiveBoardMembers';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DropdownMenuItem className="cursor-pointer flex items-center justify-between w-full">
          <div className="flex items-center">
            <Crown className="mr-2 h-4 w-4" />
            Executive Board
          </div>
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-background border border-border shadow-lg" side="right" align="start">
        {/* Overview Dashboard */}
        <DropdownMenuItem 
          onClick={() => navigate('/admin/executive-board')}
          className="cursor-pointer border-b"
        >
          <Eye className="mr-2 h-4 w-4" />
          Executive Overview
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Individual Member Dashboards */}
        {members.map((member) => (
          <DropdownMenuItem 
            key={member.user_id}
            onClick={() => {
              console.log('Navigating to member dashboard:', member.user_id);
              navigate(`/dashboard/executive-board/member/${member.user_id}`);
            }}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};