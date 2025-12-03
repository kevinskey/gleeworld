import React from 'react';
import { MessageCircle, Bell, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnnouncementsTicker } from './AnnouncementsTicker';

interface DashboardHeaderProps {
  user: any;
  onToggleMessages: () => void;
  showMessages: boolean;
}

export const DashboardHeader = ({ user, onToggleMessages, showMessages }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="h-20 bg-background/80 backdrop-blur-sm border-b border-border px-6 flex items-center justify-between">
      {/* Left side - Logo and search */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
            G
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">GleeWorld</h1>
            <p className="text-sm text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Center - Announcements ticker */}
      <AnnouncementsTicker />

      {/* Right side - Actions and profile */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="default"
          onClick={onToggleMessages}
          className={`relative h-9 px-6 ${showMessages ? 'bg-muted' : ''}`}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Messages
          <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="sm">
          <Bell className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="sm">
          <Settings className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-spelman-blue-dark text-white font-semibold">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};