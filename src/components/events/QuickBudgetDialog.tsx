import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBudgets } from "@/hooks/useBudgets";

interface UserEventOption {
  id: string;
  title: string;
  start_date: string;
}

interface QuickBudgetDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export const QuickBudgetDialog = ({ open: controlledOpen, onOpenChange, showTrigger = true }: QuickBudgetDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createBudget } = useBudgets();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(val);
    onOpenChange?.(val);
  };
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [events, setEvents] = useState<UserEventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    total_amount: "",
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Load profile id and user's events when dialog opens
  useEffect(() => {
    if (!isOpen || !user) return;
    const run = async () => {
      // Get profile id for this user
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const pid = profile?.id || null;
      setProfileId(pid);

      // Fetch events created by this profile
      if (pid) {
        const { data } = await supabase
          .from('gw_events')
          .select('id, title, start_date')
          .eq('created_by', pid)
          .order('start_date', { ascending: false })
          .limit(100);
        setEvents((data as any[])?.map(e => ({ id: e.id, title: e.title, start_date: e.start_date })) || []);
      } else {
        setEvents([]);
      }
    };
    run();
  }, [isOpen, user]);

  const eventOptions = useMemo(() => {
    return events.map(e => ({
      value: e.id,
      label: `${e.title} (${new Date(e.start_date).toLocaleDateString()})`
    }));
  }, [events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to create a budget.', variant: 'destructive' });
      return;
    }

    if (!form.title || !form.total_amount || !startDate) {
      toast({ title: 'Missing fields', description: 'Title, Total Amount, and Start Date are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = await createBudget({
        title: form.title,
        description: form.description || undefined,
        total_amount: parseFloat(form.total_amount),
        allocated_amount: parseFloat(form.total_amount),
        budget_type: 'event',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        status: 'active',
        event_id: selectedEventId || undefined,
      } as any);

      if (data) {
        toast({ title: 'Budget created', description: selectedEventId ? 'Linked to your event.' : 'You can link it to an event later.' });
        setOpen(false);
        // Reset
        setForm({ title: '', description: '', total_amount: '' });
        setStartDate(undefined);
        setEndDate(undefined);
        setSelectedEventId('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Plus className="h-4 w-4 mr-2" />
            Quick Budget
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick Budget</DialogTitle>
          <DialogDescription>Create a simple budget and link it to one of your events.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event (optional)</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder={profileId ? (eventOptions.length ? 'Select your event' : 'No events found') : 'Loading events...'} />
                </SelectTrigger>
                <SelectContent>
                  {eventOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Budget Title *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Fall Concert Budget" required />
            </div>

            <div className="space-y-2">
              <Label>Total Amount *</Label>
              <Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" required />
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}> 
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}> 
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this budget (optional)..." rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Budget'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
