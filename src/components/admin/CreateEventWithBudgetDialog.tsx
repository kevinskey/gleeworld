import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, DollarSign, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBudgets } from "@/hooks/useBudgets";

interface CreateEventWithBudgetDialogProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export const CreateEventWithBudgetDialog = ({ onSuccess, triggerButton }: CreateEventWithBudgetDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createBudget } = useBudgets();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    event_type: 'performance',
    start_date: '',
    end_date: '',
    location: '',
    expected_headcount: '',
  });
  const [budgetData, setBudgetData] = useState({
    title: '',
    description: '',
    total_amount: '',
    budget_type: 'event' as const,
    start_date: '',
    end_date: '',
  });

  const handleEventDataChange = (field: string, value: string) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-sync budget data
    if (field === 'title') {
      setBudgetData(prev => ({
        ...prev,
        title: `${value} Budget`
      }));
    }
    if (field === 'start_date') {
      setBudgetData(prev => ({
        ...prev,
        start_date: value
      }));
    }
    if (field === 'end_date') {
      setBudgetData(prev => ({
        ...prev,
        end_date: value
      }));
    }
  };

  const handleBudgetDataChange = (field: string, value: string) => {
    setBudgetData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First create the event
      const { data: eventResult, error: eventError } = await supabase
        .from('gw_events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type,
          start_date: eventData.start_date,
          end_date: eventData.end_date || null,
          location: eventData.location,
          max_attendees: eventData.expected_headcount ? parseInt(eventData.expected_headcount) : null,
          created_by: user.id,
          status: 'scheduled'
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Then create the budget linked to the event
      const budgetPayload = {
        title: budgetData.title,
        description: budgetData.description,
        total_amount: parseFloat(budgetData.total_amount) || 0,
        allocated_amount: parseFloat(budgetData.total_amount) || 0,
        budget_type: budgetData.budget_type,
        start_date: budgetData.start_date,
        end_date: budgetData.end_date || null,
        event_id: eventResult.id,
        status: 'active' as const
      };

      const budgetResult = await createBudget(budgetPayload);
      
      if (budgetResult) {
        toast({
          title: "Success!",
          description: `Event "${eventData.title}" created with budget successfully!`,
        });
        
        setOpen(false);
        setStep(1);
        setEventData({
          title: '',
          description: '',
          event_type: 'performance',
          start_date: '',
          end_date: '',
          location: '',
          expected_headcount: '',
        });
        setBudgetData({
          title: '',
          description: '',
          total_amount: '',
          budget_type: 'event' as const,
          start_date: '',
          end_date: '',
        });
        
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error creating event with budget:', error);
      toast({
        title: "Error",
        description: "Failed to create event with budget",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = eventData.title && eventData.start_date && eventData.location;
  const isStep2Valid = budgetData.title && budgetData.total_amount && budgetData.start_date;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Event with Budget
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Event with Budget
          </DialogTitle>
          <DialogDescription>
            Create a new event and its associated budget in one streamlined process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              step === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">1. Event Details</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              step === 2 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">2. Budget Setup</span>
            </div>
          </div>

          {/* Step 1: Event Details */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Details
                </CardTitle>
                <CardDescription>
                  Basic information about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={eventData.title}
                      onChange={(e) => handleEventDataChange('title', e.target.value)}
                      placeholder="Enter event title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select value={eventData.event_type} onValueChange={(value) => handleEventDataChange('event_type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="rehearsal">Rehearsal</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="social">Social Event</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventData.description}
                    onChange={(e) => handleEventDataChange('description', e.target.value)}
                    placeholder="Describe your event"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={eventData.start_date}
                      onChange={(e) => handleEventDataChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={eventData.end_date}
                      onChange={(e) => handleEventDataChange('end_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={eventData.location}
                      onChange={(e) => handleEventDataChange('location', e.target.value)}
                      placeholder="Event location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_headcount">Expected Attendees</Label>
                    <Input
                      id="expected_headcount"
                      type="number"
                      value={eventData.expected_headcount}
                      onChange={(e) => handleEventDataChange('expected_headcount', e.target.value)}
                      placeholder="Number of attendees"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Budget Setup */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Setup
                </CardTitle>
                <CardDescription>
                  Financial planning for your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_title">Budget Title *</Label>
                    <Input
                      id="budget_title"
                      value={budgetData.title}
                      onChange={(e) => handleBudgetDataChange('title', e.target.value)}
                      placeholder="Budget title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_amount">Total Budget Amount *</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={budgetData.total_amount}
                      onChange={(e) => handleBudgetDataChange('total_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_description">Budget Description</Label>
                  <Textarea
                    id="budget_description"
                    value={budgetData.description}
                    onChange={(e) => handleBudgetDataChange('description', e.target.value)}
                    placeholder="Describe budget purpose and scope"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_start_date">Budget Start Date *</Label>
                    <Input
                      id="budget_start_date"
                      type="date"
                      value={budgetData.start_date}
                      onChange={(e) => handleBudgetDataChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_end_date">Budget End Date</Label>
                    <Input
                      id="budget_end_date"
                      type="date"
                      value={budgetData.end_date}
                      onChange={(e) => handleBudgetDataChange('end_date', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {step === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              {step === 1 && (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                >
                  Next: Budget Setup
                </Button>
              )}
              {step === 2 && (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStep2Valid || loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Event & Budget
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};