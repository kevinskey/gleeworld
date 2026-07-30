// Person-group manager. Users create named groups (keep together / separate /
// front row / accessibility) and assign people to them. Groups live in
// chart.settings.groups and are read by the placement rules.
import { useMemo, useState } from 'react';
import { Trash2, UserPlus, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  GROUP_KIND_LABEL, groupsOfKind, upsertGroup, createGroup, renameGroup,
  deleteGroup, addMember, removeMember, type GroupKind,
} from './groupState';
import type { SeatingChart, SeatingPerson } from '@/types/seatingCharts';

interface GroupManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chart: SeatingChart;
  people: SeatingPerson[];
  onPatchChart: (patch: Partial<SeatingChart>) => void;
}

const TABS: GroupKind[] = ['keep_together', 'separate', 'front_row', 'accessibility'];

export function GroupManager({ open, onOpenChange, chart, people, onPatchChart }: GroupManagerProps) {
  const [kind, setKind] = useState<GroupKind>('keep_together');
  const [newName, setNewName] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState<string>('');

  const groups = useMemo(() => groupsOfKind(chart, kind), [chart, kind]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.user_id, p] as const)), [people]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Manage groups</DialogTitle></DialogHeader>

        <Tabs value={kind} onValueChange={(v) => setKind(v as GroupKind)}>
          <TabsList className="grid grid-cols-4 text-xs">
            {TABS.map((k) => (
              <TabsTrigger key={k} value={k} className="text-[11px]">{GROUP_KIND_LABEL[k]}</TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((k) => (
            <TabsContent key={k} value={k} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder={`New ${GROUP_KIND_LABEL[k].toLowerCase()} group`}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm" disabled={!newName.trim()}
                  onClick={() => {
                    const { patch } = createGroup(chart, newName.trim(), k);
                    onPatchChart(patch);
                    setNewName('');
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {groups.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No {GROUP_KIND_LABEL[k].toLowerCase()} groups yet.</p>
              )}

              <ul className="space-y-2">
                {groups.map((g) => (
                  <li key={g.id} className="border rounded p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={g.name}
                        onChange={(e) => onPatchChart(renameGroup(chart, g.id, e.target.value))}
                        className="h-7 text-xs"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => onPatchChart(deleteGroup(chart, g.id))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {g.member_user_ids.map((uid) => {
                        const p = peopleById.get(uid);
                        return (
                          <Badge key={uid} variant="secondary" className="text-[10px] gap-1 pl-1.5 pr-1">
                            {p?.full_name ?? uid.slice(0, 8)}
                            <button
                              type="button" className="hover:text-red-600"
                              onClick={() => onPatchChart(removeMember(chart, g.id, uid))}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                      {g.member_user_ids.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No members yet.</span>
                      )}
                    </div>
                    {addingToGroup === g.id ? (
                      <div className="flex gap-2">
                        <Select value={addUserId} onValueChange={setAddUserId}>
                          <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Pick a person…" /></SelectTrigger>
                          <SelectContent>
                            {people
                              .filter((p) => !g.member_user_ids.includes(p.user_id))
                              .slice(0, 100)
                              .map((p) => (
                                <SelectItem key={p.user_id} value={p.user_id} className="text-xs">{p.full_name ?? p.user_id.slice(0, 8)}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" disabled={!addUserId}
                          onClick={() => {
                            onPatchChart(addMember(chart, g.id, addUserId));
                            setAddUserId('');
                          }}
                        >Add</Button>
                        <Button variant="outline" size="sm" onClick={() => setAddingToGroup(null)}>Done</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => { setAddingToGroup(g.id); setAddUserId(''); }}>
                        <UserPlus className="w-3.5 h-3.5" /> Add person
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GroupManager;
