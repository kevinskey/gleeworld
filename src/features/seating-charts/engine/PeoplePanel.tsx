// People list for the editor rail flyout: search, refresh, import, and
// draggable rows that drop onto seats in the canvas.
import { useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SeatingPerson } from '@/types/seatingCharts';

interface PeoplePanelProps {
  people: SeatingPerson[];
  assignedPersonIds: Set<string>;
  peopleSearch: string;
  onPeopleSearchChange: (v: string) => void;
  onRefreshPeople: () => void;
  onImportRoster: () => void;
  /** Tap-to-place: the currently armed person (touch has no HTML5 DnD). */
  armedPersonId: string | null;
  onArmPerson: (person: { id: string; name: string } | null) => void;
}

export function PeoplePanel({
  people, assignedPersonIds, peopleSearch, onPeopleSearchChange, onRefreshPeople, onImportRoster,
  armedPersonId, onArmPerson,
}: PeoplePanelProps) {
  const filtered = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    return people
      .filter((p) => !q || (p.full_name ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  }, [people, peopleSearch]);

  return (
    <div className="flex flex-col h-full min-h-0 p-2 gap-2">
      <div className="flex gap-2">
        <Input
          value={peopleSearch}
          onChange={(e) => onPeopleSearchChange(e.target.value)}
          placeholder="Search people"
          className="h-8 text-xs"
        />
        <Button size="sm" variant="outline" className="h-8" onClick={onRefreshPeople} title="Refresh">↻</Button>
      </div>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onImportRoster}>
        <UserPlus className="w-4 h-4" /> Import roster
      </Button>
      <p className="text-xs text-muted-foreground">Drag a name onto a seat — or tap a name, then tap a seat.</p>
      <div className="flex-1 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground p-2">No people to place yet. Import your roster to get started.</p>
        )}
        {filtered.map((p) => {
          const assigned = assignedPersonIds.has(p.user_id);
          const armed = armedPersonId === p.user_id;
          return (
            <div
              key={p.user_id}
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-seating-person', JSON.stringify({
                  profileId: p.user_id,
                  displayName: p.full_name ?? 'Unnamed',
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onArmPerson(armed ? null : { id: p.user_id, name: p.full_name ?? 'Unnamed' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onArmPerson(armed ? null : { id: p.user_id, name: p.full_name ?? 'Unnamed' });
                }
              }}
              className={`flex items-center gap-2 px-2 py-1.5 border cursor-grab text-xs ${
                armed
                  ? 'border-primary bg-accent text-accent-foreground'
                  : assigned ? 'bg-muted/40 text-muted-foreground' : 'bg-card hover:bg-accent'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                {(p.full_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{p.full_name ?? 'Unnamed'}</p>
                {p.voice_part && <p className="text-xs text-muted-foreground truncate">{p.voice_part}</p>}
              </div>
              {assigned && <span className="text-xs text-muted-foreground">seated</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PeoplePanel;
