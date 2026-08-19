// K12SlipNotice — explains why no permission slips appeared.
//
// gw_create_permission_slip_for_roster only creates slips when
// gw_branding_settings.k12_ensemble is true. When the flag is off, adding
// students to a roster produces no slips AND no error — the trigger returns
// early and the page simply stays empty, which reads as a broken feature.
//
// The trigger is also AFTER INSERT, so turning the flag on later does not
// backfill anyone already on the roster. That's the second half of the message:
// existing roster members need slips generating explicitly.

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function K12SlipNotice() {
  const { data: k12Enabled, isLoading } = useQuery({
    queryKey: ['k12-ensemble-flag'],
    queryFn: async () => {
      // limit(1) before maybeSingle(): RLS should scope this to one row per
      // tenant, but maybeSingle() throws outright on more than one, and this
      // table has been left with stray rows before. A banner must never be the
      // thing that breaks the page.
      const { data } = await supabase
        .from('gw_branding_settings')
        .select('k12_ensemble')
        .limit(1)
        .maybeSingle();
      return !!data?.k12_ensemble;
    },
  });

  // Silent while loading, and silent when the flag is on — a banner that says
  // "everything is fine" is noise on every visit.
  if (isLoading || k12Enabled !== false) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-foreground">
          Permission slips are not being created for this workspace
        </p>
        <p className="text-muted-foreground mt-1">
          Slips are generated automatically only for K–12 ensembles. Turn on
          <span className="font-medium text-foreground"> K–12 ensemble </span>
          in Workspace Settings to start creating them when students are added
          to a travel roster.
        </p>
        <p className="text-muted-foreground mt-1">
          Students already on a roster won&apos;t get one retroactively — generate
          theirs from the roster once the setting is on.
        </p>
      </div>
    </div>
  );
}
