import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';
import type { TourStopFull } from './TourStopDetailDialog';

interface TourStopEditFormProps {
  stop: TourStopFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  busCompanies: { id: string; company_name: string }[];
}

export const TourStopEditForm = ({ stop, open, onOpenChange, onSaved, busCompanies }: TourStopEditFormProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<TourStopFull>>({});

  useEffect(() => {
    if (stop) setForm({ ...stop });
  }, [stop]);

  if (!stop) return null;

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...rest } = form;
      // Only send updatable fields
      const updateData: Record<string, any> = {};
      const fields = [
        'title', 'location', 'description', 'event_type', 'venue_name', 'venue_address',
        'venue_contact', 'venue_phone', 'venue_email', 'host_name', 'host_phone', 'host_email',
        'host_location', 'concert_type', 'concert_time', 'travel_from', 'travel_to',
        'travel_distance_miles', 'travel_duration_hours', 'departure_time', 'arrival_time',
        'bus_company_id', 'driver_notes', 'driver_hours_before', 'lodging_name', 'lodging_address',
        'lodging_phone', 'meal_info', 'notes', 'honorarium_amount'
      ];
      for (const f of fields) {
        if (f in form) {
          const val = (form as any)[f];
          updateData[f] = val === '' ? null : val;
        }
      }

      const { error } = await supabase
        .from('gw_tour_events')
        .update(updateData)
        .eq('id', stop.id);

      if (error) throw error;
      toast({ title: 'Saved', description: 'Tour stop updated successfully' });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{title}</h4>
      {children}
      <Separator />
    </div>
  );

  const Field = ({ label, field, type = 'text', placeholder }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(form as any)[field] || ''}
        onChange={e => update(field, type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Edit Tour Stop: {stop.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-5 py-2">
            {/* Basic Info */}
            <Section title="Basic Info">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" field="title" />
                <Field label="Location" field="location" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Event Type</Label>
                  <Select value={form.event_type || ''} onValueChange={v => update('event_type', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="free">Free Day</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="rehearsal">Rehearsal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Concert Type" field="concert_type" placeholder="e.g. Sacred, Secular, Mixed" />
              </div>
              <Field label="Concert Time" field="concert_time" placeholder="e.g. 7:00 PM" />
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description || ''} onChange={e => update('description', e.target.value)} className="text-sm min-h-[60px]" />
              </div>
            </Section>

            {/* Venue */}
            <Section title="Venue Details">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Venue Name" field="venue_name" />
                <Field label="Venue Address" field="venue_address" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Contact Person" field="venue_contact" />
                <Field label="Phone" field="venue_phone" />
                <Field label="Email" field="venue_email" />
              </div>
              <Field label="Honorarium ($)" field="honorarium_amount" type="number" />
            </Section>

            {/* Host */}
            <Section title="Host Information">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Host Name" field="host_name" />
                <Field label="Host Location" field="host_location" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" field="host_phone" />
                <Field label="Email" field="host_email" />
              </div>
            </Section>

            {/* Travel */}
            <Section title="Travel & Transportation">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Travel From" field="travel_from" placeholder="Departing city" />
                <Field label="Travel To" field="travel_to" placeholder="Arriving city" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Distance (miles)" field="travel_distance_miles" type="number" />
                <Field label="Drive Time (hours)" field="travel_duration_hours" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Departure Time" field="departure_time" type="datetime-local" />
                <Field label="Arrival Time" field="arrival_time" type="datetime-local" />
              </div>
            </Section>

            {/* Bus & Driver */}
            <Section title="Bus & Driver Utilization">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bus Company</Label>
                  <Select value={form.bus_company_id || ''} onValueChange={v => update('bus_company_id', v || null)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {busCompanies.map(bc => (
                        <SelectItem key={bc.id} value={bc.id}>{bc.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Driver Hours Before This Leg" field="driver_hours_before" type="number" placeholder="Cumulative hours" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Driver Notes</Label>
                <Textarea value={form.driver_notes || ''} onChange={e => update('driver_notes', e.target.value)} className="text-sm min-h-[60px]" placeholder="Rest requirements, driver swap notes, etc." />
              </div>
              {/* Live utilization preview */}
              {((form.travel_duration_hours || 0) > 0 || (form.driver_hours_before || 0) > 0) && (
                <div className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Driver Utilization Preview</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>Total: {((form.driver_hours_before || 0) + (form.travel_duration_hours || 0)).toFixed(1)}h / 10h</span>
                    <span className={((form.driver_hours_before || 0) + (form.travel_duration_hours || 0)) > 10 ? 'text-destructive font-bold' : 'text-emerald-600'}>
                      {((form.driver_hours_before || 0) + (form.travel_duration_hours || 0)) > 10 ? '⚠️ OVER LIMIT' : '✓ OK'}
                    </span>
                  </div>
                </div>
              )}
            </Section>

            {/* Lodging */}
            <Section title="Lodging">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hotel Name" field="lodging_name" />
                <Field label="Phone" field="lodging_phone" />
              </div>
              <Field label="Address" field="lodging_address" />
            </Section>

            {/* Additional */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Additional</h4>
              <Field label="Meal Info" field="meal_info" placeholder="Meal arrangements" />
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} className="text-sm min-h-[60px]" />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="px-6 py-4 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
