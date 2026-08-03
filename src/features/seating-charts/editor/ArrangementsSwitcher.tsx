// Toolbar dropdown for switching / renaming / duplicating / deleting
// arrangements attached to a chart.
import { useState } from 'react';
import { Layers, Check, Copy, Star, Trash2, Plus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { SeatingArrangement } from '@/types/seatingCharts';

interface ArrangementsSwitcherProps {
  arrangements: SeatingArrangement[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ArrangementsSwitcher({
  arrangements, activeId, onSwitch, onCreate, onRename, onDuplicate, onSetDefault, onDelete,
}: ArrangementsSwitcherProps) {
  const active = arrangements.find((a) => a.id === activeId);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
            <Layers className="w-4 h-4" />
            {active?.name ?? 'Arrangements'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs">Arrangements</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {arrangements.map((a) => (
            <DropdownMenuItem
              key={a.id}
              className="text-xs flex items-center justify-between gap-2"
              onClick={() => a.id !== activeId && onSwitch(a.id)}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {a.id === activeId ? <Check className="w-4 h-4" /> : <span className="w-3.5" />}
                <span className="truncate">{a.name}</span>
              </span>
              {a.is_default && <Star className="w-3 h-3 text-amber-500" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> New arrangement
          </DropdownMenuItem>
          {active && (
            <>
              <DropdownMenuItem className="text-xs gap-1.5" onClick={() => onDuplicate(active.id)}>
                <Copy className="w-4 h-4" /> Duplicate current
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-1.5" onClick={() => { setRenameId(active.id); setRenameValue(active.name); }}>
                <Edit3 className="w-4 h-4" /> Rename current
              </DropdownMenuItem>
              {!active.is_default && (
                <DropdownMenuItem className="text-xs gap-1.5" onClick={() => onSetDefault(active.id)}>
                  <Star className="w-4 h-4" /> Set as default
                </DropdownMenuItem>
              )}
              {arrangements.length > 1 && (
                <DropdownMenuItem
                  className="text-xs gap-1.5 text-red-600 focus:text-red-600"
                  onClick={() => {
                    if (confirm(`Delete arrangement "${active.name}"? This removes its objects and assignments.`))
                      onDelete(active.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete current
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New arrangement</DialogTitle></DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Concert, Rehearsal, Venue A" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={!newName.trim()} onClick={() => { onCreate(newName.trim()); setNewName(''); setCreating(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameId} onOpenChange={(v) => !v && setRenameId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename arrangement</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button disabled={!renameValue.trim()} onClick={() => { if (renameId) onRename(renameId, renameValue.trim()); setRenameId(null); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ArrangementsSwitcher;
