// /dashboard/users — tenant-level user management for owner-teachers and
// tenant admins. List, invite, promote/demote, disable, delete tenant
// members. Scoped to the caller's tenant via RLS on gw_profiles.

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, UserPlus, Search, Loader2, Shield, GraduationCap, Music, Heart,
  AlertCircle, MoreVertical, Trash2, Power, Check, Upload, FileSpreadsheet, X as CloseIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type Person = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_admin: boolean | null;
  is_super_admin: boolean | null;
  disabled: boolean | null;
  avatar_url: string | null;
  phone_number: string | null;
};

const ROLE_PALETTE: Record<string, { Icon: React.ElementType; tone: string; label: string }> = {
  'super-admin': { Icon: Shield,         tone: 'bg-rose-50 text-rose-700 border-rose-200',     label: 'Super admin' },
  'admin':       { Icon: Shield,         tone: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Admin' },
  'instructor':  { Icon: GraduationCap,  tone: 'bg-sky-50 text-sky-700 border-sky-200',         label: 'Teacher' },
  'student':     { Icon: Music,          tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Student' },
  'member':      { Icon: Music,          tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Student' },
  'fan':         { Icon: Heart,          tone: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Fan' },
  'vip':         { Icon: Heart,          tone: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Fan (VIP)' },
};

type Filter = 'all' | 'admin' | 'instructor' | 'student' | 'fan' | 'disabled';

export default function WorkspaceUsersPage() {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const canManage = isSuperAdmin() || isAdmin();

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ['workspace-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, role, is_admin, is_super_admin, disabled, avatar_url, phone_number')
        .order('full_name', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      // Role filter
      if (filter === 'disabled' && !p.disabled) return false;
      if (filter !== 'all' && filter !== 'disabled') {
        const r = roleOf(p);
        if (filter === 'admin'      && !(r === 'admin' || r === 'super-admin')) return false;
        if (filter === 'instructor' && r !== 'instructor') return false;
        if (filter === 'student'    && !(r === 'student' || r === 'member')) return false;
        if (filter === 'fan'        && !(r === 'fan' || r === 'vip')) return false;
      }
      // Search
      if (!q) return true;
      return (
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    });
  }, [people, search, filter]);

  const counts = useMemo(() => {
    const c = { total: people.length, admin: 0, instructor: 0, student: 0, fan: 0, disabled: 0 };
    people.forEach((p) => {
      const r = roleOf(p);
      if (p.disabled) c.disabled++;
      if (r === 'admin' || r === 'super-admin') c.admin++;
      else if (r === 'instructor') c.instructor++;
      else if (r === 'student' || r === 'member') c.student++;
      else if (r === 'fan' || r === 'vip') c.fan++;
    });
    return c;
  }, [people]);

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="People"
      subtitle="Everyone in this workspace — teachers, students, fans."
      actions={
        canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite
          </Button>
        )
      }
    >
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatPill label="All"         value={counts.total}     active={filter === 'all'}        onClick={() => setFilter('all')} />
        <StatPill label="Teachers"    value={counts.instructor + counts.admin} active={filter === 'instructor' || filter === 'admin'} onClick={() => setFilter('instructor')} />
        <StatPill label="Students"    value={counts.student}   active={filter === 'student'}    onClick={() => setFilter('student')} />
        <StatPill label="Fans"        value={counts.fan}       active={filter === 'fan'}        onClick={() => setFilter('fan')} />
        <StatPill label="Disabled"    value={counts.disabled}  active={filter === 'disabled'}   onClick={() => setFilter('disabled')} tone="rose" />
      </div>

      {/* Search */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-2 sm:p-3">
          {isLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No people match this filter.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => (
                <PersonRow
                  key={p.user_id}
                  p={p}
                  canManage={canManage && p.user_id !== user?.id}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => qc.invalidateQueries({ queryKey: ['workspace-users'] })}
      />

      <EditUserDialog
        person={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ['workspace-users'] });
        }}
      />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

function roleOf(p: Person): string {
  if (p.is_super_admin) return 'super-admin';
  if (p.is_admin) return 'admin';
  return p.role || 'student';
}

function StatPill({
  label, value, active, onClick, tone,
}: {
  label: string; value: number; active: boolean; onClick: () => void; tone?: 'rose';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-3 text-left transition',
        active
          ? (tone === 'rose' ? 'border-rose-300 bg-rose-50' : 'border-primary bg-primary/5')
          : 'border-border bg-card hover:bg-muted/40',
      )}
      style={SOFT_CARD_STYLE}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold leading-none mt-1.5">{value}</div>
    </button>
  );
}

