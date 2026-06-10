import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Users2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { Ensemble } from '@/types/programHealth';
import { EnsembleDrawer } from '@/components/admin/ensembles/EnsembleDrawer';

interface EnsembleRow extends Ensemble {
  member_count: number;
  director_count: number;
}

export default function EnsemblesPage() {
  const { enabled, isLoading: flagLoading } = useFeatureFlag('program_health');
  const [drawerEnsembleId, setDrawerEnsembleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: ensembles = [], isLoading } = useQuery({
    queryKey: ['ensembles'],
    enabled: enabled,
    queryFn: async (): Promise<EnsembleRow[]> => {
      const { data: ens, error } = await supabase
        .from('gw_ensembles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (ens ?? []).map((e: Ensemble) => e.id);
      if (ids.length === 0) return [];

      const [{ data: mems }, { data: dirs }] = await Promise.all([
        supabase.from('gw_ensemble_members').select('ensemble_id').in('ensemble_id', ids),
        supabase.from('gw_ensemble_directors').select('ensemble_id').in('ensemble_id', ids),
      ]);

      const memCounts = new Map<string, number>();
      (mems ?? []).forEach((r: { ensemble_id: string }) => {
        memCounts.set(r.ensemble_id, (memCounts.get(r.ensemble_id) ?? 0) + 1);
      });
      const dirCounts = new Map<string, number>();
      (dirs ?? []).forEach((r: { ensemble_id: string }) => {
        dirCounts.set(r.ensemble_id, (dirCounts.get(r.ensemble_id) ?? 0) + 1);
      });

      return (ens ?? []).map((e: Ensemble) => ({
        ...e,
        member_count: memCounts.get(e.id) ?? 0,
        director_count: dirCounts.get(e.id) ?? 0,
      }));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('gw_ensembles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (flagLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }
  if (!enabled) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ensembles</h1>
          <p className="text-muted-foreground">
            Choirs and groups in this program. Each ensemble has its own roster, directors,
            section targets, and (soon) stability score.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ensemble
            </Button>
          </DialogTrigger>
          <CreateEnsembleDialog onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading ensembles…</div>
      ) : ensembles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p>No ensembles yet. Create the first one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ensembles.map((e) => (
            <Card key={e.id} className={!e.is_active ? 'opacity-60' : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {e.name}
                      {!e.is_active && <Badge variant="secondary">Archived</Badge>}
                    </CardTitle>
                    {e.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {e.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{e.member_count}</strong> members
                  </span>
                  <span>
                    <strong className="text-foreground">{e.director_count}</strong> director
                    {e.director_count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={e.is_active}
                      onCheckedChange={(v) =>
                        toggleActive.mutate({ id: e.id, is_active: v })
                      }
                    />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrawerEnsembleId(e.id)}
                  >
                    Open
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EnsembleDrawer
        ensembleId={drawerEnsembleId}
        onClose={() => setDrawerEnsembleId(null)}
      />
    </div>
  );
}

function CreateEnsembleDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_ensembles').insert({
        name: name.trim(),
        description: description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensembles'] });
      toast.success('Ensemble created');
      setName('');
      setDescription('');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New ensemble</DialogTitle>
        <DialogDescription>
          You can add directors, members, and section targets after it's created.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="ens-name">Name</Label>
          <Input
            id="ens-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Concert Choir"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ens-desc">Description (optional)</Label>
          <Textarea
            id="ens-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Premier auditioned ensemble. Tuesdays + Thursdays 5pm."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending}
        >
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
