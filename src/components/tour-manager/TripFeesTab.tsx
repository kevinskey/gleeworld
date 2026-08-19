import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { useFeesManagement } from '@/hooks/useFeesManagement';
import { CreateFeeTemplateDialog } from '@/components/fees/CreateFeeTemplateDialog';
import { FeeAssignDialog } from '@/components/fees/FeeAssignDialog';
import { FeeTemplateRollup } from '@/components/fees/FeeTemplateRollup';

/**
 * TripFeesTab
 *
 * Mounts on the Tour Manager sidebar as a "Fees" section.
 * Fetches the active tour from gw_tours, then:
 *  - Lists fee templates scoped to context_type='trip' + context_id=<tourId>
 *  - Shows a FeeTemplateRollup per template
 *  - "+ New trip fee" opens CreateFeeTemplateDialog pre-seeded with the trip context
 *  - "Assign to attendees" opens FeeAssignDialog restricted to confirmed tour roster members
 */
export function TripFeesTab() {
  const { listTemplates } = useFeeTemplates();
  // The rollups derive from these. This tab had the same staleness bug as
  // the Fees admin page: the card fetched once per template id and never
  // updated after an assignment.
  const { studentFees, refetch: refetchFees } = useFeesManagement();
  const [tourId, setTourId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [loadingTour, setLoadingTour] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<FeeTemplate | null>(null);

  // Resolve the active tour once on mount
  useEffect(() => {
    (async () => {
      const { data: tours } = await supabase
        .from('gw_tours')
        .select('id')
        .in('status', ['active', 'planning', 'draft'])
        .order('start_date', { ascending: true })
        .limit(1);
      const id = tours?.[0]?.id ?? null;
      setTourId(id);
      setLoadingTour(false);
    })();
  }, []);

  // Load fee templates scoped to this tour whenever tourId is known
  const reload = async (id: string) => {
    const tpls = await listTemplates({ contextType: 'trip', contextId: id });
    setTemplates(tpls);
  };

  // Load tour roster (confirmed members) as the attendee restrict list
  const loadAttendees = async () => {
    const { data } = await supabase
      .from('gw_tour_roster')
      .select('user_id')
      .eq('status', 'confirmed');
    setAttendeeIds((data ?? []).map(r => r.user_id));
  };

  useEffect(() => {
    if (!tourId) return;
    reload(tourId);
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  if (loadingTour) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tour…
      </div>
    );
  }

  if (!tourId) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        No active tour found. Create a tour first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-base">Trip fees</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          + New trip fee
        </Button>
      </div>

      <div className="grid gap-3">
        {templates.map(t => (
          <div key={t.id} className="space-y-2">
            <FeeTemplateRollup template={t} fees={studentFees} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignFor(t)}
            >
              Assign to attendees ({attendeeIds.length})
            </Button>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-muted-foreground text-sm py-6 text-center">
            No fees yet for this trip. Click "+ New trip fee" to create one.
          </div>
        )}
      </div>

      <CreateFeeTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCategory="trip"
        contextType="trip"
        contextId={tourId}
        onCreated={() => reload(tourId)}
      />

      {assignFor && (
        <FeeAssignDialog
          open={!!assignFor}
          onClose={() => setAssignFor(null)}
          templateId={assignFor.id}
          restrictToUserIds={attendeeIds}
          onAssigned={() => {
            reload(tourId);
            refetchFees();
            setAssignFor(null);
          }}
        />
      )}
    </div>
  );
}
