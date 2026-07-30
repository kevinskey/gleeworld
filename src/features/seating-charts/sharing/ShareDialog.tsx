// Sharing dialog: list current per-user grants, add a grant, revoke.
// Falls back to a simple user picker (tenant-scoped) because we don't have
// a dedicated user-search component in this feature.
import { useEffect, useMemo, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { SeatingShare, SeatingShareRole } from '@/types/seatingCharts';

const ROLES: Array<{ value: SeatingShareRole; label: string; help: string }> = [
  { value: 'editor', label: 'Editor', help: 'Can edit the chart and assignments.' },
  { value: 'viewer', label: 'Viewer', help: 'Read-only access to the chart.' },
  { value: 'performer', label: 'Performer', help: 'Sees their own position in the read-only view.' },
  { value: 'section_leader', label: 'Section leader', help: 'Sees their section and attendance.' },
  { value: 'stage_crew', label: 'Stage crew', help: 'Sees equipment + counts, hides student info.' },
  { value: 'substitute', label: 'Substitute teacher', help: 'Sees classroom layout + names but not private notes.' },
];

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartId: string;
}

interface ShareRow extends SeatingShare {
  display_name?: string | null;
  avatar_url?: string | null;
}

interface UserOption {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function ShareDialog({ open, onOpenChange, chartId }: ShareDialogProps) {
  const { toast } = useToast();
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [role, setRole] = useState<SeatingShareRole>('viewer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [{ data: shareRows }, { data: userRows }] = await Promise.all([
        supabase.from('gw_seating_chart_shares').select('*').eq('chart_id', chartId),
        supabase.from('gw_profiles_directory').select('user_id, full_name, avatar_url').order('full_name').limit(200),
      ]);
      if (cancelled) return;
      const shareList = (shareRows ?? []) as SeatingShare[];
      const directory = (userRows ?? []) as UserOption[];
      const byId = new Map(directory.map((u) => [u.user_id, u] as const));
      setShares(shareList.map((s) => ({ ...s, display_name: byId.get(s.user_id)?.full_name, avatar_url: byId.get(s.user_id)?.avatar_url })));
      setUsers(directory);
    })();
    return () => { cancelled = true; };
  }, [open, chartId]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const alreadyShared = new Set(shares.map((s) => s.user_id));
    return users
      .filter((u) => !alreadyShared.has(u.user_id))
      .filter((u) => !q || (u.full_name ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, query, shares]);

  async function invite() {
    if (!selectedUserId) return;
    setSaving(true);
    const { error } = await supabase
      .from('gw_seating_chart_shares')
      .insert({ chart_id: chartId, user_id: selectedUserId, role });
    if (error) {
      toast({ title: 'Could not share', description: error.message, variant: 'destructive' });
    } else {
      const user = users.find((u) => u.user_id === selectedUserId);
      const { data: rows } = await supabase.from('gw_seating_chart_shares').select('*').eq('chart_id', chartId);
      setShares(((rows ?? []) as SeatingShare[]).map((s) => ({ ...s, display_name: users.find((u) => u.user_id === s.user_id)?.full_name })));
      setSelectedUserId('');
      setQuery('');
      toast({ title: `Shared with ${user?.full_name ?? 'user'}` });
    }
    setSaving(false);
  }

  async function revoke(shareId: string) {
    const { error } = await supabase.from('gw_seating_chart_shares').delete().eq('id', shareId);
    if (error) {
      toast({ title: 'Could not revoke', description: error.message, variant: 'destructive' });
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }

  const publicUrl = `${window.location.origin}/seating-charts/${chartId}/view`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Share chart</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium">Invite by name</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input value={query} onChange={(e) => { setQuery(e.target.value); setSelectedUserId(''); }} placeholder="Search users…" />
                {query && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow z-10 max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        className={`w-full text-left text-xs px-2 py-1 hover:bg-accent ${selectedUserId === u.user_id ? 'bg-accent' : ''}`}
                        onClick={() => { setSelectedUserId(u.user_id); setQuery(u.full_name ?? ''); }}
                      >
                        {u.full_name ?? 'Unnamed'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as SeatingShareRole)}>
                <SelectTrigger className="w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!selectedUserId || saving} onClick={invite}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{ROLES.find((r) => r.value === role)?.help}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">People with access</label>
            {shares.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No one yet. Owners and tenant admins already have full access.</p>
            ) : (
              <ul className="border rounded-md divide-y">
                {shares.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold">
                        {(s.display_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="truncate">{s.display_name ?? s.user_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{ROLES.find((r) => r.value === s.role)?.label ?? s.role}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => revoke(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-3">
            <label className="text-xs font-medium">Read-only link (for anyone with access)</label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={publicUrl} className="text-xs" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: 'Link copied' }); }}>Copy</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
