import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
}

interface Profile {
  email: string | null;
  full_name: string | null;
  role: string | null;
  exec_board_role: string | null;
  is_exec_board: boolean | null;
  is_admin: boolean | null;
  is_super_admin: boolean | null;
  created_at: string | null;
}

export const SelectedUserProfileCard: React.FC<Props> = ({ userId }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('email, full_name, role, exec_board_role, is_exec_board, is_admin, is_super_admin, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setProfile(data as Profile);

      try {
        const { data: avatar } = await supabase.rpc('get_avatar_url', { user_id_param: userId });
        if (avatar) setAvatarUrl(avatar as unknown as string);
      } catch (_) {
        // ignore
      }
    };
    load();
  }, [userId]);

  const displayRole = () => {
    if (!profile) return '';
    if (profile.is_super_admin || profile.role === 'super-admin' || profile.role === 'director') return 'Director';
    if (profile.is_admin || profile.role === 'admin') return 'Admin';
    return profile.role || 'Member';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Details for the selected user</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No Photo</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{profile?.full_name || profile?.email || '—'}</div>
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{displayRole()}</Badge>
              {profile?.is_exec_board && profile?.exec_board_role ? (
                <Badge variant="outline">Exec: {profile.exec_board_role}</Badge>
              ) : null}
              {profile?.is_admin ? <Badge>Admin</Badge> : null}
              {profile?.is_super_admin ? <Badge>Director</Badge> : null}
            </div>
          </div>
        </div>
        {profile?.created_at && (
          <div className="mt-4 text-xs text-muted-foreground">Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
        )}
      </CardContent>
    </Card>
  );
};
