import { useEffect, useMemo, useState } from 'react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Download, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { filterFees, buildFeesCsv, type FeeStatusFilter } from '@/lib/fees/feeListUtils';
import { FeeNoteActionDialog } from '@/components/fees/FeeNoteActionDialog';
import { NewIndividualFeeDialog } from '@/components/fees/NewIndividualFeeDialog';
import { useToast } from '@/components/ui/use-toast';
import { FeeSettingsCard } from '@/components/fees/FeeSettingsCard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { useFeesManagement } from '@/hooks/useFeesManagement';
import { CreateFeeTemplateDialog } from '@/components/fees/CreateFeeTemplateDialog';
import { FeeAssignDialog } from '@/components/fees/FeeAssignDialog';
import { FeeTemplateRollup } from '@/components/fees/FeeTemplateRollup';
import { MarkPaidDialog } from '@/components/fees/MarkPaidDialog';
import { StoreConnectPrompt } from '@/components/products/StoreConnectPrompt';

const CATS = ['all', 'dues', 'participation', 'fundraiser', 'wardrobe', 'trip', 'travel', 'other'] as const;
type Cat = (typeof CATS)[number];

const CAT_LABELS: Record<Cat, string> = {
  all: 'All',
  dues: 'Dues',
  participation: 'Participation',
  fundraiser: 'Fundraisers',
  wardrobe: 'Wardrobe',
  trip: 'Trips',
  travel: 'Travel',
  other: 'Other',
};

