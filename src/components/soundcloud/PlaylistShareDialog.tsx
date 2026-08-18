// Who can see one SoundCloud playlist on the Command Center page.
//
// Three kinds of target: a role, an Academy class, or one person by email.
// Roles stand in for "admin groups" — this schema has four different group
// tables and none of them means "the admins".
//
// Curation, not access control: these playlists are public on
// soundcloud.com, so anyone with the link can play them regardless. What
// this decides is what appears on the page. The dialog says so, because a
// share control that looks like a lock invites the wrong assumption.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Users, GraduationCap, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useManagedCourses } from '@/hooks/useManagedCourses';
import { describeShare, type PlaylistShare } from '@/lib/soundcloud/shares';

export interface SharablePlaylist {
  id: number;
  title: string;
  permalinkUrl: string;
}

const ROLE_OPTIONS = [
  { value: 'member', label: 'Everyone', hint: 'Every signed-in member of this workspace' },
  { value: 'staff', label: 'All staff', hint: 'Staff, admins and owners' },
  { value: 'admin', label: 'All admins', hint: 'Admins and owners only' },
] as const;

export function PlaylistShareDialog({
  playlist, open, onOpenChange, shares,
}: {
  playlist: SharablePlaylist | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shares: PlaylistShare[];
}) {
  const qc = useQueryClient();
  const { data: courses = [] } = useManagedCourses();
  const [role, setRole] = useState<string>('member');
  const [courseId, setCourseId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const courseNames = Object.fromEntries(
    (courses as Array<{ id: string; course_code?: string; title?: string }>).map(
      (c) => [c.id, c.course_code || c.title || 'Class'],
    ),
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['soundcloud-shares'] });

  const add = async (patch: Partial<PlaylistShare>) => {
    if (!playlist) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('gw_soundcloud_playlist_shares').insert({
        playlist_id: playlist.id,
        playlist_title: playlist.title,
        playlist_url: playlist.permalinkUrl,
        ...patch,
      } as never);
      if (error) {
        // The partial uniques make a repeat share a no-op rather than a
        // duplicate; say so plainly instead of surfacing a constraint name.
        const dup = error.code === '23505';
        toast[dup ? 'info' : 'error'](dup ? 'Already shared with that' : error.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      // revoked_at rather than DELETE: the row stays as a record of what was
      // shared and when it stopped.
      const { error } = await supabase
        .from('gw_soundcloud_playlist_shares')
        .update({ revoked_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) { toast.error(error.message); return; }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const addEmail = async () => {
    const value = email.trim().toLowerCase();
    if (!value || !value.includes('@')) { toast.error('Enter an email address'); return; }
    await add({ share_type: 'email', invited_email: value });
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Share “{playlist?.title}”</DialogTitle>
          <DialogDescription>
            Choose who sees this playlist on the SoundCloud page. It stays public on
            soundcloud.com either way — this controls the page, not the music.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent is a grid, and long emails and class names
            blow the track out on phones without it. */}
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Shared with</Label>
            {shares.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nobody yet — this playlist is hidden from everyone except admins.
              </p>
            ) : (
              shares.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  {s.share_type === 'email' ? <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    : s.share_type === 'course' ? <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    : <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-sm flex-1 truncate">{describeShare(s, courseNames)}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revoke(s.id)}
                    className="text-muted-foreground hover:text-rose-600 shrink-0 disabled:opacity-50"
                    aria-label={`Stop sharing with ${describeShare(s, courseNames)}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Share with a role</Label>
            <div className="flex gap-2">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => add({ share_type: 'role', target_role: role as PlaylistShare['target_role'] })}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {ROLE_OPTIONS.find((o) => o.value === role)?.hint}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Share with a class</Label>
            <div className="flex gap-2">
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={courses.length ? 'Pick a class' : 'No classes available'} />
                </SelectTrigger>
                <SelectContent>
                  {(courses as Array<{ id: string; course_code?: string; title?: string }>).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.course_code || c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={busy || !courseId}
                onClick={() => add({ share_type: 'course', course_id: courseId })}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Share with one person</Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void addEmail(); }}
                placeholder="singer@example.com"
                className="flex-1"
              />
              <Button variant="outline" disabled={busy} onClick={addEmail}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They see it once signed in with that address.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
