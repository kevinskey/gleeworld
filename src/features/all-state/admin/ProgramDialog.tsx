// Create/edit an All-State program, plus create the state's organization if it
// doesn't have one yet.
//
// This is the last thing standing between here and zero-code state onboarding:
// until now programs could only be created by writing a migration.
//
// Not driven by fieldSchemas.ts like the child entities are, because programs
// have three fields that need real logic rather than a text box — slug and
// lineage_key are derived, and season is part of the row's identity.

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSaveRow, useStateOrganizations } from './useAllStateAdmin';
import type { AllStateProgram } from '../types';

/** "All-State Chorus — 9th & 10th Grade" → "all-state-chorus-9th-10th-grade" */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stateId: string;
  stateSlug: string;
  editing?: AllStateProgram | null;
}

export function ProgramDialog({ open, onOpenChange, stateId, stateSlug, editing }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const saveProgram = useSaveRow('gw_all_state_programs');
  const saveOrg = useSaveRow('gw_all_state_organizations');
  const { data: orgs } = useStateOrganizations(stateId);

  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [level, setLevel] = useState('');
  const [ensembleType, setEnsembleType] = useState('chorus');
  const [orgId, setOrgId] = useState('');
  const [description, setDescription] = useState('');
  const [lineageOverride, setLineageOverride] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [newOrgOpen, setNewOrgOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgAcronym, setOrgAcronym] = useState('');
  const [orgUrl, setOrgUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(editing?.name ?? '');
    setSeason(editing?.season ?? '');
    setLevel(editing?.school_level ?? '');
    setEnsembleType(editing?.ensemble_type ?? 'chorus');
    setOrgId(editing?.organization_id ?? '');
    setDescription(editing?.description ?? '');
    setLineageOverride(editing?.lineage_key ?? '');
  }, [open, editing]);

  // lineage_key chains seasons of the same program together for year-over-year
  // diffing, so it must NOT contain the season. slug must, because season is
  // part of a program's identity — 2026-27 and 2025-26 are separate rows.
  const lineageKey = useMemo(
    () => lineageOverride.trim() || `${stateSlug}-${slugify(name)}`,
    [lineageOverride, stateSlug, name],
  );
  const slug = useMemo(
    () => `${lineageKey}-${slugify(season)}`,
    [lineageKey, season],
  );

  async function createOrg() {
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    const row = await saveOrg.mutateAsync({
      values: {
        state_id: stateId,
        name: orgName.trim(),
        acronym: orgAcronym.trim() || null,
        website_url: orgUrl.trim() || null,
      },
    });
    setOrgId(String((row as { id: string }).id));
    setNewOrgOpen(false);
    setOrgName(''); setOrgAcronym(''); setOrgUrl('');
    qc.invalidateQueries({ queryKey: ['all-state-admin', 'orgs', stateId] });
  }

  function submit() {
    setError(null);
    if (!name.trim()) { setError('Program name is required.'); return; }
    if (!season.trim()) { setError('Season is required — it is part of the program\'s identity.'); return; }

    saveProgram.mutate(
      {
        id: editing?.id,
        values: {
          state_id: stateId,
          organization_id: orgId || null,
          name: name.trim(),
          slug,
          season: season.trim(),
          lineage_key: lineageKey,
          school_level: level || null,
          ensemble_type: ensembleType.trim() || null,
          description: description.trim() || null,
          // New programs are never born published.
          ...(editing ? {} : { verification_status: 'draft' }),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: Error) => {
          setError(
            e.message.includes('duplicate') || e.message.includes('unique')
              ? `A program already exists for lineage "${lineageKey}" in season "${season}". Change the season, or edit the existing program.`
              : e.message,
          );
          toast({ title: "Couldn't save program", description: e.message, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit program' : 'New program'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name <span className="text-destructive">*</span></Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="All-State Chorus — 9th &amp; 10th Grade" />
            <p className="text-xs text-muted-foreground">
              Use the state&rsquo;s own wording for the division.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-season">Season <span className="text-destructive">*</span></Label>
            <Input id="p-season" value={season} onChange={(e) => setSeason(e.target.value)}
              placeholder="2026-27" />
            <p className="text-xs text-muted-foreground">
              Season is part of the program&rsquo;s identity, not a field you overwrite next year.
              Rolling over means adding a new program, which leaves this one intact.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>School level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {['elementary', 'middle', 'high', 'collegiate', 'other'].map((v) => (
                    <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-type">Ensemble type</Label>
              <Input id="p-type" value={ensembleType}
                onChange={(e) => setEnsembleType(e.target.value)} placeholder="chorus" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Organization</Label>
            <div className="flex gap-2">
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {orgs?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}{o.acronym ? ` (${o.acronym})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setNewOrgOpen((v) => !v)}>
                New
              </Button>
            </div>
          </div>

          {newOrgOpen && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                New organization
              </Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)}
                placeholder="Georgia Music Educators Association" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={orgAcronym} onChange={(e) => setOrgAcronym(e.target.value)}
                  placeholder="GMEA" />
                <Input value={orgUrl} onChange={(e) => setOrgUrl(e.target.value)}
                  placeholder="https://www.gmea.org/" />
              </div>
              <Button type="button" size="sm" onClick={createOrg} disabled={saveOrg.isPending}>
                {saveOrg.isPending ? 'Creating…' : 'Create organization'}
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-lineage">Lineage key</Label>
            <Input id="p-lineage" value={lineageOverride} className="font-mono text-xs"
              onChange={(e) => setLineageOverride(e.target.value)} placeholder={lineageKey} />
            <p className="text-xs text-muted-foreground">
              Chains successive seasons of the same program together. Leave blank to derive it.
              When you add next season, reuse this exact value so year-over-year comparison works.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <p className="text-muted-foreground">Will be saved as</p>
            <p className="mt-1 font-mono break-all">{slug || '—'}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saveProgram.isPending}>
            {saveProgram.isPending ? 'Saving…' : editing ? 'Save' : 'Create program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
