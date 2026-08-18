// Auctions — saved searches. Owner-private: these are only ever the signed-in
// user's own, enforced by RLS rather than by a filter here.
import { useState } from 'react';
import { Bell, BellOff, Gavel, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MODALITY_LABELS, NOTIFY_CHANNEL_LABELS, NOTIFY_FREQUENCY_LABELS,
  type Modality, type SavedSearch,
} from '@/lib/auctions/types';
import type { SavedSearchInput } from '@/lib/auctions/searchesApi';
import { AuctionsTabs } from './components/AuctionsTabs';
import { SavedSearchDialog } from './components/SavedSearchDialog';
import { useSavedSearches, useSavedSearchMutations } from './hooks';

// A plain-language rendering of the criteria JSONB, so someone can confirm at
// a glance that the search says what they meant.
function describeCriteria(search: SavedSearch): string[] {
  const c = search.criteria ?? {};
  const parts: string[] = [];

  if (c.modality?.length) {
    parts.push(c.modality.map((m) => MODALITY_LABELS[m as Modality] ?? m).join(' or '));
  }
  if (c.manufacturer?.length) parts.push(`by ${c.manufacturer.join(' or ')}`);
  if (c.model_contains) parts.push(`model contains "${c.model_contains}"`);
  if (c.year_min) parts.push(`${c.year_min} or newer`);
  if (c.max_hammer_cents) {
    parts.push(`bid under $${Math.round(c.max_hammer_cents / 100).toLocaleString()}`);
  }
  if (c.states?.length) parts.push(`in ${c.states.join(', ')}`);
  if (c.condition?.length) parts.push(`condition mentions ${c.condition.join(' or ')}`);

  return parts.length ? parts : ['Everything — no filters set'];
}

export default function SavedSearchesPage() {
  const { data: searches = [], isLoading } = useSavedSearches();
  const { create, update, remove } = useSavedSearchMutations();
  const [dialog, setDialog] = useState<{ open: boolean; search: SavedSearch | null }>(
    { open: false, search: null },
  );
  const [pendingDelete, setPendingDelete] = useState<SavedSearch | null>(null);

  function save(input: SavedSearchInput) {
    if (dialog.search) update.mutate({ id: dialog.search.id, patch: input });
    else create.mutate(input);
    setDialog({ open: false, search: null });
  }

  return (
    <DashboardPageShell
      title="Saved searches"
      icon={Gavel}
      eyebrow="Equipment"
      subtitle="Describe what you're hunting for and get told when it shows up."
      actions={
        <Button onClick={() => setDialog({ open: true, search: null })}>
          <Plus className="w-4 h-4 mr-2" /> New search
        </Button>
      }
    >
      <AuctionsTabs />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">Loading your searches…</p>
      ) : searches.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            You have no saved searches yet. Create one and you'll hear about matching lots as they
            appear, instead of checking every catalog by hand.
          </p>
          <Button variant="outline" onClick={() => setDialog({ open: true, search: null })}>
            <Plus className="w-4 h-4 mr-2" /> Create your first search
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <Card key={s.id} className={s.active ? undefined : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {s.name}
                      {!s.active && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {describeCriteria(s).join(' · ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      {s.notify_channel === 'none'
                        ? <BellOff className="w-4 h-4" />
                        : <Bell className="w-4 h-4" />}
                      {NOTIFY_CHANNEL_LABELS[s.notify_channel]}
                      {s.notify_channel !== 'none' &&
                        ` · ${NOTIFY_FREQUENCY_LABELS[s.notify_frequency].toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialog({ open: true, search: s })}
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(s)}
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SavedSearchDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        search={dialog.search}
        onSubmit={save}
        saving={create.isPending || update.isPending}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This also removes the matches it found. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
