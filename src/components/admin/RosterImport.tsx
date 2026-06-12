// CSV roster import: parse → preview → bulk invite via gw-roster-import.
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Send, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface ParsedRow {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  voice_part?: string;
  class_year?: string;
  role?: string;
}

interface RowResult {
  email: string;
  status: string;
  message?: string;
}

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  'first name': 'first_name', firstname: 'first_name', first: 'first_name',
  'last name': 'last_name', lastname: 'last_name', last: 'last_name', surname: 'last_name',
  name: 'full_name', 'full name': 'full_name', fullname: 'full_name',
  phone: 'phone', 'phone number': 'phone', mobile: 'phone', cell: 'phone',
  'voice part': 'voice_part', voicepart: 'voice_part', voice: 'voice_part', part: 'voice_part', section: 'voice_part',
  'class year': 'class_year', year: 'class_year', 'grad year': 'class_year', 'graduation year': 'class_year',
  role: 'role',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function mapRows(grid: string[][]): { rows: ParsedRow[]; skipped: number } {
  if (grid.length === 0) return { rows: [], skipped: 0 };
  const header = grid[0].map((h) => h.trim().toLowerCase());
  const cols: Array<keyof ParsedRow | null> = header.map((h) => HEADER_ALIASES[h] ?? null);
  if (!cols.includes('email')) {
    // No recognizable header — try to find an email-looking column in row 0.
    const emailIdx = grid[0].findIndex((c) => /@/.test(c));
    if (emailIdx === -1) return { rows: [], skipped: grid.length };
    const rows = grid
      .map((r) => ({ email: r[emailIdx]?.trim() ?? '', full_name: r[0] !== r[emailIdx] ? r[0]?.trim() : undefined }))
      .filter((r) => /@/.test(r.email));
    return { rows, skipped: grid.length - rows.length };
  }
  const out: ParsedRow[] = [];
  let skipped = 0;
  for (const r of grid.slice(1)) {
    const obj: ParsedRow = { email: '' };
    cols.forEach((key, i) => {
      if (key && r[i]?.trim()) (obj as any)[key] = r[i].trim();
    });
    if (/@/.test(obj.email)) out.push(obj);
    else skipped++;
  }
  return { rows: out, skipped };
}

export function RosterImport({ open, onOpenChange, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState('');
  const [defaultRole, setDefaultRole] = useState('member');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[] | null>(null);

  function reset() {
    setRows([]); setSkipped(0); setFileName(''); setResults(null); setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows: parsed, skipped: sk } = mapRows(parseCsv(text));
    setRows(parsed);
    setSkipped(sk);
    setFileName(file.name);
    setResults(null);
    if (parsed.length === 0) {
      toast({ title: 'No usable rows', description: 'Could not find an email column. Include an "Email" header.', variant: 'destructive' });
    }
  }

  async function runImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setResults(null);
    const all: RowResult[] = [];
    try {
      const CHUNK = 50;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { data, error } = await supabase.functions.invoke('gw-roster-import', {
          body: { rows: chunk, default_role: defaultRole },
        });
        if (error) throw error;
        all.push(...(data?.results ?? []));
        setProgress(Math.min(rows.length, i + CHUNK));
        setResults([...all]);
      }
      const invited = all.filter((r) => r.status === 'invited').length;
      const linked = all.filter((r) => r.status === 'linked').length;
      const errors = all.filter((r) => r.status === 'error').length;
      toast({
        title: 'Import finished',
        description: `${invited} invited, ${linked} already had accounts${errors ? `, ${errors} failed` : ''}.`,
        variant: errors ? 'destructive' : 'default',
      });
      onImported?.();
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }

  const resultFor = (email: string) => results?.find((r) => r.email.toLowerCase() === email.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Import roster from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV with an <strong>Email</strong> column (plus optional First Name, Last Name,
            Phone, Voice Part, Class Year, Role). Each new person gets an email invitation to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">CSV file</Label>
              <div>
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
                  <Upload className="w-4 h-4 mr-2" /> {fileName || 'Choose file…'}
                </Button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={pickFile} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Default role (when not in CSV)</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole} disabled={importing}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="auditioner">Auditioner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {rows.length} people ready to import{skipped > 0 ? ` · ${skipped} rows skipped (no valid email)` : ''}
              </p>
              <div className="border rounded-md overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-medium">Name</th>
                      <th className="px-2 py-1.5 font-medium">Email</th>
                      <th className="px-2 py-1.5 font-medium">Voice part</th>
                      <th className="px-2 py-1.5 font-medium">Role</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => {
                      const res = resultFor(r.email);
                      return (
                        <tr key={i}>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-2 py-1.5">{r.email}</td>
                          <td className="px-2 py-1.5">{r.voice_part || '—'}</td>
                          <td className="px-2 py-1.5">{r.role || defaultRole}</td>
                          <td className="px-2 py-1.5">
                            {res?.status === 'invited' && <Badge className="bg-green-500/20 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Invited</Badge>}
                            {res?.status === 'linked' && <Badge className="bg-blue-500/20 text-blue-700"><CheckCircle2 className="w-3 h-3 mr-1" />Linked</Badge>}
                            {res?.status === 'error' && <Badge variant="destructive" title={res.message}><AlertCircle className="w-3 h-3 mr-1" />{res.message?.slice(0, 40) || 'Failed'}</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={importing}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            <Button onClick={runImport} disabled={importing || rows.length === 0 || !!results}>
              {importing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing… ({progress}/{rows.length})</>
                : <><Send className="w-4 h-4 mr-2" /> Invite {rows.length || ''} people</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
