// Share a video (or a playlist) to another user or a course. Group
// sharing is scaffolded in the schema but not exposed here yet — it
// ships with the follow-up gw_user_groups migration.
//
// Recipient picker: searches gw_profiles by display_name / email, and
// gw_courses by title / course_code. Both dropdowns keep their queries
// short (limit 20) so the picker stays snappy for tenants with big
// rosters.

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Share2, User, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { shareResource, type ShareResourceType } from '@/hooks/useVideoLibrary';

interface Props {
  open: boolean;
  resourceType: ShareResourceType;
  resourceId?: string;
  resourceCategory?: string;
  resourceLabel: string; // Shown in the header ("Share \"My Video\"")
  onClose: () => void;
  onShared?: () => void;
}

interface UserHit {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface CourseHit {
  id: string;
  title: string | null;
  course_code: string | null;
}

type Mode = 'user' | 'course';

export function ShareVideoDialog({ open, resourceType, resourceId, resourceCategory, resourceLabel, onClose, onShared }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('user');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserHit[]>([]);
  const [courses, setCourses] = useState<CourseHit[]>([]);
  const [picked, setPicked] = useState<{ type: Mode; id: string; label: string } | null>(null);
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery(''); setPicked(null); setNote(''); setUsers([]); setCourses([]);
    }
  }, [open]);

  // Load all courses up-front (usually a small number) so the course
  // tab is instant. Users we search on-demand because tenant rosters
  // can be big.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, title, course_code')
        .order('title', { ascending: true })
        .limit(50);
      if (!cancelled) setCourses((data as CourseHit[]) || []);
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'user') { setUsers([]); return; }
    const term = query.trim();
    if (term.length < 2) { setUsers([]); return; }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(async () => {
      // gw_profiles is the app's profile table; RLS scopes to tenant.
      const { data } = await supabase
        .from('gw_profiles')
        .select('id, display_name, email')
        .or(`display_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(20);
      if (!cancelled) { setUsers((data as UserHit[]) || []); setSearching(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [open, mode, query]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.course_code || '').toLowerCase().includes(q)
    );
  }, [courses, query]);

  const submit = async () => {
    if (!picked) return;
    setSubmitting(true);
    try {
      const { error } = await shareResource({
        resourceType,
        resourceId,
        resourceCategory,
        recipientType: picked.type,
        recipientId: picked.id,
        note: note.trim() || undefined,
      });
      if (error) {
        // Unique violation = already shared; treat as success.
        const msg = (error as { code?: string; message?: string }).code === '23505'
          ? 'Already shared with them'
          : (error as Error).message;
        toast({ title: 'Share failed', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Shared', description: `Sent to ${picked.label}` });
      onShared?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-4 h-4" /> Share &ldquo;{resourceLabel}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient type toggle */}
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
            {([
              { key: 'user' as const, label: 'User', icon: User },
              { key: 'course' as const, label: 'Course', icon: GraduationCap },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setMode(key); setPicked(null); setQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                  mode === key ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {picked ? (
            <div className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-2 text-sm min-w-0">
                {picked.type === 'user' ? <User className="w-4 h-4 shrink-0" /> : <GraduationCap className="w-4 h-4 shrink-0" />}
                <span className="truncate">{picked.label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPicked(null)} className="text-xs">
                <X className="w-3.5 h-3.5" /> Change
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'user' ? 'Search by name or email…' : 'Filter courses…'}
                  className="pl-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto -mx-1">
                {mode === 'user' ? (
                  <>
                    {searching && (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                      </div>
                    )}
                    {!searching && query.trim().length >= 2 && users.length === 0 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground">No people found.</div>
                    )}
                    {!searching && query.trim().length < 2 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground">Type at least 2 characters.</div>
                    )}
                    <ul className="space-y-0.5">
                      {users.map((u) => (
                        <li key={u.id}>
                          <button
                            className="w-full text-left px-2 py-2 rounded-md hover:bg-muted flex items-center gap-2"
                            onClick={() => setPicked({ type: 'user', id: u.id, label: u.display_name || u.email || 'Unnamed user' })}
                          >
                            <User className="w-4 h-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm truncate">{u.display_name || 'Unnamed'}</div>
                              {u.email && <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <ul className="space-y-0.5">
                    {filteredCourses.length === 0 && (
                      <li className="px-3 py-4 text-xs text-muted-foreground">No courses.</li>
                    )}
                    {filteredCourses.map((c) => (
                      <li key={c.id}>
                        <button
                          className="w-full text-left px-2 py-2 rounded-md hover:bg-muted flex items-center gap-2"
                          onClick={() => setPicked({
                            type: 'course', id: c.id,
                            label: `${c.course_code ? c.course_code + ' — ' : ''}${c.title || 'Untitled'}`,
                          })}
                        >
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          <div className="text-sm truncate">
                            {c.course_code && <span className="font-mono text-[11px] mr-2">{c.course_code}</span>}
                            {c.title || 'Untitled'}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {picked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Add a note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Watch by Friday…"
                className="mt-1 min-h-[60px] text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={submitting || !picked}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
