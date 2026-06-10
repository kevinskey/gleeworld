import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Star, StarOff, Plus, MessageSquarePlus, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useUsers, type User } from '@/hooks/useUsers';
import {
  CONTACT_CHANNELS,
  CONTACT_CHANNEL_LABEL,
  VOICE_PARTS,
  VOICE_PART_LABEL,
  type ContactChannel,
  type ContactLogEntry,
  type Ensemble,
  type EnsembleDirector,
  type EnsembleMember,
  type EnsembleMemberStatus,
  type SectionTarget,
  type VoicePart,
} from '@/types/programHealth';
import { EnsembleHealthTab } from './EnsembleHealthTab';

interface Props {
  ensembleId: string | null;
  onClose: () => void;
}

export function EnsembleDrawer({ ensembleId, onClose }: Props) {
  const open = ensembleId !== null;

  const { data: ensemble } = useQuery({
    queryKey: ['ensemble', ensembleId],
    enabled: open,
    queryFn: async (): Promise<Ensemble | null> => {
      if (!ensembleId) return null;
      const { data, error } = await supabase
        .from('gw_ensembles')
        .select('*')
        .eq('id', ensembleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ensemble?.name ?? 'Ensemble'}</SheetTitle>
          {ensemble?.description && (
            <SheetDescription>{ensemble.description}</SheetDescription>
          )}
        </SheetHeader>

        {ensembleId && (
          <Tabs defaultValue="health" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="directors">Directors</TabsTrigger>
              <TabsTrigger value="targets">Targets</TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="pt-4">
              <EnsembleHealthTab ensembleId={ensembleId} />
            </TabsContent>
            <TabsContent value="members" className="pt-4">
              <MembersTab ensembleId={ensembleId} />
            </TabsContent>
            <TabsContent value="directors" className="pt-4">
              <DirectorsTab ensembleId={ensembleId} />
            </TabsContent>
            <TabsContent value="targets" className="pt-4">
              <TargetsTab ensembleId={ensembleId} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────── Members ─────────────────────── */

function MembersTab({ ensembleId }: { ensembleId: string }) {
  const queryClient = useQueryClient();
  const { users } = useUsers();
  const [pickProfileId, setPickProfileId] = useState<string>('');
  const [importOpen, setImportOpen] = useState(false);
  const [contactProfileId, setContactProfileId] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['ensemble_members', ensembleId],
    queryFn: async (): Promise<EnsembleMember[]> => {
      const { data, error } = await supabase
        .from('gw_ensemble_members')
        .select('*')
        .eq('ensemble_id', ensembleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const usersById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const inEnsemble = useMemo(
    () => new Set(members.map((m) => m.profile_id)),
    [members]
  );
  const availableUsers = useMemo(
    () => users.filter((u) => !inEnsemble.has(u.id)),
    [users, inEnsemble]
  );

  const add = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('gw_ensemble_members').insert({
        ensemble_id: ensembleId,
        profile_id: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_members', ensembleId] });
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      setPickProfileId('');
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EnsembleMemberStatus }) => {
      const { error } = await supabase
        .from('gw_ensemble_members')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_members', ensembleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_ensemble_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_members', ensembleId] });
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Add member</Label>
          <Select value={pickProfileId} onValueChange={setPickProfileId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a profile…" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.email ?? u.id}
                  {u.voice_part && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {VOICE_PART_LABEL[u.voice_part as VoicePart] ?? u.voice_part}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!pickProfileId || add.isPending}
          onClick={() => add.mutate(pickProfileId)}
          title="Add selected member"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setImportOpen(true)}
          title="Import every enrolled student from a course"
        >
          <Download className="h-4 w-4 mr-1" />
          Import from course
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No members yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Voice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const u = usersById.get(m.profile_id);
              return (
                <TableRow key={m.id}>
                  <TableCell>{u?.full_name ?? u?.email ?? m.profile_id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u?.voice_part
                      ? VOICE_PART_LABEL[u.voice_part as VoicePart] ?? u.voice_part
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.status}
                      onValueChange={(v) =>
                        updateStatus.mutate({ id: m.id, status: v as EnsembleMemberStatus })
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="flex gap-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setContactProfileId(m.profile_id)}
                      title="Log contact"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(m.id)}
                      title="Remove from ensemble"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ImportFromCourseDialog
        ensembleId={ensembleId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <LogContactDialog
        ensembleId={ensembleId}
        profileId={contactProfileId}
        memberName={
          contactProfileId
            ? usersById.get(contactProfileId)?.full_name ??
              usersById.get(contactProfileId)?.email ??
              null
            : null
        }
        onClose={() => setContactProfileId(null)}
      />
    </div>
  );
}

/* ─────────────────────── Log contact dialog ─────────────────────── */

function LogContactDialog({
  ensembleId,
  profileId,
  memberName,
  onClose,
}: {
  ensembleId: string;
  profileId: string | null;
  memberName: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const open = profileId !== null;
  const [channel, setChannel] = useState<ContactChannel>('call');
  const [note, setNote] = useState('');

  const { data: history = [] } = useQuery({
    queryKey: ['contact_log', profileId],
    enabled: open,
    queryFn: async (): Promise<ContactLogEntry[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('gw_contact_log')
        .select('*')
        .eq('profile_id', profileId)
        .order('contacted_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ContactLogEntry[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('No member selected.');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Look up the caller's profile id so recorded_by gets a profile, not auth uid.
      let recordedBy: string | null = null;
      if (user) {
        const { data: p } = await supabase
          .from('gw_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        recordedBy = p?.id ?? null;
      }
      const { error } = await supabase.from('gw_contact_log').insert({
        profile_id: profileId,
        ensemble_id: ensembleId,
        recorded_by: recordedBy,
        channel,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_log', profileId] });
      // last_contacted_at change can move staleness flags; refresh dashboard too.
      queryClient.invalidateQueries({ queryKey: ['health_snapshots', ensembleId] });
      setNote('');
      setChannel('call');
      toast.success('Contact logged');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log contact{memberName ? ` — ${memberName}` : ''}</DialogTitle>
          <DialogDescription>
            Updates last-contacted-at and feeds the staleness flag on the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as ContactChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CONTACT_CHANNEL_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you talk about?"
              rows={3}
            />
          </div>

          {history.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Recent contacts</Label>
              <ul className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">
                      {new Date(h.contacted_at).toLocaleDateString()}
                    </span>{' '}
                    · {CONTACT_CHANNEL_LABEL[h.channel] ?? h.channel}
                    {h.note ? ` — ${h.note}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Bulk import dialog ─────────────────────── */

interface CourseRow {
  id: string;
  title: string | null;
  course_code: string | null;
  is_active: boolean | null;
}

function ImportFromCourseDialog({
  ensembleId,
  open,
  onClose,
}: {
  ensembleId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState<string>('');

  const { data: courses = [] } = useQuery({
    queryKey: ['gw_courses_for_import'],
    enabled: open,
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, title, course_code, is_active')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  const importStudents = useMutation({
    mutationFn: async () => {
      if (!courseId) throw new Error('Pick a course.');
      // 1. Pull enrolled students from the course.
      const { data: enrollments, error: eErr } = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('role', 'student')
        .eq('enrollment_status', 'enrolled');
      if (eErr) throw eErr;
      const userIds = (enrollments ?? [])
        .map((r) => (r as { user_id: string | null }).user_id)
        .filter((u): u is string => !!u);
      if (userIds.length === 0) {
        return { inserted: 0, skipped: 0, totalEnrolled: 0 };
      }
      // 2. Map auth user ids → gw_profiles.id.
      const { data: profiles, error: pErr } = await supabase
        .from('gw_profiles')
        .select('id, user_id')
        .in('user_id', userIds);
      if (pErr) throw pErr;
      const profileIds = (profiles ?? []).map(
        (p) => (p as { id: string }).id
      );
      if (profileIds.length === 0) {
        return { inserted: 0, skipped: 0, totalEnrolled: userIds.length };
      }
      // 3. Diff against existing ensemble members so we can report inserted vs skipped.
      const { data: existing, error: mErr } = await supabase
        .from('gw_ensemble_members')
        .select('profile_id')
        .eq('ensemble_id', ensembleId)
        .in('profile_id', profileIds);
      if (mErr) throw mErr;
      const existingSet = new Set(
        (existing ?? []).map((m) => (m as { profile_id: string }).profile_id)
      );
      const toInsert = profileIds.filter((p) => !existingSet.has(p));
      if (toInsert.length === 0) {
        return {
          inserted: 0,
          skipped: profileIds.length,
          totalEnrolled: userIds.length,
        };
      }
      // 4. Bulk insert. Upsert with ignoreDuplicates handles any race.
      const { error: iErr } = await supabase.from('gw_ensemble_members').upsert(
        toInsert.map((profile_id) => ({
          ensemble_id: ensembleId,
          profile_id,
          status: 'active' as const,
        })),
        { onConflict: 'ensemble_id,profile_id', ignoreDuplicates: true }
      );
      if (iErr) throw iErr;
      return {
        inserted: toInsert.length,
        skipped: existingSet.size,
        totalEnrolled: userIds.length,
      };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_members', ensembleId] });
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      const lostToProfileLookup =
        r.totalEnrolled - (r.inserted + r.skipped);
      const parts: string[] = [`Imported ${r.inserted}`];
      if (r.skipped) parts.push(`${r.skipped} already in ensemble`);
      if (lostToProfileLookup > 0)
        parts.push(`${lostToProfileLookup} had no profile`);
      toast.success(parts.join(' · '));
      setCourseId('');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import members from course</DialogTitle>
          <DialogDescription>
            Adds every enrolled student from the chosen course as an active ensemble
            member. Students already in the ensemble are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a course…" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.course_code ? `${c.course_code} — ` : ''}
                  {c.title ?? c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={importStudents.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => importStudents.mutate()}
            disabled={!courseId || importStudents.isPending}
          >
            {importStudents.isPending ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Directors ─────────────────────── */

function DirectorsTab({ ensembleId }: { ensembleId: string }) {
  const queryClient = useQueryClient();
  const { users } = useUsers();
  const [pickProfileId, setPickProfileId] = useState<string>('');

  const { data: directors = [] } = useQuery({
    queryKey: ['ensemble_directors', ensembleId],
    queryFn: async (): Promise<EnsembleDirector[]> => {
      const { data, error } = await supabase
        .from('gw_ensemble_directors')
        .select('*')
        .eq('ensemble_id', ensembleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const usersById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const inDirectors = useMemo(
    () => new Set(directors.map((d) => d.profile_id)),
    [directors]
  );
  const availableUsers = useMemo(
    () => users.filter((u) => !inDirectors.has(u.id)),
    [users, inDirectors]
  );

  const add = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('gw_ensemble_directors').insert({
        ensemble_id: ensembleId,
        profile_id: profileId,
        is_primary: directors.length === 0, // first director defaults to primary
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_directors', ensembleId] });
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      setPickProfileId('');
      toast.success('Director added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      // Clear any current primary first, then set this one.
      const { error: clearErr } = await supabase
        .from('gw_ensemble_directors')
        .update({ is_primary: false })
        .eq('ensemble_id', ensembleId);
      if (clearErr) throw clearErr;
      const { error } = await supabase
        .from('gw_ensemble_directors')
        .update({ is_primary: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_directors', ensembleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_ensemble_directors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensemble_directors', ensembleId] });
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      toast.success('Director removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Add director</Label>
          <Select value={pickProfileId} onValueChange={setPickProfileId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a profile…" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.email ?? u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!pickProfileId || add.isPending}
          onClick={() => add.mutate(pickProfileId)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {directors.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No directors yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {directors.map((d) => {
              const u = usersById.get(d.profile_id);
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    {u?.full_name ?? u?.email ?? d.profile_id}
                    {d.is_primary && (
                      <Badge variant="secondary" className="ml-2">
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => !d.is_primary && setPrimary.mutate(d.id)}
                      disabled={d.is_primary}
                      title={d.is_primary ? 'Already primary' : 'Mark primary'}
                    >
                      {d.is_primary ? (
                        <Star className="h-4 w-4 fill-current" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ─────────────────────── Targets ─────────────────────── */

function TargetsTab({ ensembleId }: { ensembleId: string }) {
  const queryClient = useQueryClient();
  const [voicePart, setVoicePart] = useState<VoicePart | ''>('');
  const [count, setCount] = useState('');

  const { data: targets = [] } = useQuery({
    queryKey: ['section_targets', ensembleId],
    queryFn: async (): Promise<SectionTarget[]> => {
      const { data, error } = await supabase
        .from('gw_section_targets')
        .select('*')
        .eq('ensemble_id', ensembleId)
        .order('voice_part');
      if (error) throw error;
      return data ?? [];
    },
  });

  const usedParts = useMemo(
    () => new Set(targets.map((t) => t.voice_part)),
    [targets]
  );

  const upsert = useMutation({
    mutationFn: async () => {
      const n = parseInt(count, 10);
      if (!voicePart || isNaN(n) || n < 0) {
        throw new Error('Pick a voice part and a non-negative number.');
      }
      const { error } = await supabase.from('gw_section_targets').upsert(
        {
          ensemble_id: ensembleId,
          voice_part: voicePart,
          target_count: n,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ensemble_id,voice_part' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section_targets', ensembleId] });
      setVoicePart('');
      setCount('');
      toast.success('Target saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCount = useMutation({
    mutationFn: async ({ id, n }: { id: string; n: number }) => {
      const { error } = await supabase
        .from('gw_section_targets')
        .update({ target_count: n, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section_targets', ensembleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_section_targets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section_targets', ensembleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Voice part</Label>
          <Select value={voicePart} onValueChange={(v) => setVoicePart(v as VoicePart)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a part…" />
            </SelectTrigger>
            <SelectContent>
              {VOICE_PARTS.filter((vp) => !usedParts.has(vp)).map((vp) => (
                <SelectItem key={vp} value={vp}>
                  {VOICE_PART_LABEL[vp]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-xs">Target</Label>
          <Input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="e.g. 8"
          />
        </div>
        <Button
          disabled={!voicePart || !count || upsert.isPending}
          onClick={() => upsert.mutate()}
        >
          Save
        </Button>
      </div>

      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No section targets yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voice part</TableHead>
              <TableHead className="w-32">Target</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  {VOICE_PART_LABEL[t.voice_part as VoicePart] ?? t.voice_part}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={t.target_count}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n !== t.target_count && n >= 0) {
                        updateCount.mutate({ id: t.id, n });
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
