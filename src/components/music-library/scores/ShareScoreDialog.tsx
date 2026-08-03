import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Search, Loader2, Users as UsersIcon, GraduationCap, Check as CheckIcon,
  Music2 as VoicePartIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { VOICE_PARTS, type ScoreRow } from './types';

// ── Share dialog ────────────────────────────────────────────────────────
//
// Combines three sharing lanes in one place:
//   1. "Everyone in this workspace" — the tenant-wide shared_with_members
//      flag (kept for the ~thousand-row broadcast case).
//   2. "Specific people" — shared_with_users uuid[] on the score. Members
//      whose auth.uid() lands in the array see the row in Scores.
//   3. "Classes" — shared_with_courses uuid[] on the score. Anyone
//      currently enrolled (gw_course_enrollments) in a listed course
//      sees the row. Removing a student from the class immediately
//      revokes access on the next Scores refresh.
//
// One Save writes all the arrays back in a single update. On failure
// (RLS silent no-op, network, etc.) we toast and leave the dialog open
// so the librarian can retry rather than lose their selections.
//
// Multi-score mode (scores.length > 1, from the bulk-select bar): the save
// is ADDITIVE via the bulk_share_scores RPC — it unions the picked lanes
// into each score, so "share these 20 with class X" never clobbers the
// per-score user shares somebody granted earlier. The everyone switch
// defaults to "leave as-is" and can only turn ON in bulk.
export function ShareScoreDialog({
  scores, onOpenChange, onSaved,
}: {
  scores: ScoreRow[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = scores.length > 0;
  const multi = scores.length > 1;
  const score = scores.length === 1 ? scores[0] : null;
  const [everyone, setEveryone] = useState(false);
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [coursesSel, setCoursesSel] = useState<Set<string>>(new Set());
  const [voiceParts, setVoiceParts] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');

  // Reset draft state whenever the dialog opens for a different selection.
  // Single score: prefill with its current sharing (replace-on-save).
  // Multi: start empty — the save only ADDS what's picked here.
  useEffect(() => {
    if (scores.length === 0) return;
    const single = scores.length === 1 ? scores[0] : null;
    setEveryone(!!single?.shared_with_members);
    setUsers(new Set(single?.shared_with_users ?? []));
    setCoursesSel(new Set(single?.shared_with_courses ?? []));
    setVoiceParts(new Set(single?.shared_with_voice_parts ?? []));
    setPeopleFilter('');
    // The dialog opens/closes by identity of the selection, not deep
    // content — joining ids keeps the effect stable across re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.map((s) => s.id).join(',')]);

  // Tenant members — used for the individual-share picker. Fetched only
  // when the dialog is open to avoid pulling every profile at page load.
  const { data: people = [], isLoading: peopleLoading } = useQuery<Array<{ user_id: string; full_name: string | null; email: string | null; role: string | null }>>({
    queryKey: ['share-dialog-people'],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role')
        .eq('disabled', false)
        .order('full_name', { ascending: true, nullsFirst: false });
      return (data ?? []) as any[];
    },
  });

  // Tenant classes — pulled from gw_courses; only active ones surface
  // because sharing to a dormant/archived class would be surprising.
  const { data: classes = [], isLoading: classesLoading } = useQuery<Array<{ id: string; title: string; course_code: string | null }>>({
    queryKey: ['share-dialog-courses'],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, title, course_code, is_active')
        .eq('is_active', true)
        .order('title');
      return ((data ?? []) as any[]).map((c) => ({ id: c.id, title: c.title, course_code: c.course_code }));
    },
  });

  const filteredPeople = useMemo(() => {
    const q = peopleFilter.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q),
    );
  }, [people, peopleFilter]);

  const toggleUser = (uid: string) => {
    setUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };
  const toggleCourse = (cid: string) => {
    setCoursesSel((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  };
  const toggleVoicePart = (vp: string) => {
    setVoiceParts((prev) => {
      const next = new Set(prev);
      if (next.has(vp)) next.delete(vp); else next.add(vp);
      return next;
    });
  };

  const save = async () => {
    if (scores.length === 0) return;
    setSaving(true);
    if (multi) {
      // Additive bulk write — atomic, RLS-enforced inside the INVOKER RPC.
      const { data: count, error } = await (supabase as any).rpc('bulk_share_scores', {
        p_score_ids: scores.map((s) => s.id),
        p_add_users: Array.from(users),
        p_add_courses: Array.from(coursesSel),
        p_add_voice_parts: Array.from(voiceParts),
        p_set_everyone: everyone ? true : null,
      });
      setSaving(false);
      if (error || typeof count !== 'number' || count < scores.length) {
        toast.error(
          error || typeof count !== 'number'
            ? "Sharing couldn't be updated — your role may not have permission."
            : `Only ${count} of ${scores.length} scores updated — your role may not have permission for the rest.`,
        );
        return;
      }
      toast.success(`Sharing added to ${count} scores.`);
      onSaved();
      return;
    }
    // Single score — replace-on-save, exactly what the dialog shows.
    // `.select()` after update so an RLS-silenced no-op surfaces as a real
    // failure (row_count === 0) instead of a lying success toast.
    const { data, error } = await (supabase as any)
      .from('gw_sheet_music')
      .update({
        shared_with_members: everyone,
        shared_with_users: Array.from(users),
        shared_with_courses: Array.from(coursesSel),
        shared_with_voice_parts: Array.from(voiceParts),
      })
      .eq('id', score!.id)
      .select('id');
    setSaving(false);
    if (error || !data?.length) {
      toast.error("Sharing couldn't be updated — your role may not have permission.");
      return;
    }
    const summary = everyone
      ? 'Shared with everyone in this workspace'
      : (users.size + coursesSel.size + voiceParts.size === 0
        ? 'Not shared — visible only to you and other admins'
        : `Shared with ${users.size} person${users.size === 1 ? '' : 's'} · ${coursesSel.size} class${coursesSel.size === 1 ? '' : 'es'} · ${voiceParts.size} section${voiceParts.size === 1 ? '' : 's'}`);
    toast.success(summary);
    onSaved();
  };

  if (scores.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">
            {multi ? `Add sharing to ${scores.length} scores` : `Share “${score!.title}”`}
          </DialogTitle>
          <DialogDescription>
            {multi
              ? 'Everything you pick below is ADDED to each selected score — existing shares are kept.'
              : 'Choose who can see this score in their Scores tab. Sharing is additive — any of the lanes below is enough for a member to see the row.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto flex-1 -mx-1 px-1">
          {/* Lane 1 — everyone */}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Everyone in this workspace</div>
              <div className="text-xs text-muted-foreground">
                {multi
                  ? 'Off = leave each score’s "everyone" setting as it is. On = turn it on for all selected scores.'
                  : 'Every member of your tenant can see the score. Turn this off to share only with the specific people and classes below.'}
              </div>
            </div>
            <Switch checked={everyone} onCheckedChange={setEveryone} />
          </div>

          {/* Lane 2 — specific people */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Specific people
                {users.size > 0 && <Badge variant="secondary" className="ml-1 text-xs">{users.size}</Badge>}
              </Label>
              {users.size > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setUsers(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={peopleFilter}
                onChange={(e) => setPeopleFilter(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-7 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-40 rounded-lg border">
              <div className="p-1">
                {peopleLoading ? (
                  <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading people…
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No people match.</div>
                ) : filteredPeople.map((p) => {
                  const selected = users.has(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => toggleUser(p.user_id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-left"
                    >
                      <Checkbox checked={selected} onCheckedChange={() => toggleUser(p.user_id)} className="pointer-events-none" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{p.full_name || p.email || '(no name)'}</div>
                        {p.full_name && p.email && (
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Lane 3 — voice parts / sections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <VoicePartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Voice parts
                {voiceParts.size > 0 && <Badge variant="secondary" className="ml-1 text-xs">{voiceParts.size}</Badge>}
              </Label>
              {voiceParts.size > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setVoiceParts(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Every member whose profile lists a selected section sees this score.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_PARTS.map((vp) => {
                const selected = voiceParts.has(vp.value);
                return (
                  <button
                    key={vp.value}
                    type="button"
                    onClick={() => toggleVoicePart(vp.value)}
                    aria-pressed={selected}
                    className={
                      selected
                        ? 'inline-flex items-center rounded-full border border-primary bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium transition-colors'
                        : 'inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
                    }
                  >
                    {vp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lane 4 — classes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                Classes
                {coursesSel.size > 0 && <Badge variant="secondary" className="ml-1 text-xs">{coursesSel.size}</Badge>}
              </Label>
              {coursesSel.size > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCoursesSel(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Every currently-enrolled student in a selected class sees this score. Access follows the class roster — removing a student from the class also removes their access here.
            </p>
            <ScrollArea className="h-32 rounded-lg border">
              <div className="p-1">
                {classesLoading ? (
                  <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading classes…
                  </div>
                ) : classes.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No active classes in this workspace.</div>
                ) : classes.map((c) => {
                  const selected = coursesSel.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-left"
                    >
                      <Checkbox checked={selected} onCheckedChange={() => toggleCourse(c.id)} className="pointer-events-none" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{c.title}</div>
                        {c.course_code && (
                          <div className="text-xs text-muted-foreground truncate">{c.course_code}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckIcon className="w-4 h-4 mr-1.5" />}
            {multi ? 'Add sharing' : 'Save sharing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
