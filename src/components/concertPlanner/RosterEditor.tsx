// Roster builder sidebar panel.
//
// Lives inside the Concert Planner editor's sidebar. The admin types a
// section name ("Soprano"), hits Enter, then types each member's name
// into the section. Data writes immediately to gw_concert_roster_*
// through useConcertProgram's mutations — the transform layer picks up
// the new rows on the next render and the grid-roster card reflows.

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConcertProgram } from '@/hooks/useConcertPrograms';

interface RosterEditorProps {
  concert: ReturnType<typeof useConcertProgram>;
}

export function RosterEditor({ concert }: RosterEditorProps) {
  const { roster, addRosterSection, deleteRosterSection, addRosterMember, deleteRosterMember } = concert;
  const [newSection, setNewSection] = useState('');

  const submitSection = () => {
    const name = newSection.trim();
    if (!name) return;
    addRosterSection.mutate(name);
    setNewSection('');
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Roster
      </h3>

      {/* Add section */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Add voice part / section</Label>
        <div className="flex gap-1 mt-1">
          <Input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSection(); } }}
            placeholder="Soprano, Alto, Tenor…"
            className="text-xs h-8"
          />
          <Button size="sm" variant="outline" onClick={submitSection} disabled={!newSection.trim()}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Sections list */}
      {roster.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No sections yet.</p>
      ) : (
        <div className="space-y-3">
          {roster.map((section) => (
            <RosterSectionRow
              key={section.id}
              sectionId={section.id}
              sectionName={section.section_name}
              members={section.members.map((m) => ({ id: m.id, name: m.member_name }))}
              onAddMember={(name) => addRosterMember.mutate({ sectionId: section.id, member_name: name })}
              onDeleteMember={(memberId) => deleteRosterMember.mutate(memberId)}
              onDeleteSection={() => deleteRosterSection.mutate(section.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RosterSectionRow({
  sectionId, sectionName, members, onAddMember, onDeleteMember, onDeleteSection,
}: {
  sectionId: string;
  sectionName: string;
  members: Array<{ id: string; name: string }>;
  onAddMember: (name: string) => void;
  onDeleteMember: (id: string) => void;
  onDeleteSection: () => void;
}) {
  const [pending, setPending] = useState('');

  const submit = () => {
    const v = pending.trim();
    if (!v) return;
    onAddMember(v);
    setPending('');
  };

  return (
    <div className="border border-border rounded-lg p-2 bg-muted/30">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider">{sectionName}</div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete the "${sectionName}" section?`)) onDeleteSection();
          }}
          className="text-muted-foreground hover:text-rose-500"
          aria-label="Delete section"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <ul className="space-y-0.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-[11px] group">
            <span className="truncate">{m.name}</span>
            <button
              onClick={() => onDeleteMember(m.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500"
              aria-label={`Remove ${m.name}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1 mt-1.5">
        <Input
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Add member…"
          className="text-[11px] h-7"
        />
        <Button size="sm" variant="ghost" onClick={submit} disabled={!pending.trim()} className="h-7 px-2">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
