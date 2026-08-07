// Staff editor for All-State Layer 1 — the global editorial canon.
//
// This page is what makes "adding Alabama requires data entry only, zero code
// changes" true. Everything a state needs — programs, dates, requirements,
// repertoire, fees, documents, voice parts — is editable here.
//
// Writes are fenced by RLS on is_platform_owner(), so a tenant admin who
// reaches this URL sees the data but every save is rejected with a clear
// message rather than failing silently.

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Eye, EyeOff, Globe, Pencil } from 'lucide-react';
import { useAllStateStates } from '@/features/all-state/useAllState';
import {
  useAdminPrograms, useSetVerification, useSetStateActive,
} from '@/features/all-state/admin/useAllStateAdmin';
import { ENTITIES } from '@/features/all-state/admin/fieldSchemas';
import { RecordEditor } from '@/features/all-state/admin/RecordEditor';
import { ProgramDialog } from '@/features/all-state/admin/ProgramDialog';
import type { VerificationStatus, AllStateProgram } from '@/features/all-state/types';

const STATUS_TONE: Record<VerificationStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_verification: 'bg-amber-50 text-amber-800 border-amber-200',
  draft: 'bg-muted text-muted-foreground',
  stale: 'bg-red-50 text-red-700 border-red-200',
};

const TAB_ORDER = ['dates', 'requirements', 'repertoire', 'fees', 'documents', 'voiceParts'] as const;

export default function AllStateAdminPage() {
  const { data: states, isLoading: statesLoading } = useAllStateStates();
  const [stateId, setStateId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AllStateProgram | null>(null);

  const { data: programs, isLoading: programsLoading } = useAdminPrograms(stateId || undefined);
  const setVerification = useSetVerification();
  const setActive = useSetStateActive();

  const state = states?.find((s) => s.id === stateId);
  const program = programs?.find((p) => p.id === programId) ?? programs?.[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">All-State — editorial canon</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global reference data about state music associations. Not tenant data —
          every tenant reads the same rows. Staff only.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem]">
          <label className="mb-1.5 block text-sm font-medium">State</label>
          {statesLoading ? (
            <Skeleton className="h-10 w-56" />
          ) : (
            <Select value={stateId} onValueChange={(v) => { setStateId(v); setProgramId(''); }}>
              <SelectTrigger><SelectValue placeholder="Choose a state…" /></SelectTrigger>
              <SelectContent>
                {states?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.active ? '' : ' — not live'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {state && (
          <>
            <Button
              variant="outline"
              onClick={() => setActive.mutate({ stateId: state.id, active: !state.active })}
              disabled={setActive.isPending}
            >
              <Globe className="mr-1.5 h-4 w-4" aria-hidden />
              {state.active ? 'Hide from directory' : 'Show in directory'}
            </Button>
            <Button onClick={() => { setEditingProgram(null); setProgramDialogOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New program
            </Button>
          </>
        )}
      </div>

      {!stateId && (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title="Choose a state"
          description="Pick a state above to view and edit its All-State programs."
        />
      )}

      {stateId && programsLoading && <Skeleton className="h-64 rounded-xl" />}

      {stateId && !programsLoading && (programs?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Plus className="h-8 w-8" />}
          title="No programs yet"
          description={`${state?.name ?? 'This state'} has no All-State programs. Create one to start entering its dates, requirements, and repertoire.`}
          actionLabel="New program"
          onAction={() => { setEditingProgram(null); setProgramDialogOpen(true); }}
        />
      )}

      {state && (
        <ProgramDialog
          open={programDialogOpen}
          onOpenChange={setProgramDialogOpen}
          stateId={state.id}
          stateSlug={state.slug}
          editing={editingProgram}
        />
      )}

      {program && (
        <>
          {(programs?.length ?? 0) > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {programs!.map((p) => (
                <Button
                  key={p.id} size="sm"
                  variant={p.id === program.id ? 'default' : 'outline'}
                  onClick={() => setProgramId(p.id)}
                >
                  {p.name}
                  <span className="ml-1.5 text-xs opacity-70">{p.season}</span>
                </Button>
              ))}
            </div>
          )}

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {program.name}
                <Badge variant="outline" className={`${STATUS_TONE[program.verification_status]} font-normal`}>
                  {program.verification_status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">{program.season}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                {program.verification_status === 'verified'
                  ? 'This program is live. Its dates, requirements, and fees are visible to logged-out visitors on the public state page.'
                  : 'Not published. Nothing below is visible to anyone outside this editor until you verify it.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {program.verification_status !== 'verified' ? (
                  <Button
                    onClick={() => setVerification.mutate({ programId: program.id, status: 'verified' })}
                    disabled={setVerification.isPending}
                  >
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden /> Verify &amp; publish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setVerification.mutate({ programId: program.id, status: 'pending_verification' })}
                    disabled={setVerification.isPending}
                  >
                    <EyeOff className="mr-1.5 h-4 w-4" aria-hidden /> Unpublish
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setVerification.mutate({ programId: program.id, status: 'stale' })}
                  disabled={setVerification.isPending}
                >
                  Mark stale
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setEditingProgram(program); setProgramDialogOpen(true); }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" aria-hidden /> Edit details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="dates">
            <TabsList className="mb-4 flex w-full flex-wrap justify-start">
              {TAB_ORDER.map((key) => (
                <TabsTrigger key={key} value={key}>{ENTITIES[key].plural}</TabsTrigger>
              ))}
            </TabsList>

            {TAB_ORDER.map((key) => (
              <TabsContent key={key} value={key}>
                <RecordEditor
                  entity={ENTITIES[key]}
                  programId={program.id}
                  fixed={{ program_id: program.id }}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