export default function FeesAdminPage() {
  const [tab, setTab] = useState<Cat>('all');
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<FeeTemplate | null>(null);
  const [markPaidFor, setMarkPaidFor] = useState<{
    id: string;
    remaining: number;
  } | null>(null);

  const { listTemplates } = useFeeTemplates();
  // The fee awaiting delete confirmation. Deleting is irreversible and can
  // destroy a payment record, so it never fires straight off the row button.
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; name: string; who: string; paid: number } | null
  >(null);
  const { studentFees, refetch, deleteFee, waiveFee, refundFee } = useFeesManagement();
  const { toast } = useToast();

  const copyPayLink = async (feeId: string, token: string | undefined) => {
    if (!token) {
      toast({ title: 'No pay link on this fee yet', description: 'Reload the page and try again.' });
      return;
    }
    await navigator.clipboard.writeText(
      `${window.location.origin}/pay/fee/${feeId}?token=${token}`,
    );
    toast({
      title: 'Pay link copied',
      description: 'Share it with the family — no login needed to pay.',
    });
  };
  const [noteAction, setNoteAction] = useState<
    { type: 'waive' | 'refund'; feeId: string; name: string } | null
  >(null);
  const [newFeeOpen, setNewFeeOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeeStatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const reload = async () => {
    const data = await listTemplates({
      category: tab === 'all' ? undefined : (tab as FeeTemplate['category']),
    });
    setTemplates(data);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const visibleFees = useMemo(() => {
    const inCategory =
      tab === 'all' ? studentFees : studentFees.filter(f => f.category === tab);
    return filterFees(inCategory, { query, status: statusFilter });
  }, [studentFees, tab, query, statusFilter]);

  // Fees eligible for bulk mark-paid: selected, with a balance, not closed.
  const bulkFees = useMemo(
    () =>
      studentFees
        .filter(f => selected.has(f.id))
        .filter(f => f.status !== 'refunded' && f.status !== 'waived')
        .map(f => ({ id: f.id, remaining: Number(f.amount) - Number(f.paid_amount ?? 0) }))
        .filter(f => f.remaining > 0),
    [studentFees, selected],
  );

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allShownSelected =
    visibleFees.length > 0 && visibleFees.every(f => selected.has(f.id));

  const toggleAllShown = (checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      visibleFees.forEach(f => (checked ? next.add(f.id) : next.delete(f.id)));
      return next;
    });
  };

  const exportCsv = () => {
    const blob = new Blob([buildFeesCsv(visibleFees)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <DashboardPageShell
      title="Fees"
      subtitle="Manage fee templates, assignments, and payments across all categories."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewFeeOpen(true)}>
            + Individual fee
          </Button>
          <Button onClick={() => setCreateOpen(true)}>+ New template</Button>
        </div>
      }
    >
      <StoreConnectPrompt returnPath="/dashboard/fees" moneyLabel="Student fee payments" />
      <div className="mb-4">
        <FeeSettingsCard />
      </div>
      <Tabs value={tab} onValueChange={v => setTab(v as Cat)}>
        <TabsList>
          {CATS.map(c => (
            <TabsTrigger key={c} value={c}>
              {CAT_LABELS[c]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATS.map(c => (
          <TabsContent key={c} value={c} className="space-y-6 mt-4">
            {/* Templates section */}
            <section>
              <h2 className="text-base font-semibold mb-3">Templates</h2>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Create one to get started.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map(t => (
                    <div key={t.id} className="space-y-2">
                      <FeeTemplateRollup template={t} fees={studentFees} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignFor(t)}
                      >
                        Assign to members
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Individual fees section */}
            <section>
              <h2 className="text-base font-semibold mb-3">Individual fees</h2>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <Input
                  placeholder="Search by student or fee…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="sm:max-w-xs"
                  aria-label="Search fees"
                />
                <Select
                  value={statusFilter}
                  onValueChange={v => setStatusFilter(v as FeeStatusFilter)}
                >
                  <SelectTrigger className="sm:w-36" aria-label="Status filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportCsv} className="sm:ml-auto">
                  <Download className="h-4 w-4 mr-1.5" /> Export CSV
                </Button>
              </div>
              {selected.size > 0 && (
                <div className="flex items-center gap-3 mb-3 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                  <span>{selected.size} selected</span>
                  <Button
                    size="sm"
                    onClick={() => setBulkOpen(true)}
                    disabled={bulkFees.length === 0}
                  >
                    Mark {bulkFees.length} paid…
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
              {visibleFees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {studentFees.length === 0
                    ? 'No fee records in this category.'
                    : 'No fees match the current search or filter.'}
                </p>
              ) : (
                <div className="border rounded divide-y bg-card">
                  <label className="p-3 flex items-center gap-3 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={allShownSelected}
                      onCheckedChange={v => toggleAllShown(!!v)}
                      aria-label="Select all shown"
                    />
                    Select all shown ({visibleFees.length})
                  </label>
                  {visibleFees.map(f => {
                    const remaining = Number(f.amount) - Number(f.paid_amount ?? 0);
                    return (
                      <div
                        key={f.id}
                        className="p-3 flex items-center justify-between gap-3"
                      >
                        <Checkbox
                          checked={selected.has(f.id)}
                          onCheckedChange={v => toggleSelected(f.id, !!v)}
                          aria-label={`Select ${f.name} for ${f.user_profile?.full_name ?? 'member'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {f.user_profile?.full_name ?? '—'} · $
                            {Number(f.paid_amount ?? 0).toFixed(2)} / $
                            {Number(f.amount).toFixed(2)} · {f.status}
                          </div>
                        </div>
                        {remaining > 0 &&
                          f.status !== 'refunded' &&
                          f.status !== 'waived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() =>
                                setMarkPaidFor({ id: f.id, remaining })
                              }
                            >
                              Mark paid
                            </Button>
                          )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 h-11 w-11 text-muted-foreground"
                              aria-label={`Actions for ${f.name} for ${f.user_profile?.full_name ?? 'member'}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyPayLink(f.id, f.guest_pay_token)}
                            >
                              Copy pay link
                            </DropdownMenuItem>
                            {f.status !== 'waived' && f.status !== 'refunded' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setNoteAction({ type: 'waive', feeId: f.id, name: f.name })
                                }
                              >
                                Waive…
                              </DropdownMenuItem>
                            )}
                            {Number(f.paid_amount ?? 0) > 0 && f.status !== 'refunded' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setNoteAction({ type: 'refund', feeId: f.id, name: f.name })
                                }
                              >
                                Refund…
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  id: f.id,
                                  name: f.name,
                                  who: f.user_profile?.full_name ?? '—',
                                  paid: Number(f.paid_amount ?? 0),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <CreateFeeTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCategory={tab === 'all' ? undefined : (tab as FeeTemplate['category'])}
        onCreated={() => {
          reload();
          setCreateOpen(false);
        }}
      />

      {assignFor && (
        <FeeAssignDialog
          open={!!assignFor}
          onClose={() => setAssignFor(null)}
          templateId={assignFor.id}
          onAssigned={() => refetch()}
        />
      )}

      {markPaidFor && (
        <MarkPaidDialog
          open={!!markPaidFor}
          onClose={() => {
            setMarkPaidFor(null);
            refetch();
          }}
          feeId={markPaidFor.id}
          remainingAmount={markPaidFor.remaining}
        />
      )}

      {bulkOpen && (
        <MarkPaidDialog
          open={bulkOpen}
          onClose={() => {
            setBulkOpen(false);
            setSelected(new Set());
            refetch();
          }}
          bulkFees={bulkFees}
        />
      )}

      {noteAction && (
        <FeeNoteActionDialog
          open={!!noteAction}
          onClose={() => setNoteAction(null)}
          title={noteAction.type === 'waive' ? 'Waive this fee?' : 'Refund this fee?'}
          description={
            noteAction.type === 'waive'
              ? `${noteAction.name} will be marked waived — the student owes nothing and the record is kept.`
              : `${noteAction.name} will be refunded. Stripe payments are refunded to the card; cash/check refunds are recorded only.`
          }
          actionLabel={noteAction.type === 'waive' ? 'Waive fee' : 'Refund fee'}
          onSubmit={async note => {
            if (noteAction.type === 'waive') await waiveFee(noteAction.feeId, note);
            else await refundFee(noteAction.feeId, note);
            await refetch();
          }}
        />
      )}

      <NewIndividualFeeDialog
        open={newFeeOpen}
        onClose={() => setNewFeeOpen(false)}
        onCreated={() => refetch()}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fee?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium">{deleteTarget.name}</span> for{' '}
                  {deleteTarget.who} will be removed permanently. This cannot be undone.
                  {deleteTarget.paid > 0 && (
                    <>
                      {' '}
                      <strong>
                        ${deleteTarget.paid.toFixed(2)} has already been recorded as paid
                        against this fee — deleting it destroys that payment record.
                      </strong>{' '}
                      Refund or waive it instead if you need to keep the history.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteFee(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete fee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
