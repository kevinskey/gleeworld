// Auctions — admin. Curating the houses and the sales they run. Platform
// staff only: the auction tables are global reference data, so RLS refuses
// writes from anyone else and the page self-gates to match.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Gavel, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRole } from '@/hooks/useUserRole';
import { INGEST_METHOD_LABELS, type AuctionSource, type AuctionWithSource } from '@/lib/auctions/types';
import type { SourceInput } from '@/lib/auctions/sourcesApi';
import type { AuctionInput } from '@/lib/auctions/auctionsApi';
import { AuctionDialog } from './components/AuctionDialog';
import { SourceDialog } from './components/SourceDialog';
import { useAuctionMutations, useAuctions, useAuctionSources, useSourceMutations } from './hooks';

type PendingDelete =
  | { kind: 'source'; id: string; label: string }
  | { kind: 'auction'; id: string; label: string };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AuctionsAdminPage() {
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const { data: sources = [], isLoading: sourcesLoading } = useAuctionSources(true);
  const { data: auctions = [], isLoading: auctionsLoading } = useAuctions({ lookbackDays: 3650 });
  const sourceMutations = useSourceMutations();
  const auctionMutations = useAuctionMutations();

  const [sourceDialog, setSourceDialog] = useState<{ open: boolean; source: AuctionSource | null }>(
    { open: false, source: null },
  );
  const [auctionDialog, setAuctionDialog] = useState<{ open: boolean; auction: AuctionWithSource | null }>(
    { open: false, auction: null },
  );
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  if (roleLoading) {
    return (
      <DashboardPageShell title="Auctions" icon={Gavel}>
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </DashboardPageShell>
    );
  }

  if (!isSuperAdmin()) {
    return (
      <DashboardPageShell title="Auctions" icon={Gavel}>
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            The auction calendar is curated centrally, so only platform staff can edit houses and sales.
          </p>
          <Button variant="outline" asChild>
            <Link to="/auctions">Back to the calendar</Link>
          </Button>
        </Card>
      </DashboardPageShell>
    );
  }

  function saveSource(input: SourceInput) {
    const existing = sourceDialog.source;
    const mutation = existing ? sourceMutations.update : sourceMutations.create;
    const args = existing ? { id: existing.id, patch: input } : input;
    (mutation.mutate as (v: unknown) => void)(args);
    setSourceDialog({ open: false, source: null });
  }

  function saveAuction(input: AuctionInput) {
    const existing = auctionDialog.auction;
    const mutation = existing ? auctionMutations.update : auctionMutations.create;
    const args = existing ? { id: existing.id, patch: input } : input;
    (mutation.mutate as (v: unknown) => void)(args);
    setAuctionDialog({ open: false, auction: null });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'source') sourceMutations.remove.mutate(pendingDelete.id);
    else auctionMutations.remove.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <DashboardPageShell
      title="Manage auctions"
      icon={Gavel}
      eyebrow="Equipment"
      subtitle="Curate the auction houses and the sales that appear on everyone's calendar."
      maxWidth="7xl"
      actions={
        <Button variant="outline" asChild>
          <Link to="/auctions">View the calendar</Link>
        </Button>
      }
    >
      <Tabs defaultValue="auctions">
        <TabsList>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
          <TabsTrigger value="sources">Auction houses</TabsTrigger>
        </TabsList>

        <TabsContent value="auctions" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setAuctionDialog({ open: true, auction: null })}
              disabled={sources.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" /> Add auction
            </Button>
          </div>

          {sources.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Add an auction house first — every sale belongs to one.
              </p>
            </Card>
          ) : auctionsLoading ? (
            <p className="text-sm text-muted-foreground py-8">Loading auctions…</p>
          ) : auctions.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No auctions on the calendar yet.</p>
              <Button variant="outline" onClick={() => setAuctionDialog({ open: true, auction: null })}>
                <Plus className="w-4 h-4 mr-2" /> Add the first auction
              </Button>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>House</TableHead>
                      <TableHead>Opens</TableHead>
                      <TableHead>Catalog</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auctions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-medium">{a.title}</TableCell>
                        <TableCell className="text-xs">{a.source?.name ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(a.opens_at)}</TableCell>
                        <TableCell className="text-xs">{formatDate(a.catalog_released_at)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuctionDialog({ open: true, auction: a })}
                            aria-label={`Edit ${a.title}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete({ kind: 'auction', id: a.id, label: a.title })}
                            aria-label={`Delete ${a.title}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setSourceDialog({ open: true, source: null })}>
              <Plus className="w-4 h-4 mr-2" /> Add house
            </Button>
          </div>

          {sourcesLoading ? (
            <p className="text-sm text-muted-foreground py-8">Loading auction houses…</p>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Listings from</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Last checked</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((s) => (
                      <TableRow key={s.id} className={s.active ? undefined : 'opacity-60'}>
                        <TableCell className="text-xs font-medium">
                          {s.name}
                          {!s.active && <span className="ml-2 text-muted-foreground">(hidden)</span>}
                        </TableCell>
                        <TableCell className="text-xs">{INGEST_METHOD_LABELS[s.ingest_method]}</TableCell>
                        <TableCell className="text-xs">
                          {s.buyer_premium_pct === null ? 'Not confirmed' : `${s.buyer_premium_pct}%`}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(s.last_refreshed_at)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sourceMutations.markRefreshed.mutate(s.id)}
                            aria-label={`Mark ${s.name} as checked just now`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSourceDialog({ open: true, source: s })}
                            aria-label={`Edit ${s.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete({ kind: 'source', id: s.id, label: s.name })}
                            aria-label={`Delete ${s.name}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SourceDialog
        open={sourceDialog.open}
        onOpenChange={(open) => setSourceDialog((s) => ({ ...s, open }))}
        source={sourceDialog.source}
        onSubmit={saveSource}
        saving={sourceMutations.create.isPending || sourceMutations.update.isPending}
      />

      <AuctionDialog
        open={auctionDialog.open}
        onOpenChange={(open) => setAuctionDialog((s) => ({ ...s, open }))}
        auction={auctionDialog.auction}
        sources={sources}
        onSubmit={saveAuction}
        saving={auctionMutations.create.isPending || auctionMutations.update.isPending}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === 'source'
                ? 'This removes the house and every auction filed under it, for every tenant. This cannot be undone.'
                : 'This removes the auction from everyone\'s calendar. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
