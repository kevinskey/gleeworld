// CreateTripDialog — the only place a trip is deliberately created.
//
// Before this, the sole way to get a row into gw_tours was a side effect of
// AI Route Planner saving a route, which meant you couldn't start a trip
// without first planning a route for it.
//
// The ensemble picker is not optional dressing: gw_tours.course_id is NOT NULL
// (trips were deliberately made course-owned so Chamber Singers and Concert
// Choir can tour separately). Without a course chosen the insert fails, which
// is exactly the error AI Route Planner reports as "Open this Travel Manager
// from inside a course to create a new travel." When Travel Manager is embedded
// in a course we pin to it and hide the picker.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTourCourseId } from './TourCourseContext';
import { useActiveTrip } from './ActiveTripContext';

export function CreateTripDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const pinnedCourseId = useTourCourseId();
  const { setTripId, refetch } = useActiveTrip();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [description, setDescription] = useState('');

  const { data: courses = [] } = useQuery({
    queryKey: ['tm-trip-courses'],
    enabled: open && !pinnedCourseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses').select('id, title').order('title').limit(200);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const effectiveCourseId = pinnedCourseId ?? (courseId || null);
  // end_date is NOT NULL too, so an end is required, not merely nice to have.
  const canSave = name.trim() !== '' && startDate !== '' && endDate !== '' && !!effectiveCourseId;

  const reset = () => {
    setName(''); setStartDate(''); setEndDate(''); setCourseId(''); setDescription('');
  };

  const save = async () => {
    if (!canSave || !user) return;
    if (endDate < startDate) {
      toast.error('End date is before the start date.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('gw_tours').insert({
        name: name.trim(),
        description: description.trim() || null,
        status: 'planning',
        created_by: user.id,
        course_id: effectiveCourseId,
        start_date: startDate,
        end_date: endDate,
      }).select('id').single();

      if (error) {
        // Surface the real cause rather than a generic failure — a demo tenant
        // silently rejecting the write looks identical to a validation bug.
        if (error.message?.includes('course_id')) {
          throw new Error('Pick an ensemble for this trip — trips belong to a course.');
        }
        throw error;
      }

      toast.success(`"${name.trim()}" created`);
      reset();
      setOpen(false);
      await refetch();
      if (data?.id) setTripId(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create a Trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a trip</DialogTitle>
          <DialogDescription>
            Dates, roster, hotels and paperwork all hang off the trip you create here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="trip-name">Trip name</Label>
            <Input
              id="trip-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Spring Tour 2026" autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trip-start">Starts</Label>
              <Input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-end">Ends</Label>
              <Input id="trip-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {!pinnedCourseId && (
            <div className="space-y-1.5">
              <Label htmlFor="trip-course">Ensemble</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="trip-course">
                  <SelectValue placeholder="Which ensemble is touring?" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Trips belong to an ensemble, so two groups can tour separately.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="trip-desc">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="trip-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the team should know up front" rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!canSave || saving}>
            {saving ? 'Creating…' : 'Create trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
