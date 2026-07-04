// People hub — the tenant's roster, searchable and grouped. Replaces the
// attendance page as the destination for the "Roster" tab/tile; attendance
// keeps its own dedicated route for faculty check-in.
// Spec: docs/superpowers/plans/2026-07-04-contacts-groups.md Task 4
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useUserRole } from '@/hooks/useUserRole';
import { usePeopleDirectory, type DirectoryPerson } from '@/hooks/usePeopleDirectory';
import { PersonCard } from '@/components/people/PersonCard';
import { displayName, initials, sectionLabel } from '@/lib/people/contactActions';
import { isFacultyProfile } from '@/lib/roles';

const FACULTY_GROUP_LABEL = 'Directors & staff';
const OTHER_GROUP_LABEL = 'Other';

interface PersonGroup {
  label: string;
  people: DirectoryPerson[];
}

function groupPeople(people: DirectoryPerson[]): PersonGroup[] {
  const faculty: DirectoryPerson[] = [];
  const bySection = new Map<string, DirectoryPerson[]>();
  const other: DirectoryPerson[] = [];

  for (const person of people) {
    if (isFacultyProfile({ role: person.role })) {
      faculty.push(person);
      continue;
    }
    const section = sectionLabel(person.voice_part);
    if (section) {
      const bucket = bySection.get(section) ?? [];
      bucket.push(person);
      bySection.set(section, bucket);
    } else {
      other.push(person);
    }
  }

  const groups: PersonGroup[] = [];
  if (faculty.length > 0) groups.push({ label: FACULTY_GROUP_LABEL, people: faculty });
  for (const label of [...bySection.keys()].sort((a, b) => a.localeCompare(b))) {
    groups.push({ label, people: bySection.get(label) ?? [] });
  }
  if (other.length > 0) groups.push({ label: OTHER_GROUP_LABEL, people: other });
  return groups;
}

function matchesQuery(person: DirectoryPerson, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    displayName(person),
    person.email ?? '',
    sectionLabel(person.voice_part) ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function PeopleHub() {
  const { profile } = useUserRole();
  const isFaculty = isFacultyProfile(profile);
  const { data: people, isLoading } = usePeopleDirectory();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DirectoryPerson | null>(null);

  const filtered = useMemo(
    () => people.filter((p) => matchesQuery(p, query)),
    [people, query],
  );
  const groups = useMemo(() => groupPeople(filtered), [filtered]);

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-24 sm:pb-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-serif text-2xl font-semibold">People</h1>
          {isFaculty && (
            <Button asChild variant="outline" size="sm" className="min-h-[44px]">
              <Link to="/attendance">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Take attendance
              </Link>
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, or section"
            aria-label="Search people"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading people…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {people.length === 0
              ? 'No members yet — invite your roster from People settings.'
              : 'No matches for that search.'}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {group.label}
                </div>
                <ul className="divide-y divide-border bg-card border border-border">
                  {group.people.map((person) => {
                    const name = displayName(person);
                    const section = sectionLabel(person.voice_part);
                    const avatarSrc = person.headshot_url || person.avatar_url || null;
                    return (
                      <li key={person.user_id ?? name}>
                        <button
                          type="button"
                          onClick={() => setSelected(person)}
                          className="flex w-full items-center gap-3 py-2 px-3 min-h-[44px] text-left hover:bg-accent transition-all duration-200"
                        >
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                              {initials(person)}
                            </div>
                          )}
                          <span className="flex-1 truncate text-sm">{name}</span>
                          {section && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {section}
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <PersonCard
          person={selected}
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
