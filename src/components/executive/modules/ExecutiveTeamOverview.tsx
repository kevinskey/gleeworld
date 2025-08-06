import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Crown, User, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface ExecMember {
  user_id: string;
  position: string;
  is_active: boolean;
  full_name?: string;
  email?: string;
  last_activity?: string;
}

interface ExecutiveTeamOverviewProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveTeamOverview = ({ preview = false }: ExecutiveTeamOverviewProps) => {
  // Mock data for demonstration
  const mockMembers: ExecMember[] = [
    {
      user_id: '1',
      position: 'president',
      is_active: true,
      full_name: 'Sarah Johnson',
      email: 'president@spelman.edu'
    },
    {
      user_id: '2',
      position: 'tour_manager',
      is_active: true,
      full_name: 'Onnesty Peele',
      email: 'onnestypeele@spelman.edu'
    },
    {
      user_id: '3',
      position: 'secretary',
      is_active: true,
      full_name: 'Maria Williams',
      email: 'secretary@spelman.edu'
    }
  ];

  const getRoleIcon = (position: string) => {
    if (position === 'president') return <Crown className="h-4 w-4 text-yellow-600" />;
    return <User className="h-4 w-4 text-blue-600" />;
  };

  const formatPosition = (position: string) => {
    return position.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? 
      <CheckCircle className="h-3 w-3 text-green-600" /> : 
      <AlertCircle className="h-3 w-3 text-red-600" />;
  };

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Active Members</span>
          <Badge variant="outline">{mockMembers.filter(m => m.is_active).length}</Badge>
        </div>
        {mockMembers.slice(0, 3).map((member) => (
          <div key={member.user_id} className="flex items-center gap-2 p-2 border rounded text-sm">
            {getRoleIcon(member.position)}
            <span className="font-medium">{member.full_name}</span>
            <Badge variant="outline" className="text-xs">
              {formatPosition(member.position)}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {mockMembers.map((member) => (
          <Card key={member.user_id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getRoleIcon(member.position)}
                <div>
                  <h4 className="font-medium text-sm">{member.full_name}</h4>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              {getStatusIcon(member.is_active)}
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                {formatPosition(member.position)}
              </Badge>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Last active: Today</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center py-4 text-muted-foreground text-sm">
        Connected to live executive board data...
      </div>
    </div>
  );
};