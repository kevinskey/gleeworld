// Attach a video to a course playlist. Two modes:
//   - pick an existing playlist and insert into gw_course_playlist_videos
//   - type a new title, create the row in gw_course_playlists first, then
//     insert
//
// Course selection uses gw_courses; RLS returns only the courses the caller
// can see (admin/teacher/enrolled). If the caller has no visible courses,
// we say so up front instead of showing an empty select.

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseRow {
  id: string;
  title: string | null;
  course_code: string | null;
}

interface PlaylistRow {
  id: string;
  title: string;
  video_count: number;
}

interface Props {
  open: boolean;
  videoRowId: string | null; // youtube_videos.id
  onClose: () => void;
  onAdded: () => void;
}

export function AddToPlaylistDialog({ open, videoRowId, onClose, onAdded }: Props) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [courseId, setCourseId] = useState<string>('');
  const [playlists, setPlaylists] = useState<PlaylistRow[] | null>(null);
  const [playlistId, setPlaylistId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, title, course_code')
        .order('title', { ascending: true });
      if (!cancelled) setCourses((data as CourseRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!courseId) { setPlaylists(null); setPlaylistId(''); return; }
    let cancelled = false;
    (async () => {
      // Pull playlists for this course + rough count for display.
      const { data } = await supabase
        .from('gw_course_playlists')
        .select('id, title')
        .eq('course_id', courseId)
        .order('display_order', { ascending: true, nullsFirst: false });
      if (cancelled) return;
      const rows = (data as { id: string; title: string }[]) || [];
      // Count videos per playlist in a second query so we can show it.
      const counts: Record<string, number> = {};
      if (rows.length > 0) {
        const { data: countData } = await supabase
          .from('gw_course_playlist_videos')
          .select('playlist_id')
          .in('playlist_id', rows.map((r) => r.id));
        for (const c of (countData as { playlist_id: string }[]) || []) {
          counts[c.playlist_id] = (counts[c.playlist_id] || 0) + 1;
        }
      }
      setPlaylists(rows.map((r) => ({ ...r, video_count: counts[r.id] || 0 })));
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  const attach = async () => {
    if (!videoRowId || !courseId) return;
    setSubmitting(true);
    try {
      let targetId = playlistId;

      if (creating || !targetId) {
        // Create playlist first.
        const title = newTitle.trim();
        if (!title) {
          toast({ title: 'Playlist title required', variant: 'destructive' });
          return;
        }
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id ?? null;
        const { data, error } = await supabase
          .from('gw_course_playlists')
          .insert({ course_id: courseId, title, created_by: uid })
          .select('id')
          .single();
        if (error || !data) {
          toast({ title: 'Could not create playlist', description: error?.message, variant: 'destructive' });
          return;
        }
        targetId = data.id;
      }

      const { data: authData2 } = await supabase.auth.getUser();
      const uid = authData2?.user?.id ?? null;
      const { error: linkErr } = await supabase
        .from('gw_course_playlist_videos')
        .insert({ playlist_id: targetId, video_id: videoRowId, added_by: uid });
      if (linkErr) {
        if (linkErr.code === '23505') {
          toast({ title: 'Already in that playlist' });
        } else {
          toast({ title: 'Could not attach', description: linkErr.message, variant: 'destructive' });
          return;
        }
      } else {
        toast({ title: 'Added to playlist' });
      }
      onAdded();
      onClose();
      // Reset for next open.
      setCourseId('');
      setPlaylistId('');
      setCreating(false);
      setNewTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  const noCourses = courses !== null && courses.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to course playlist</DialogTitle>
        </DialogHeader>
        {noCourses ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            You are not attached to any courses yet. Create or join a course first.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Course</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={courses === null ? 'Loading…' : 'Pick a course'} /></SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.course_code ? `${c.course_code} — ` : ''}{c.title || 'Untitled course'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {courseId && !creating && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Playlist</label>
                <Select value={playlistId} onValueChange={setPlaylistId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={playlists === null ? 'Loading…' : (playlists.length === 0 ? 'No playlists yet' : 'Pick a playlist')} /></SelectTrigger>
                  <SelectContent>
                    {(playlists || []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title} · {p.video_count} video{p.video_count === 1 ? '' : 's'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create a new playlist
                </Button>
              </div>
            )}

            {courseId && creating && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">New playlist title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Week 3 Rehearsal Playbacks"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setCreating(false)}
                >
                  ← Pick an existing playlist instead
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={attach}
                disabled={submitting || !courseId || (creating ? !newTitle.trim() : !playlistId)}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Add to playlist
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
