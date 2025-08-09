import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Headshot from '@/components/ui/headshot';
import { supabase } from '@/integrations/supabase/client';
import { EXECUTIVE_POSITIONS } from '@/hooks/useExecutivePermissions';
import { USER_ROLES } from '@/constants/permissions';
import { toast } from 'sonner';

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
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: '',
    is_exec_board: false,
    exec_board_role: '',
    is_admin: false,
    is_super_admin: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('email, full_name, role, exec_board_role, is_exec_board, is_admin, is_super_admin, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setForm({
          full_name: p.full_name || '',
          email: p.email || '',
          role: p.role || 'member',
          is_exec_board: !!p.is_exec_board,
          exec_board_role: p.exec_board_role || '',
          is_admin: !!p.is_admin,
          is_super_admin: !!p.is_super_admin,
        });
      }

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

  const roleOptions = Object.values(USER_ROLES) as string[];

  const resetForm = () => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || '',
      email: profile.email || '',
      role: profile.role || 'member',
      is_exec_board: !!profile.is_exec_board,
      exec_board_role: profile.exec_board_role || '',
      is_admin: !!profile.is_admin,
      is_super_admin: !!profile.is_super_admin,
    });
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // Director alias: ensure is_super_admin when role is director
      const isDirector = form.role === 'director' || form.role === 'super-admin' || form.is_super_admin;
      const updates = {
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        is_exec_board: form.is_exec_board,
        exec_board_role: form.exec_board_role || null,
        is_admin: form.is_admin,
        is_super_admin: isDirector,
      };

      const { error } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', userId);
      if (error) throw error;

      // Sync executive membership table for current academic year
      const currentYear = new Date().getFullYear().toString();
      if (form.is_exec_board) {
        await supabase
          .from('gw_executive_board_members')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('academic_year', currentYear);

        const { data: existing } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('user_id', userId)
          .eq('position', form.exec_board_role as any)
          .eq('academic_year', currentYear)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('gw_executive_board_members')
            .update({ is_active: true })
            .eq('id', (existing as any).id);
        } else if (form.exec_board_role) {
          await supabase
            .from('gw_executive_board_members')
            .insert({ user_id: userId, position: form.exec_board_role as any, academic_year: currentYear, is_active: true });
        }
      } else {
        await supabase
          .from('gw_executive_board_members')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('academic_year', currentYear);
      }

      toast.success('Profile updated');
      // Refresh
      const { data } = await supabase
        .from('gw_profiles')
        .select('email, full_name, role, exec_board_role, is_exec_board, is_admin, is_super_admin, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setForm({
          full_name: p.full_name || '',
          email: p.email || '',
          role: p.role || 'member',
          is_exec_board: !!p.is_exec_board,
          exec_board_role: p.exec_board_role || '',
          is_admin: !!p.is_admin,
          is_super_admin: !!p.is_super_admin,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
};

const onUploadClick = () => fileInputRef.current?.click();

const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !userId) return;
  setUploading(true);
  try {
    const path = `${userId}/avatars/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from('user-files')
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('user-files').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success('Photo uploaded');
  } catch (err) {
    console.error(err);
    toast.error('Upload failed');
  } finally {
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  return (
    <Card className="relative z-10">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        
      </CardHeader>
      <CardContent className="pointer-events-auto">
        <div className="flex flex-col items-center text-center gap-3">
          <Headshot
            src={avatarUrl}
            alt={profile?.full_name || profile?.email || 'User'}
            size="xl"
            ratio="4/5"
          />
          <div className="min-w-0">
            <div className="font-medium">{profile?.full_name || profile?.email || '—'}</div>
            <div className="text-xs text-muted-foreground">{profile?.email}</div>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">{displayRole()}</Badge>
            {profile?.is_exec_board && profile?.exec_board_role ? (
              <Badge variant="outline">Exec: {profile.exec_board_role}</Badge>
            ) : null}
            {profile?.is_admin ? <Badge>Admin</Badge> : null}
            {profile?.is_super_admin ? <Badge>Director</Badge> : null}
          </div>
          {profile?.created_at && (
            <div className="text-xs text-muted-foreground">Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <Button size="sm" variant="outline" onClick={onUploadClick} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger aria-label="Select role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r === 'super-admin' ? 'Director' : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-6">
              <div className="space-y-0.5">
                <Label htmlFor="director">Director (full access)</Label>
                <div className="text-xs text-muted-foreground">Alias of Super Admin with full privileges</div>
              </div>
              <Switch
                id="director"
                checked={form.is_super_admin || form.role === 'director' || form.role === 'super-admin'}
                onCheckedChange={(val) => setForm({
                  ...form,
                  is_super_admin: val,
                  role: val ? 'director' : (form.role === 'director' ? 'member' : form.role),
                })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin">Admin</Label>
              <div className="text-xs text-muted-foreground">Manage most areas</div>
            </div>
            <Switch id="admin" checked={form.is_admin} onCheckedChange={(val) => setForm({ ...form, is_admin: val })} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="exec">Executive Board Member</Label>
              <div className="text-xs text-muted-foreground">Show tools for Exec positions</div>
            </div>
            <Switch id="exec" checked={form.is_exec_board} onCheckedChange={(val) => setForm({ ...form, is_exec_board: val })} />
          </div>

          {form.is_exec_board && (
            <div>
              <Label htmlFor="exec_role">Executive Position</Label>
              <Select value={form.exec_board_role} onValueChange={(v) => setForm({ ...form, exec_board_role: v })}>
                <SelectTrigger aria-label="Select executive position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {EXECUTIVE_POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={resetForm} disabled={saving}>Reset</Button>
            <Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
