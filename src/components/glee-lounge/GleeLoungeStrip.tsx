import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sofa, Users, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

export const GleeLoungeStrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<string | null>(null);

  // Fetch recent post count
  useEffect(() => {
    const fetchPostCount = async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('gw_social_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo)
        .eq('is_hidden', false);
      
      setPostCount(count || 0);
    };

    const fetchRecentActivity = async () => {
      const { data } = await supabase
        .from('gw_social_posts')
        .select('content, created_at')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.content) {
        const truncated = data.content.length > 50 
          ? data.content.substring(0, 50) + '...' 
          : data.content;
        setRecentActivity(truncated);
      }
    };

    fetchPostCount();
    fetchRecentActivity();
  }, []);

  // Subscribe to presence to see who's in the lounge (but don't track - only lounge page tracks)
  useEffect(() => {
    const channel = supabase.channel('glee-lounge-presence-viewer', {
      config: {
        presence: {
          key: 'viewer',
        },
      },
    });

    // Subscribe to the actual lounge presence channel to read state
    const loungeChannel = supabase.channel('glee-lounge-presence');
    
    loungeChannel
      .on('presence', { event: 'sync' }, () => {
        const state = loungeChannel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (!users.find(u => u.user_id === presence.user_id)) {
              users.push({
                user_id: presence.user_id,
                full_name: presence.full_name,
                avatar_url: presence.avatar_url,
              });
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(loungeChannel);
    };
  }, []);

  return (
    <div 
      onClick={() => navigate('/glee-lounge')}
      className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl p-3 sm:p-4 cursor-pointer hover:border-emerald-400/50 transition-all group"
    >
      <div className="flex items-center justify-between">
        {/* Left: Icon and Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Sofa className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Glee Lounge
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                Social Hub
              </span>
            </h3>
            {recentActivity && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                Latest: "{recentActivity}"
              </p>
            )}
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden sm:flex items-center gap-6">
          {/* Online Users */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">
              {onlineUsers.length} online
            </span>
            {onlineUsers.length > 0 && (
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((u, i) => (
                  <div 
                    key={u.user_id}
                    className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium"
                    title={u.full_name}
                  >
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Posts Today */}
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{postCount}</span>
              <span className="text-muted-foreground"> posts today</span>
            </span>
          </div>
        </div>

        {/* Right: Enter Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 group-hover:translate-x-1 transition-transform"
        >
          Enter
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Stats Row */}
      <div className="flex sm:hidden items-center gap-4 mt-2 pt-2 border-t border-emerald-500/20">
        <div className="flex items-center gap-1 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>{onlineUsers.length} online</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3 w-3" />
          <span>{postCount} posts today</span>
        </div>
      </div>
    </div>
  );
};
