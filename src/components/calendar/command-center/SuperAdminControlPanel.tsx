import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Settings2, Clock, Briefcase, Plus, Edit, Trash2, Edit2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentProvider, useProviderAvailability, useUpdateProviderAvailability, useDeleteProviderAvailability, ProviderAvailability } from "@/hooks/useServiceProviders";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";

type ActiveTab = "availability" | "services";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

/* ── Compact Availability Panel ── */
const CompactAvailabilityPanel = () => {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: availability = [] } = useProviderAvailability(provider?.id);
  const updateMutation = useUpdateProviderAvailability();
  const deleteMutation = useDeleteProviderAvailability();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ProviderAvailability | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    break_between_slots_minutes: 15,
    is_available: true,
  });

  const resetForm = () => {
    setFormData({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, break_between_slots_minutes: 15, is_available: true });
    setEditingSlot(null);
  };

  const handleSubmit = async () => {
    if (!provider) return;
    try {
      await updateMutation.mutateAsync({
        ...(editingSlot?.id && { id: editingSlot.id }),
        provider_id: provider.id,
        ...formData,
      });
      toast({ title: "Success", description: editingSlot ? "Updated" : "Added" });
      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  };

  const handleEdit = (slot: ProviderAvailability) => {
    setEditingSlot(slot);
    setFormData({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      slot_duration_minutes: slot.slot_duration_minutes,
      break_between_slots_minutes: slot.break_between_slots_minutes,
      is_available: slot.is_available,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (providerLoading) return <p className="text-xs py-3 text-center" style={{ color: '#64748b' }}>Loading...</p>;
  if (!provider) return <p className="text-xs py-3 text-center" style={{ color: '#64748b' }}>No provider profile found.</p>;

  const grouped = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: availability.filter(s => s.day_of_week === day.value),
  })).filter(d => d.slots.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>Weekly Schedule</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={resetForm}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle style={{ color: '#0f172a' }}>{editingSlot ? 'Edit' : 'Add'} Availability</DialogTitle>
              <DialogDescription>Set working hours for a day</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={formData.day_of_week.toString()} onValueChange={v => setFormData(p => ({ ...p, day_of_week: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Start</Label><Input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} /></div>
                <div><Label className="text-xs">End</Label><Input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Slot (min)</Label><Input type="number" value={formData.slot_duration_minutes} onChange={e => setFormData(p => ({ ...p, slot_duration_minutes: parseInt(e.target.value) }))} /></div>
                <div><Label className="text-xs">Break (min)</Label><Input type="number" value={formData.break_between_slots_minutes} onChange={e => setFormData(p => ({ ...p, break_between_slots_minutes: parseInt(e.target.value) }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_available} onCheckedChange={c => setFormData(p => ({ ...p, is_available: c }))} />
                <Label className="text-xs">Available</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={updateMutation.isPending}>{editingSlot ? 'Update' : 'Add'}</Button>
                <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {grouped.length === 0 ? (
        <p className="text-xs py-2 text-center" style={{ color: '#64748b' }}>No availability set</p>
      ) : (
        <div className="space-y-1.5">
          {grouped.map(day => (
            <div key={day.value} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>{day.label}</div>
              {day.slots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", slot.is_available ? "bg-green-500" : "bg-red-500")} />
                    <span style={{ color: '#334155' }}>{slot.start_time} – {slot.end_time}</span>
                    <span style={{ color: '#94a3b8' }}>{slot.slot_duration_minutes}m</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(slot)} className="p-1 rounded hover:bg-slate-100"><Edit2 className="h-3 w-3" style={{ color: '#64748b' }} /></button>
                    <button onClick={() => handleDelete(slot.id)} className="p-1 rounded hover:bg-slate-100"><Trash2 className="h-3 w-3" style={{ color: '#64748b' }} /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Compact Services Panel ── */
interface AppointmentService {
  id: string; name: string; description: string; default_duration_minutes: number; color: string; is_active: boolean;
  location?: string; instructor?: string; price_display?: string; category?: string;
}

const CompactServicesPanel = () => {
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', default_duration_minutes: 30, color: '#6366F1', location: '', instructor: '', price_display: 'Free', category: 'general' });

  const fetchServices = async () => {
    const { data } = await supabase.from('gw_appointment_services').select('*').order('name');
    setServices(data || []);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await supabase.from('gw_appointment_services').update(formData).eq('id', editingService.id);
        sonnerToast.success('Updated');
      } else {
        await supabase.from('gw_appointment_services').insert([formData]);
        sonnerToast.success('Created');
      }
      setIsDialogOpen(false);
      setEditingService(null);
      fetchServices();
    } catch {
      sonnerToast.error('Failed to save');
    }
  };

  const handleEdit = (s: AppointmentService) => {
    setEditingService(s);
    setFormData({ name: s.name, description: s.description || '', default_duration_minutes: s.default_duration_minutes, color: s.color, location: s.location || '', instructor: s.instructor || '', price_display: s.price_display || 'Free', category: s.category || 'general' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this service?')) return;
    await supabase.from('gw_appointment_services').update({ is_active: false }).eq('id', id);
    sonnerToast.success('Deactivated');
    fetchServices();
  };

  const colors = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#3B82F6'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>Appointment Services</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditingService(null); setFormData({ name: '', description: '', default_duration_minutes: 30, color: '#6366F1', location: '', instructor: '', price_display: 'Free', category: 'general' }); }}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle style={{ color: '#0f172a' }}>{editingService ? 'Edit' : 'Create'} Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label className="text-xs">Name</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><Label className="text-xs">Description</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Duration (min)</Label><Input type="number" value={formData.default_duration_minutes} onChange={e => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) })} /></div>
                <div><Label className="text-xs">Price Display</Label><Input value={formData.price_display} onChange={e => setFormData({ ...formData, price_display: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Location</Label><Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
                <div><Label className="text-xs">Instructor</Label><Input value={formData.instructor} onChange={e => setFormData({ ...formData, instructor: e.target.value })} /></div>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex gap-1.5 mt-1">
                  {colors.map(c => (
                    <button key={c} type="button" className={cn("w-6 h-6 rounded-full border-2", formData.color === c ? "border-slate-800" : "border-transparent")} style={{ backgroundColor: c }} onClick={() => setFormData({ ...formData, color: c })} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">{editingService ? 'Update' : 'Create'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.filter(s => s.is_active).length === 0 ? (
        <p className="text-xs py-2 text-center" style={{ color: '#64748b' }}>No services configured</p>
      ) : (
        <div className="space-y-1.5">
          {services.filter(s => s.is_active).map(s => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-2 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-medium truncate" style={{ color: '#0f172a' }}>{s.name}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4"><Clock className="h-2.5 w-2.5 mr-0.5" />{s.default_duration_minutes}m</Badge>
                  {s.price_display && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{s.price_display}</Badge>}
                </div>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={() => handleEdit(s)} className="p-1 rounded hover:bg-slate-100"><Edit className="h-3 w-3" style={{ color: '#64748b' }} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-slate-100"><Trash2 className="h-3 w-3" style={{ color: '#64748b' }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Panel ── */
export const SuperAdminControlPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("availability");

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 border-b border-slate-200 text-sm font-semibold transition-colors",
            isOpen ? "bg-slate-100" : "bg-white hover:bg-slate-50"
          )}
          style={{ color: '#0f172a' }}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" style={{ color: '#475569' }} />
            Availability & Services
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" style={{ color: '#475569' }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: '#475569' }} />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-b border-slate-200">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("availability")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "availability"
                  ? "border-b-2 border-[#003366] bg-slate-50"
                  : "hover:bg-slate-50"
              )}
              style={{ color: activeTab === "availability" ? '#003366' : '#64748b' }}
            >
              <Clock className="h-3.5 w-3.5" />
              Availability
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "services"
                  ? "border-b-2 border-[#003366] bg-slate-50"
                  : "hover:bg-slate-50"
              )}
              style={{ color: activeTab === "services" ? '#003366' : '#64748b' }}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Services
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-[50vh]">
            <div className="p-3">
              {activeTab === "availability" ? <CompactAvailabilityPanel /> : <CompactServicesPanel />}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
