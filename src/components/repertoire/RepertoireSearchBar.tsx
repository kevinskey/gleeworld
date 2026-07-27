import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface RepertoireFilters {
  query: string;
  ensemble: string;
  voicing: string;
  source: string;
}

interface Props {
  filters: RepertoireFilters;
  onChange: (next: RepertoireFilters) => void;
}

export function RepertoireSearchBar({ filters, onChange }: Props) {
  const set = <K extends keyof RepertoireFilters>(k: K, v: RepertoireFilters[K]) =>
    onChange({ ...filters, [k]: v });

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search titles, composers, publishers"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.ensemble || 'any'} onValueChange={(v) => set('ensemble', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-40 text-xs"><SelectValue placeholder="Ensemble" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any ensemble</SelectItem>
          <SelectItem value="choral">Choral</SelectItem>
          <SelectItem value="band">Band</SelectItem>
          <SelectItem value="orchestra">Orchestra</SelectItem>
          <SelectItem value="chamber">Chamber</SelectItem>
          <SelectItem value="solo">Solo</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.voicing || 'any'} onValueChange={(v) => set('voicing', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-32 text-xs"><SelectValue placeholder="Voicing" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any voicing</SelectItem>
          <SelectItem value="SATB">SATB</SelectItem>
          <SelectItem value="SSA">SSA</SelectItem>
          <SelectItem value="SSAA">SSAA</SelectItem>
          <SelectItem value="TTBB">TTBB</SelectItem>
          <SelectItem value="TB">TB</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.source || 'any'} onValueChange={(v) => set('source', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-32 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All sources</SelectItem>
          <SelectItem value="cpdl">CPDL</SelectItem>
          <SelectItem value="imslp">IMSLP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