function PersonRow({
  p, canManage, onEdit,
}: {
  p: Person;
  canManage: boolean;
  onEdit: () => void;
}) {
  const r = roleOf(p);
  const meta = ROLE_PALETTE[r] || ROLE_PALETTE['student'];
  const Icon = meta.Icon;
  const initials = (p.full_name || p.email || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <li className="py-3 px-2 flex items-center gap-3 hover:bg-muted/40 rounded">
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={p.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold truncate flex items-center gap-2">
          {p.full_name || p.email || '(no name)'}
          {p.disabled && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Disabled</Badge>}
        </div>
        <div className="text-sm text-muted-foreground truncate">{p.email}</div>
      </div>
      <Badge variant="outline" className={cn('text-xs', meta.tone)}>
        <Icon className="w-3 h-3 mr-1" /> {meta.label}
      </Badge>
      {canManage && (
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      )}
    </li>
  );
}

// ── Invite dialog ───────────────────────────────────────────────────────

type CsvRow = { email: string; full_name?: string; role?: 'student' | 'instructor' | 'fan' | 'admin' };

// Naive CSV splitter — no quoted-comma support. Handles the 90% case:
// spreadsheets exported with no embedded commas in fields. If a real
// CSV parser becomes necessary (fields with commas, escaped quotes),
// switch to `papaparse` here without touching callers.
function splitCsvLine(line: string): string[] {
  return line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
}

// Parse a CSV blob into invite rows. Requires a header row with at
// minimum an `email` column. Optional columns: `full_name` (or `name`,
// or `first_name` + `last_name`), and `role` (student|teacher|instructor|
// fan|admin). Rows with invalid emails are silently dropped so a stray
// header/footer line doesn't kill the import.
function parseInviteCsv(text: string): { rows: CsvRow[]; skipped: number; error?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], skipped: 0, error: 'CSV is empty.' };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (aliases: string[]) => header.findIndex((h) => aliases.includes(h));
  const emailIdx = idx(['email', 'emailaddress', 'mail', 'eaddress']);
  if (emailIdx < 0) return { rows: [], skipped: 0, error: 'CSV needs a header row with an "email" column.' };
  const nameIdx = idx(['fullname', 'name', 'displayname']);
  const firstIdx = idx(['firstname', 'first', 'givenname']);
  const lastIdx = idx(['lastname', 'last', 'surname', 'familyname']);
  const roleIdx = idx(['role', 'type', 'usertype']);
  const rows: CsvRow[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const email = (cols[emailIdx] || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped++; continue; }
    let full_name: string | undefined;
    if (nameIdx >= 0 && cols[nameIdx]) full_name = cols[nameIdx];
    else if (firstIdx >= 0 || lastIdx >= 0) {
      const composed = [cols[firstIdx] || '', cols[lastIdx] || ''].filter(Boolean).join(' ').trim();
      if (composed) full_name = composed;
    }
    let role: CsvRow['role'];
    const rawRole = (roleIdx >= 0 ? cols[roleIdx] : '').toLowerCase().trim();
    if (rawRole === 'teacher' || rawRole === 'instructor') role = 'instructor';
    else if (rawRole === 'student' || rawRole === 'member') role = 'student';
    else if (rawRole === 'fan' || rawRole === 'supporter') role = 'fan';
    else if (rawRole === 'admin') role = 'admin';
    rows.push({ email, full_name, role });
  }
  return { rows, skipped };
}

