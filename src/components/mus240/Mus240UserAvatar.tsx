import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
export const Mus240UserAvatar: React.FC = () => {
  const {
    user
  } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const {
        data
      } = await supabase.from('gw_profiles').select('full_name, avatar_url').eq('user_id', user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);
  if (!user) return null;
  const displayName = profile?.full_name || user.email || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return <div className="fixed top-4 right-4 z-50">
      
    </div>;
};