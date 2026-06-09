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
import { Trash2, Star, StarOff, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUsers, type User } from '@/hooks/useUsers';
import {
  VOICE_PARTS,
  VOICE_PART_LABEL,
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
            <TabsList className="grid w-full grid-cols-4">
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
        >
          <Plus className="h-4 w-4" />
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
              <TableHead className="w-12" />
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
                  <TableCell>
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
    </div>
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