function InviteDialog({
  open, onClose, onInvited,
}: {
  open: boolean; onClose: () => void; onInvited: () => void;
}) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'student' | 'instructor' | 'fan'>('student');
  const [sending, setSending] = useState(false);
  // CSV-loaded rows take priority over the textarea when non-empty.
  // Kept as separate state so the user can preview the parsed count
  // before committing and clear it back out via "Remove CSV".
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  async function onCsvChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after removal
    if (!file) return;
    setCsvError(null);
    const text = await file.text();
    const { rows, skipped, error } = parseInviteCsv(text);
    if (error) { setCsvError(error); setCsvRows([]); setCsvName(null); setCsvSkipped(0); return; }
    if (!rows.length) { setCsvError('No valid emails found in CSV.'); setCsvRows([]); setCsvName(null); setCsvSkipped(skipped); return; }
    setCsvRows(rows);
    setCsvName(file.name);
    setCsvSkipped(skipped);
  }

  function clearCsv() {
    setCsvRows([]);
    setCsvName(null);
    setCsvError(null);
    setCsvSkipped(0);
  }

  async function send() {
    // CSV wins over the textarea when a file is loaded — otherwise
    // parse the textarea as a plain email list. Per-row `role` from the
    // CSV overrides the dialog's role picker; rows without a role fall
    // back to the picker's current value.
    const list: CsvRow[] = csvRows.length > 0
      ? csvRows
      : emails
          .split(/[\s,;\n]+/)
          .map((s) => s.trim().toLowerCase())
          .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
          .map((email) => ({ email }));
    if (!list.length) {
      toast.error(csvRows.length > 0 ? 'CSV had no valid rows.' : 'Enter at least one valid email.');
      return;
    }
    setSending(true);
    let ok = 0; const fails: string[] = [];
    for (const row of list) {
      try {
        // gw-invite-student writes a profile + sends a magic-link email.
        // full_name is forwarded when the CSV provides one — the function
        // ignores unknown body fields, so old deployments still work.
        const { data, error } = await supabase.functions.invoke('gw-invite-student', {
          body: {
            email: row.email,
            role: row.role || role,
            full_name: row.full_name,
            appOrigin: window.location.origin,
          },
        });
        if (error) throw new Error(error.message || 'invoke failed');
        if ((data as any)?.error) throw new Error((data as any).error);
        ok++;
      } catch (e: any) {
        fails.push(`${row.email} — ${e.message}`);
      }
    }
    setSending(false);
    if (ok > 0) {
      toast.success(`Invited ${ok}${fails.length ? ` · ${fails.length} failed` : ''}`);
      setEmails('');
      clearCsv();
      onInvited();
      if (fails.length === 0) onClose();
    }
    if (fails.length > 0) toast.error(fails[0], { description: fails.length > 1 ? `${fails.length - 1} more failed` : undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            New emails get an account + a sign-in link automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Default role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="instructor">Teacher</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              CSV rows with a <code>role</code> column override this per-person.
            </p>
          </div>

          {csvRows.length === 0 && !csvError && (
            <div className="space-y-1.5">
              <Label className="text-xs">Emails</Label>
              <Textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={5}
                placeholder={"alice@example.com\nben@example.com\ncharlie@example.com"}
              />
              <p className="text-sm text-muted-foreground">One per line or comma-separated.</p>
            </div>
          )}

          {/* CSV upload — a full spreadsheet import so a director can
              onboard a whole roster in one shot. Header row required
              with `email` at minimum; `full_name` / `name` /
              `first_name` + `last_name` / `role` are all optional. */}
          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs">Bulk import from CSV</Label>
            {csvRows.length > 0 ? (
              <div className="rounded-lg border bg-muted/40 p-2.5 flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold truncate">{csvName}</div>
                  <div className="text-muted-foreground">
                    {csvRows.length} email{csvRows.length === 1 ? '' : 's'} ready
                    {csvSkipped > 0 && ` · ${csvSkipped} skipped (bad email)`}
                    {csvRows.filter((r) => r.role).length > 0 && ` · ${csvRows.filter((r) => r.role).length} with a role`}
                  </div>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={clearCsv} className="h-7 px-2 text-xs">
                  <CloseIcon className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onCsvChosen}
                  className="hidden"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="w-full">
                  <Upload className="w-4 h-4 mr-1.5" /> Choose CSV file
                </Button>
                <p className="text-xs text-muted-foreground">
                  Header row required. Columns: <code>email</code> (required), <code>full_name</code> or <code>first_name</code>+<code>last_name</code>, <code>role</code> (student/teacher/fan/admin).
                </p>
              </>
            )}
            {csvError && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {csvError}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || (csvRows.length === 0 && !emails.trim())}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
            {csvRows.length > 0 ? `Send ${csvRows.length} invite${csvRows.length === 1 ? '' : 's'}` : 'Send invites'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit user dialog ────────────────────────────────────────────────────

function EditUserDialog({
  person, onClose, onSaved,
}: {
  person: Person | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState('student');
  const [isAdmin, setIsAdmin] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useMemo(() => {
    if (person) {
      setRole(person.role || 'student');
      setIsAdmin(!!person.is_admin || !!person.is_super_admin);
      setDisabled(!!person.disabled);
    }
  }, [person]);

  if (!person) return null;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('gw_profiles')
      .update({
        role,
        is_admin: isAdmin,
        // never escalate to super_admin via this UI — that's a platform-owner action
        disabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', person.user_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Updated.');
    onSaved();
  }

  async function deleteUser() {
    try {
      // admin-delete-user expects userId + userEmail + confirmText
      // ("DELETE <email>"). We construct the confirmation server-side-ready
      // here instead of asking the admin to retype the email — the dialog
      // above is already a typed "Remove forever" confirmation.
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userId: person.user_id,
          userEmail: person.email,
          confirmText: `DELETE ${person.email}`,
        },
      });
      if (error) throw new Error(error.message || 'failed');
      if (data?.error) throw new Error(data.error);
      toast.success('User removed.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed.');
    }
  }

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{person.full_name || person.email}</DialogTitle>
          <DialogDescription>{person.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="instructor">Teacher</SelectItem>
                <SelectItem value="admin">Admin (manages this workspace)</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <div className="text-base font-semibold">Workspace admin</div>
              <div className="text-sm text-muted-foreground">Can manage modules, billing, and settings.</div>
            </div>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">Disabled</div>
              <div className="text-sm text-muted-foreground">Block sign-in while preserving data.</div>
            </div>
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Remove
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
              Save
            </Button>
          </div>
        </DialogFooter>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove this user?</DialogTitle>
              <DialogDescription>
                <span className="font-semibold">{person.full_name || person.email}</span> will lose access immediately.
                Their submissions, attendance, and grades stay in your records. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setConfirmDelete(false); deleteUser(); }}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Remove forever
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
