/**
 * PREMIUM HEADER COMPONENT
 * Dark themed header with GLEEWORLD branding, nav badges, and quick actions
 */

import React from 'react';
import { Music, Radio, Wrench, MessageSquare, Calendar, Camera, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: React.ElementType;
  badge?: number;
  path?: string;
}

const navItems: NavItem[] = [
  { label: 'RADIO', icon: Radio, path: '/radio' },
  { label: 'TOOLKIT', icon: Wrench, badge: 3, path: '/toolkit' },
  { label: 'MESSAGES', icon: MessageSquare, badge: 12, path: '/messages' },
  { label: 'CALENDAR', icon: Calendar, path: '/calendar' },
  { label: 'CAMERA', icon: Camera, path: '/camera' },
];

export const PremiumHeader: React.FC = () => {
  const { user } = useAuth();
  const { profile, displayName } = useMergedProfile(user);
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="w-full bg-[#0A0A0A] border-b border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Branding */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg tracking-wide">GLEEWORLD</h1>
              <p className="text-[#666666] text-xs uppercase tracking-wider">Premium Platform</p>
            </div>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className="relative px-4 py-2 text-[#888888] hover:text-white transition-colors text-sm font-medium tracking-wide flex items-center gap-2"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right: Quick Actions & Profile */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex bg-transparent border-[#333333] text-white hover:bg-[#1A1A1A] hover:border-orange-500/50 gap-2"
            >
              <Zap className="w-4 h-4 text-orange-500" />
              <span>QUICK ACTIONS</span>
            </Button>

            <div className="flex items-center gap-2 cursor-pointer group">
              <Avatar className="h-9 w-9 border-2 border-[#333333] group-hover:border-orange-500/50 transition-colors">
                <AvatarImage src={profile?.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-medium">
                  {getInitials(displayName || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-right">
                <p className="text-white text-sm font-medium">{displayName || 'User'}</p>
                <p className="text-[#666666] text-xs capitalize">{profile?.role || 'Member'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[#666666] hidden md:block" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
