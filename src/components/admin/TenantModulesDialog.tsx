// Turn opt-in modules on and off for one tenant.
//
// Most modules are universal during the free period and never appear here —
// only those flagged requires_opt_in, which exist because they are relevant
// to a handful of tenants and noise for the rest (Auctions being the first).
// Writes are platform-staff only, enforced by RLS on gw_tenant_module_optins.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface OptInModule {
  id: string;
  name: string;
  description: string | null;
}

interface TenantModulesDialogProps {
  tenant: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantModulesDialog({ tenant, open, onOpenChange }: TenantModulesDialogProps) {
  const queryClient = useQueryClient();

  const { data: modules = [], isLoading: modulesLoading } = useQuery<OptInModule[]>({
    queryKey: ['opt-in-modules'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_billing_modules')
        .select('id, name, description')
        .eq('requires_opt_in', true)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as OptInModule[];
    },
  });

  const { data: enabledIds = new Set<string>(), isLoading: optInsLoading } = useQuery<Set<string>>({
    queryKey: ['tenant-module-optins', tenant?.id],
    enabled: open && Boolean(tenant?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenant_module_optins')
        .select('module_id, enabled')
        .eq('tenant_id', tenant!.id);
      if (error) throw error;
      return new Set(
        (data ?? [])
          .filter((r: { enabled: boolean }) => r.enabled)
          .map((r: { module_id: string }) => r.module_id),
      );
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ moduleId, on }: { moduleId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from('gw_tenant_module_optins')
          .upsert(
            { tenant_id: tenant!.id, module_id: moduleId, enabled: true },
            { onConflict: 'tenant_id,module_id' },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_tenant_module_optins')
          .delete()
          .eq('tenant_id', tenant!.id)
          .eq('module_id', moduleId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { on }) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-module-optins', tenant?.id] });
      // The tenant's own sidebar reads this view; bust it so a change shows up
      // without a full reload if the platform owner is viewing that tenant.
      queryClient.invalidateQueries({ queryKey: ['v_tenant_active_modules'] });
      toast.success(on ? 'Module turned on for this tenant' : 'Module turned off for this tenant');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Could not change that module', { description: message });
    },
  });

  const loading = modulesLoading || optInsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="min-w-0">
          <DialogHeader>
            <DialogTitle>Modules for {tenant?.name}</DialogTitle>
            <DialogDescription>
              These are the specialised modules that are off by default. Everything else is
              already available to every tenant during the free period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading modules…
              </p>
            ) : modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No opt-in modules exist yet. A module becomes one by setting
                <code className="mx-1 text-xs">requires_opt_in</code> on its catalog row.
              </p>
            ) : (
              modules.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor={`module-${m.id}`} className="font-medium">{m.name}</Label>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`module-${m.id}`}
                    className="shrink-0 mt-1"
                    checked={enabledIds.has(m.id)}
                    disabled={toggle.isPending}
                    onCheckedChange={(on) => toggle.mutate({ moduleId: m.id, on })}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
