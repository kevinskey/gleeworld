// Director-only: assign this piece by voice part + see who has practiced.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as api from './api';
import type { ListenRollupRow, PartTrackAssignment, TenantSinger } from './api';
import type { PartTrackPart } from './types';
import { normalizeVoicePart, voicePartsMatch } from './voiceParts';

function fmtMinutes(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.round(seconds / 60);
  return m < 1 ? '<1 min' : `${m} min`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

interface Props {
  scoreId: string;
  parts: PartTrackPart[];
}

export function AssignmentsPanel({ scoreId, parts }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<PartTrackAssignment[]>([]);
  const [rollup, setRollup] = useState<ListenRollupRow[]>([]);
  const [singers, setSingers] = useState<TenantSinger[]>([]);
  const [newPart, setNewPart] = useState<string>('all');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  const partOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const p of parts) {
      const code = normalizeVoicePart(p.role);
      if (code && code !== 'PIANO' && code !== 'OTHER') codes.add(code);
    }
    return [...codes].sort();
  }, [parts]);

  const refresh = useCallback(async () => {
    const [a, r, s] = await Promise.all([
      api.listAssignments(scoreId),
      api.getListenRollup(scoreId),
      api.getTenantSingers(),
    ]);
    setAssignments(a);
    setRollup(r);
    setSingers(s);
  }, [scoreId]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const addAssignment = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api.createAssignment(scoreId, newPart === 'all' ? null : newPart, dueDate || null, user.id);
      await refresh();
    } catch (e) {
      toast({
        title: 'Could not create the assignment',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      await api.deleteAssignment(id);
      await refresh();
    } catch {
      toast({ title: 'Could not remove the assignment', variant: 'destructive' });
    }
  };

  const assignedSingers = useMemo(() => {
    if (assignments.length === 0) return [];
    return singers.filter((s) =>
      assignments.some((a) => a.voice_part === null || voicePartsMatch(a.voice_part, s.voice_part)));
  }, [assignments, singers]);

  const rollupByUser = useMemo(
    () => new Map(rollup.map((r) => [r.user_id, r])),
    [rollup],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Assign this piece</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Part</Label>
            <Select value={newPart} onValueChange={setNewPart}>
              <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All parts</SelectItem>
                {partOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pt-due" className="text-xs">Due (optional)</Label>
            <Input
              id="pt-due" type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <Button size="sm" disabled={busy} onClick={() => void addAssignment()}>Assign</Button>
        </div>
        {assignments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((a) => (
              <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                {a.voice_part ?? 'All parts'}
                {a.due_date && ` · due ${a.due_date}`}
                <button
                  type="button"
                  aria-label="Remove assignment"
                  onClick={() => void removeAssignment(a.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Practice activity</p>
        {assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Assign the piece to see who has practiced.</p>
        ) : assignedSingers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No students with a matching voice part yet — check profile voice parts in the roster.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Student</TableHead>
                <TableHead className="text-xs">Part</TableHead>
                <TableHead className="text-xs">Practiced</TableHead>
                <TableHead className="text-xs">Last</TableHead>
                <TableHead className="text-xs">Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedSingers.map((s) => {
                const r = rollupByUser.get(s.user_id);
                return (
                  <TableRow key={s.user_id}>
                    <TableCell className="text-sm">{s.full_name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{normalizeVoicePart(s.voice_part) ?? '—'}</TableCell>
                    <TableCell className="text-sm tabular-nums">{fmtMinutes(r?.total_seconds ?? 0)}</TableCell>
                    <TableCell className="text-xs">{fmtRelative(r?.last_at ?? null)}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {r?.avg_tempo_pct ? `${r.avg_tempo_pct}%` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
