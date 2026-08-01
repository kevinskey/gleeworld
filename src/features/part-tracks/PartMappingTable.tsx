// Confirmation table for detected parts: role, label, include.
// Condensed-staff voice rows carry an explicit staff/voice caption.
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PART_ROLES, type PartTrackPart } from './types';

const ROLE_LABELS: Record<string, string> = {
  soprano: 'Soprano', soprano_1: 'Soprano 1', soprano_2: 'Soprano 2',
  alto: 'Alto', alto_1: 'Alto 1', alto_2: 'Alto 2',
  tenor: 'Tenor', tenor_1: 'Tenor 1', tenor_2: 'Tenor 2',
  bass: 'Bass', bass_1: 'Bass 1', bass_2: 'Bass 2',
  piano: 'Piano', other: 'Other',
};

interface Props {
  parts: PartTrackPart[];
  onChange: (next: PartTrackPart[]) => void;
}

export function PartMappingTable({ parts, onChange }: Props) {
  const update = (id: string, patch: Partial<PartTrackPart>) => {
    onChange(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Label</TableHead>
          <TableHead className="text-xs">Part</TableHead>
          <TableHead className="text-xs">Detected</TableHead>
          <TableHead className="text-xs">Include</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parts.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-sm">
              <Input
                value={p.label}
                onChange={(e) => update(p.id, { label: e.target.value })}
                className="h-8 text-sm"
              />
              {p.source_voice != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Staff {(p.source_staff ?? 0) + 1}, voice {p.source_voice} — from a condensed staff
                </p>
              )}
            </TableCell>
            <TableCell>
              <Select value={p.role} onValueChange={(role) => update(p.id, { role })}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PART_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-sm">
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {p.confidence >= 0.7 ? (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(p.confidence * 100)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                  check me
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Switch
                checked={p.include}
                onCheckedChange={(include) => update(p.id, { include })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
