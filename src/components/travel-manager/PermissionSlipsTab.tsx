import { useCallback, useEffect, useState } from 'react';
import { usePermissionSlips, PermissionSlip, PermissionSlipStatus } from '@/hooks/usePermissionSlips';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RosterStudent {
  user_id: string;
  full_name: string;
  email: string;
}

type FilterValue =
  | 'all'
  | 'pending'
  | 'sent'
  | 'signed'
  | 'missing-guardian'
  | 'expired'
  | 'revoked';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SlipBadge({ status, sent_at, signed_at }: Pick<PermissionSlip, 'status' | 'sent_at' | 'signed_at'>) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Mail className="h-3 w-3" />
          Not sent
        </Badge>
      );
    case 'sent':
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          Sent {relativeTime(sent_at)}
        </Badge>
      );
    case 'signed':
      return (
        <Badge variant="success" className="text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Signed {relativeTime(signed_at)}
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    case 'revoked':
      return (
        <Badge variant="outline" className="text-xs gap-1 line-through text-muted-foreground">
          <Ban className="h-3 w-3" />
          Revoked
        </Badge>
      );
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PermissionSlipsTabProps {
  /** If provided, use this tourId directly. Otherwise the tab resolves the active tour. */
  tourId?: string | null;
}

export function PermissionSlipsTab({ tourId: propTourId }: PermissionSlipsTabProps) {
  const [resolvedTourId, setResolvedTourId] = useState<string | null>(propTourId ?? null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [guardianCounts, setGuardianCounts] = useState<Map<string, number>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const { slips, byStudent, send, revoke, viewSignedUrl, refresh } =
    usePermissionSlips(resolvedTourId);

  // ── Bootstrap: resolve active tour + fetch roster + guardian counts ──────

  const loadBootstrap = useCallback(async () => {
    setLoadingData(true);
    try {
      let tourId = propTourId ?? null;

      if (!tourId) {
        const { data: activeTour } = await supabase
          .from('gw_tours')
          .select('id')
          .in('status', ['planning', 'confirmed', 'active'])
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        tourId = activeTour?.id ?? null;
        setResolvedTourId(tourId);
      }

      if (!tourId) {
        setStudents([]);
        setGuardianCounts(new Map());
        return;
      }

      // Fetch roster members for this tour
      const { data: rosterRows } = await supabase
        .from('gw_tour_roster')
        .select('user_id')
        .eq('tour_id', tourId)
        // Some schemas don't have tour_id on gw_tour_roster; fall back gracefully
        .throwOnError()
        .then(r => r)
        .catch(() => ({ data: null }));

      // Fall back: roster without tour filter (matches TourRosterSection behaviour)
      const userIds: string[] = rosterRows
        ? rosterRows.map((r: { user_id: string }) => r.user_id)
        : [];

      if (userIds.length === 0) {
        // Try without tour_id filter (table may not have that column yet)
        const { data: allRoster } = await supabase
          .from('gw_tour_roster')
          .select('user_id')
          .limit(200);
        const fallbackIds = (allRoster ?? []).map((r: { user_id: string }) => r.user_id);

        if (fallbackIds.length > 0) {
          await hydrateStudents(fallbackIds);
        } else {
          setStudents([]);
          setGuardianCounts(new Map());
        }
        return;
      }

      await hydrateStudents(userIds);
    } catch (err) {
      console.error('[PermissionSlipsTab] bootstrap error', err);
    } finally {
      setLoadingData(false);
    }
  }, [propTourId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hydrateStudents(userIds: string[]) {
    const [{ data: profiles }, { data: guardianRows }] = await Promise.all([
      supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .in('user_id', userIds)
        .order('full_name'),
      supabase
        .from('gw_guardians')
        .select('student_user_id')
        .in('student_user_id', userIds),
    ]);

    setStudents(
      (profiles ?? []).map((p: { user_id: string; full_name: string; email: string }) => ({
        user_id: p.user_id,
        full_name: p.full_name ?? p.email,
        email: p.email,
      })),
    );

    const counts = new Map<string, number>();
    for (const row of guardianRows ?? []) {
      counts.set(
        (row as { student_user_id: string }).student_user_id,
        (counts.get((row as { student_user_id: string }).student_user_id) ?? 0) + 1,
      );
    }
    setGuardianCounts(counts);
  }

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  // ── Derived data ──────────────────────────────────────────────────────────

  interface Row {
    student: RosterStudent;
    slip: PermissionSlip | null;
    guardianCount: number;
  }

  const rows: Row[] = students.map(student => ({
    student,
    slip: byStudent.get(student.user_id) ?? null,
    guardianCount: guardianCounts.get(student.user_id) ?? 0,
  }));

  // Students with pending slip AND no guardian
  const missingGuardianStudents = rows.filter(
    r => r.guardianCount === 0 && (r.slip === null || r.slip.status === 'pending'),
  );

  const filtered = rows.filter(r => {
    switch (filter) {
      case 'all':
        return true;
      case 'pending':
        return r.slip === null || r.slip.status === 'pending';
      case 'sent':
        return r.slip?.status === 'sent';
      case 'signed':
        return r.slip?.status === 'signed';
      case 'missing-guardian':
        return r.guardianCount === 0 && (r.slip === null || r.slip.status === 'pending');
      case 'expired':
        return r.slip?.status === 'expired';
      case 'revoked':
        return r.slip?.status === 'revoked';
      default:
        return true;
    }
  });

  // ── Bulk actions ─────────────────────────────────────────────────────────

  async function bulkSendPending() {
    const targets = rows.filter(
      r => r.slip && r.slip.status === 'pending' && r.guardianCount > 0,
    );
    if (targets.length === 0) {
      toast.info('No sendable pending slips (check guardian records).');
      return;
    }
    setBulkProgress({ done: 0, total: targets.length });
    let done = 0;
    for (const { slip } of targets) {
      if (!slip) continue;
      try {
        await send(slip.id);
      } catch (e) {
        console.error('[PermissionSlipsTab] bulkSendPending error', e);
      }
      done += 1;
      setBulkProgress({ done, total: targets.length });
    }
    setBulkProgress(null);
    toast.success(`Sent ${done} permission slip${done !== 1 ? 's' : ''}.`);
    await refresh();
  }

  async function bulkRemindSent() {
    const targets = rows.filter(r => r.slip?.status === 'sent');
    if (targets.length === 0) {
      toast.info('No sent-but-unsigned slips to remind.');
      return;
    }
    setBulkProgress({ done: 0, total: targets.length });
    let done = 0;
    for (const { slip } of targets) {
      if (!slip) continue;
      try {
        await send(slip.id);
      } catch (e) {
        console.error('[PermissionSlipsTab] bulkRemindSent error', e);
      }
      done += 1;
      setBulkProgress({ done, total: targets.length });
    }
    setBulkProgress(null);
    toast.success(`Reminder sent to ${done} guardian${done !== 1 ? 's' : ''}.`);
    await refresh();
  }

  async function downloadSignedPngs() {
    const signed = rows.filter(r => r.slip?.status === 'signed');
    if (signed.length === 0) {
      toast.info('No signed slips to download.');
      return;
    }
    setBulkProgress({ done: 0, total: signed.length });
    let done = 0;
    for (const { slip } of signed) {
      if (!slip) continue;
      try {
        const url = await viewSignedUrl(slip.id);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        }
      } catch (e) {
        console.error('[PermissionSlipsTab] downloadSignedPngs error', e);
      }
      done += 1;
      setBulkProgress({ done, total: signed.length });
    }
    setBulkProgress(null);
    toast.success(`Opened ${done} signed document${done !== 1 ? 's' : ''}.`);
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading permission slips…</span>
      </div>
    );
  }

  if (!resolvedTourId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No active tour</AlertTitle>
        <AlertDescription>
          Create or activate a tour before managing permission slips.
        </AlertDescription>
      </Alert>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const pendingCount = rows.filter(r => r.slip === null || r.slip.status === 'pending').length;
  const sentCount = rows.filter(r => r.slip?.status === 'sent').length;
  const signedCount = rows.filter(r => r.slip?.status === 'signed').length;

  return (
    <div className="space-y-4">
      {/* Missing guardian callout */}
      {missingGuardianStudents.length > 0 && (
        <Alert variant="destructive">
          <UserX className="h-4 w-4" />
          <AlertTitle>
            {missingGuardianStudents.length} student
            {missingGuardianStudents.length !== 1 ? 's' : ''} missing guardian contact
          </AlertTitle>
          <AlertDescription>
            <p className="mb-1 text-xs">
              Permission slips cannot be sent until a guardian email is on file:
            </p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {missingGuardianStudents.map(r => (
                <li key={r.student.user_id}>{r.student.full_name || r.student.email}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats strip */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Pending', value: pendingCount, icon: <Mail className="h-3.5 w-3.5 text-amber-600" /> },
          { label: 'Sent', value: sentCount, icon: <Clock className="h-3.5 w-3.5 text-blue-500" /> },
          { label: 'Signed', value: signedCount, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> },
          { label: 'Total', value: rows.length, icon: null },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5"
          >
            {icon}
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-bold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter */}
        <Select value={filter} onValueChange={v => setFilter(v as FilterValue)}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="missing-guardian">Missing guardian</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Bulk progress indicator */}
        {bulkProgress && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {bulkProgress.done}/{bulkProgress.total}
          </span>
        )}

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!bulkProgress || pendingCount === 0}
          onClick={bulkSendPending}
        >
          <Send className="h-3.5 w-3.5" />
          Send all pending
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!bulkProgress || sentCount === 0}
          onClick={bulkRemindSent}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Remind all sent
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!bulkProgress || signedCount === 0}
          onClick={downloadSignedPngs}
        >
          <Download className="h-3.5 w-3.5" />
          Download signed
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-medium">Student</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium hidden sm:table-cell">Sent</TableHead>
              <TableHead className="text-xs font-medium hidden sm:table-cell">Signed</TableHead>
              <TableHead className="text-xs font-medium hidden md:table-cell">Guardians</TableHead>
              <TableHead className="text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                  {rows.length === 0
                    ? 'No roster members found for this tour.'
                    : 'No permission slips match the selected filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(({ student, slip, guardianCount }) => (
                <TableRow key={student.user_id}>
                  {/* Student */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">
                        {student.full_name || student.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {student.email}
                      </p>
                    </div>
                  </TableCell>

                  {/* Status badge */}
                  <TableCell>
                    {slip ? (
                      <SlipBadge
                        status={slip.status}
                        sent_at={slip.sent_at}
                        signed_at={slip.signed_at}
                      />
                    ) : guardianCount === 0 ? (
                      <Badge variant="warning" className="text-xs gap-1">
                        <UserX className="h-3 w-3" />
                        Missing guardian
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="h-3 w-3" />
                        Not sent
                      </Badge>
                    )}
                  </TableCell>

                  {/* Sent at */}
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {slip?.sent_at ? relativeTime(slip.sent_at) : '—'}
                  </TableCell>

                  {/* Signed at */}
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {slip?.signed_at ? relativeTime(slip.signed_at) : '—'}
                  </TableCell>

                  {/* Guardian count */}
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={
                        guardianCount === 0
                          ? 'text-xs text-destructive font-medium'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {guardianCount === 0 ? 'None' : guardianCount}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Send / Resend */}
                      {slip?.status === 'pending' && guardianCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={async () => {
                            await send(slip.id);
                            toast.success('Slip sent.');
                          }}
                        >
                          <Send className="h-3 w-3" />
                          Send
                        </Button>
                      )}
                      {(slip?.status === 'sent' || slip?.status === 'expired') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={async () => {
                            await send(slip.id);
                            toast.success('Reminder sent.');
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Resend
                        </Button>
                      )}

                      {/* View signed */}
                      {slip?.status === 'signed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={async () => {
                            const url = await viewSignedUrl(slip.id);
                            if (url) {
                              window.open(url, '_blank', 'noopener,noreferrer');
                            } else {
                              toast.error('Signed document not available.');
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          View
                        </Button>
                      )}

                      {/* Revoke */}
                      {(slip?.status === 'sent' || slip?.status === 'signed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={async () => {
                            await revoke(slip.id);
                            toast.success('Slip revoked.');
                          }}
                        >
                          <Ban className="h-3 w-3" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
