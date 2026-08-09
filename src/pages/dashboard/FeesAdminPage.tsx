import { useEffect, useState } from 'react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

const CATS = ['all', 'dues', 'wardrobe', 'trip', 'travel', 'other'] as const;
type Cat = (typeof CATS)[number];

const CAT_LABELS: Record<Cat, string> = {
  all: 'All',
  dues: 'Dues',
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
  const { studentFees, refetch, deleteFee } = useFeesManagement();

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

  const visibleFees =
    tab === 'all'
      ? studentFees
      : studentFees.filter(f => f.category === tab);

  return (
    <DashboardPageShell
      title="Fees"
      subtitle="Manage fee templates, assignments, and payments across all categories."
      actions={
        <Button onClick={() => setCreateOpen(true)}>+ New template</Button>
      }
    >
      <StoreConnectPrompt returnPath="/dashboard/fees" moneyLabel="Student fee payments" />
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
                      <FeeTemplateRollup template={t} />
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
              {visibleFees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fee records in this category.
                </p>
              ) : (
                <div className="border rounded divide-y bg-card">
                  {visibleFees.map(f => {
                    const remaining = Number(f.amount) - Number(f.paid_amount ?? 0);
                    return (
                      <div
                        key={f.id}
                        className="p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 h-11 w-11 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${f.name} for ${f.user_profile?.full_name ?? 'member'}`}
                          onClick={() =>
                            setDeleteTarget({
                              id: f.id,
                              name: f.name,
                              who: f.user_profile?.full_name ?? '—',
                              paid: Number(f.paid_amount ?? 0),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
