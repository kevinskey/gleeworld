import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Upload, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEventBudgetWorksheet } from "@/hooks/useEventBudgetWorksheet";
import { useToast } from "@/hooks/use-toast";
import { BudgetTableWidget } from "./BudgetTableWidget";
import { BudgetSummaryCard } from "./BudgetSummaryCard";
import { BudgetAIHelper } from "./BudgetAIHelper";
import { FileUploadSection } from "./FileUploadSection";
import { BudgetTaskManagement } from "./BudgetTaskManagement";

interface EventBudgetWorksheetProps {
  eventId: string;
}

const EVENT_TYPES = [
  "Retreat",
  "Banquet", 
  "Workshop",
  "Pizza Party",
  "Meeting",
  "Social",
  "Other"
];

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

const STATUS_ICONS = {
  draft: Clock,
  pending_approval: AlertTriangle,
  approved: CheckCircle2,
  rejected: XCircle
};

export const EventBudgetWorksheet = ({ eventId }: EventBudgetWorksheetProps) => {
  const { toast } = useToast();
  const {
    eventBudget,
    foodBudget,
    materialsBudget,
    transportBudget,
    mediaBudget,
    promoBudget,
    attachments,
    users,
    teamMembers,
    loading,
    updateEventBudget,
    addFoodBudgetItem,
    addMaterialsBudgetItem,
    addTransportBudgetItem,
    addMediaBudgetItem,
    addPromoBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    uploadAttachment
  } = useEventBudgetWorksheet(eventId);

  const [formData, setFormData] = useState({
    event_name: "",
    event_type: "",
    event_date_start: "",
    event_date_end: "",
    location: "",
    coordinator_id: "",
    purpose: "",
    attendees: 0,
    volunteers: 0,
    guest_speakers: "",
    honoraria: 0,
    misc_supplies: 0,
    admin_fees: 0,
    contingency: 0,
    ticket_sales: 0,
    donations: 0,
    club_support: 0
  });

  const [showAIHelper, setShowAIHelper] = useState(false);

  useEffect(() => {
    if (eventBudget) {
      setFormData({
        event_name: eventBudget.event_name || eventBudget.title || "",
        event_type: eventBudget.event_type || "",
        event_date_start: eventBudget.event_date_start || eventBudget.start_date || "",
        event_date_end: eventBudget.event_date_end || eventBudget.end_date || "",
        location: eventBudget.location || "",
        coordinator_id: eventBudget.coordinator_id || "",
        purpose: eventBudget.purpose || "",
        attendees: eventBudget.attendees || 0,
        volunteers: eventBudget.volunteers || 0,
        guest_speakers: eventBudget.guest_speakers || "",
        honoraria: eventBudget.honoraria || 0,
        misc_supplies: eventBudget.misc_supplies || 0,
        admin_fees: eventBudget.admin_fees || 0,
        contingency: eventBudget.contingency || 0,
        ticket_sales: eventBudget.ticket_sales || 0,
        donations: eventBudget.donations || 0,
        club_support: eventBudget.club_support || 0
      });
    }
  }, [eventBudget]);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Auto-calculate contingency if it's 0
    const calculatedContingency = formData.contingency === 0 
      ? eventBudget?.total_expenses ? eventBudget.total_expenses * 0.10 : 0
      : formData.contingency;

    // Determine approval status
    const needsApproval = (eventBudget?.total_expenses || 0) > 500;
    const budget_status = needsApproval ? 'pending_approval' : 'approved';

    const updates = {
      ...formData,
      contingency: calculatedContingency,
      budget_status
    };

    const result = await updateEventBudget(updates);
    
    if (result && needsApproval && eventBudget?.budget_status !== 'pending_approval') {
      toast({
        title: "Approval Required",
        description: "Budget over $500 requires approval. Status changed to pending approval.",
        variant: "default",
      });
    }
  };

  const validateForm = () => {
    if (!formData.event_name) {
      toast({
        title: "Validation Error",
        description: "Please add an event name.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.purpose) {
      toast({
        title: "Validation Error",
        description: "Please add a purpose/goal for the event.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    await handleSave();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusDisplay = (status: string) => {
    const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
    return (
      <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {formData.event_name || "Event Budget Worksheet"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Non-Performance Event Budget Planning
          </p>
        </div>
        <div className="flex items-center gap-4">
          {eventBudget?.budget_status && getStatusDisplay(eventBudget.budget_status)}
          <Button onClick={() => setShowAIHelper(true)} variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI Helper
          </Button>
        </div>
      </div>

      {/* Validation Alert */}
      {eventBudget?.total_expenses && eventBudget.total_expenses > 500 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Budget over $500 requires approval. Current total: {formatCurrency(eventBudget.total_expenses)}
          </AlertDescription>
        </Alert>
      )}

      {/* Section 1: Event Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Event Overview</CardTitle>
          <CardDescription>Basic information about the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event_name">Event Name *</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => handleFormChange('event_name', e.target.value)}
                placeholder="e.g., Spring Retreat 2024"
                required
              />
            </div>
            <div>
              <Label htmlFor="event_type">Event Type *</Label>
              <Select value={formData.event_type} onValueChange={(value) => handleFormChange('event_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event_date_start">Start Date *</Label>
              <Input
                id="event_date_start"
                type="date"
                value={formData.event_date_start}
                onChange={(e) => handleFormChange('event_date_start', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="event_date_end">End Date</Label>
              <Input
                id="event_date_end"
                type="date"
                value={formData.event_date_end}
                onChange={(e) => handleFormChange('event_date_end', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location / Venue</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleFormChange('location', e.target.value)}
                placeholder="Event location"
              />
            </div>
            <div>
              <Label htmlFor="coordinator">Coordinator</Label>
              <Select value={formData.coordinator_id} onValueChange={(value) => handleFormChange('coordinator_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coordinator" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="purpose">Purpose / Goals *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => handleFormChange('purpose', e.target.value)}
              placeholder="Describe the purpose and goals of this event..."
              rows={3}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Participants & People */}
      <Card>
        <CardHeader>
          <CardTitle>Participants & People</CardTitle>
          <CardDescription>Expected attendance and staffing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="attendees">Expected Attendees</Label>
              <Input
                id="attendees"
                type="number"
                value={formData.attendees}
                onChange={(e) => handleFormChange('attendees', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="volunteers">Volunteers</Label>
              <Input
                id="volunteers"
                type="number"
                value={formData.volunteers}
                onChange={(e) => handleFormChange('volunteers', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="honoraria">Honoraria (total)</Label>
              <Input
                id="honoraria"
                type="number"
                step="0.01"
                value={formData.honoraria}
                onChange={(e) => handleFormChange('honoraria', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guest_speakers">Guest Speakers</Label>
            <Textarea
              id="guest_speakers"
              value={formData.guest_speakers}
              onChange={(e) => handleFormChange('guest_speakers', e.target.value)}
              placeholder="List any guest speakers or special guests..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Food & Hospitality */}
      <BudgetTableWidget
        title="Food & Hospitality"
        description="Food, beverages, and hospitality costs"
        items={foodBudget}
        onAddItem={addFoodBudgetItem}
        onUpdateItem={(id, updates) => updateBudgetItem('food_budget', id, updates)}
        onDeleteItem={(id) => deleteBudgetItem('food_budget', id)}
        columns={[
          { key: 'item', label: 'Item', type: 'text', placeholder: 'e.g., Pizza' },
          { key: 'qty', label: 'Quantity', type: 'number', defaultValue: 1 },
          { key: 'unit_cost', label: 'Unit Cost', type: 'money', defaultValue: 0 },
          { key: 'total', label: 'Total', type: 'calculated', readOnly: true },
          { key: 'vendor_url', label: 'Vendor URL', type: 'url', optional: true }
        ]}
      />

      {/* Section 4: Supplies & Materials */}
      <BudgetTableWidget
        title="Supplies & Materials"
        description="Materials, supplies, and equipment"
        items={materialsBudget}
        onAddItem={addMaterialsBudgetItem}
        onUpdateItem={(id, updates) => updateBudgetItem('materials_budget', id, updates)}
        onDeleteItem={(id) => deleteBudgetItem('materials_budget', id)}
        columns={[
          { key: 'item', label: 'Item', type: 'text', placeholder: 'e.g., Name tags' },
          { key: 'purpose', label: 'Purpose', type: 'text', optional: true },
          { key: 'qty', label: 'Quantity', type: 'number', defaultValue: 1 },
          { key: 'cost', label: 'Cost', type: 'money', defaultValue: 0 },
          { key: 'vendor_url', label: 'Vendor URL', type: 'url', optional: true }
        ]}
      />

      {/* Section 5: Space & Transportation */}
      <BudgetTableWidget
        title="Space & Transportation"
        description="Venue, transportation, and logistics"
        items={transportBudget}
        onAddItem={addTransportBudgetItem}
        onUpdateItem={(id, updates) => updateBudgetItem('transport_budget', id, updates)}
        onDeleteItem={(id) => deleteBudgetItem('transport_budget', id)}
        columns={[
          { key: 'item', label: 'Item', type: 'text', placeholder: 'e.g., Bus rental' },
          { key: 'description', label: 'Description', type: 'text', optional: true },
          { key: 'cost', label: 'Cost', type: 'money', defaultValue: 0 },
          { key: 'notes', label: 'Notes', type: 'text', optional: true }
        ]}
      />

      {/* Section 6: Media & Tech */}
      <BudgetTableWidget
        title="Media & Tech"
        description="Audio/visual equipment and technology"
        items={mediaBudget}
        onAddItem={addMediaBudgetItem}
        onUpdateItem={(id, updates) => updateBudgetItem('media_budget', id, updates)}
        onDeleteItem={(id) => deleteBudgetItem('media_budget', id)}
        columns={[
          { key: 'item', label: 'Item', type: 'text', placeholder: 'e.g., Microphone rental' },
          { key: 'qty', label: 'Quantity', type: 'number', defaultValue: 1 },
          { key: 'cost', label: 'Cost', type: 'money', defaultValue: 0 },
          { key: 'notes', label: 'Notes', type: 'text', optional: true }
        ]}
      />

      {/* Section 7: Promotion & Communication */}
      <BudgetTableWidget
        title="Promotion & Communication"
        description="Marketing, promotion, and communication costs"
        items={promoBudget}
        onAddItem={addPromoBudgetItem}
        onUpdateItem={(id, updates) => updateBudgetItem('promo_budget', id, updates)}
        onDeleteItem={(id) => deleteBudgetItem('promo_budget', id)}
        columns={[
          { key: 'item', label: 'Item', type: 'text', placeholder: 'e.g., Flyers' },
          { key: 'description', label: 'Description', type: 'text', optional: true },
          { key: 'cost', label: 'Cost', type: 'money', defaultValue: 0 },
          { key: 'notes', label: 'Notes', type: 'text', optional: true }
        ]}
      />

      {/* Section 8: Contingency & Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Contingency & Admin</CardTitle>
          <CardDescription>Administrative costs and contingency buffer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="misc_supplies">Miscellaneous Supplies</Label>
              <Input
                id="misc_supplies"
                type="number"
                step="0.01"
                value={formData.misc_supplies}
                onChange={(e) => handleFormChange('misc_supplies', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="admin_fees">Admin Fees / Deposits</Label>
              <Input
                id="admin_fees"
                type="number"
                step="0.01"
                value={formData.admin_fees}
                onChange={(e) => handleFormChange('admin_fees', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="contingency">Contingency Buffer (10-15%)</Label>
              <Input
                id="contingency"
                type="number"
                step="0.01"
                value={formData.contingency}
                onChange={(e) => handleFormChange('contingency', parseFloat(e.target.value) || 0)}
                min="0"
                placeholder="Auto-calculated at 10%"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 9: Income */}
      <Card>
        <CardHeader>
          <CardTitle>Income</CardTitle>
          <CardDescription>Expected income and funding sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ticket_sales">Ticket Sales</Label>
              <Input
                id="ticket_sales"
                type="number"
                step="0.01"
                value={formData.ticket_sales}
                onChange={(e) => handleFormChange('ticket_sales', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="donations">Donations / Sponsorships</Label>
              <Input
                id="donations"
                type="number"
                step="0.01"
                value={formData.donations}
                onChange={(e) => handleFormChange('donations', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="club_support">Club Budget Support</Label>
              <Input
                id="club_support"
                type="number"
                step="0.01"
                value={formData.club_support}
                onChange={(e) => handleFormChange('club_support', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 10: Auto-Calculated Summary */}
      <BudgetSummaryCard eventBudget={eventBudget} />

      {/* File Upload Section */}
      <FileUploadSection
        attachments={attachments}
        onUpload={uploadAttachment}
        eventId={eventId}
      />

      {/* Task Management Section */}
      <BudgetTaskManagement 
        eventId={eventId}
        eventName={formData.event_name}
      />

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => setShowAIHelper(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Ask AI Helper
        </Button>
        <Button onClick={handleSubmit}>
          Save Budget
        </Button>
      </div>

      {/* AI Helper Dialog */}
      {showAIHelper && (
        <BudgetAIHelper
          open={showAIHelper}
          onClose={() => setShowAIHelper(false)}
          eventData={eventBudget}
          context="Suggest vendor estimates, cost benchmarks, or missing line-items for this event."
        />
      )}
    </div>
  );
};