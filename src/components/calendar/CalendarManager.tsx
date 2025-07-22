import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Palette, Calendar, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_visible: boolean;
  is_default: boolean;
  created_at: string;
}

export const CalendarManager = () => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6"
  });

  const colorOptions = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
  ];

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error('Error fetching calendars:', error);
      toast.error("Failed to load calendars");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCalendar) {
        const { error } = await supabase
          .from('gw_calendars')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color
          })
          .eq('id', editingCalendar.id);

        if (error) throw error;
        toast.success("Calendar updated successfully");
      } else {
        const { error } = await supabase
          .from('gw_calendars')
          .insert({
            name: formData.name,
            description: formData.description || null,
            color: formData.color
          });

        if (error) throw error;
        toast.success("Calendar created successfully");
      }

      setIsDialogOpen(false);
      setEditingCalendar(null);
      setFormData({ name: "", description: "", color: "#3b82f6" });
      fetchCalendars();
    } catch (error) {
      console.error('Error saving calendar:', error);
      toast.error("Failed to save calendar");
    }
  };

  const toggleVisibility = async (calendar: Calendar) => {
    try {
      const { error } = await supabase
        .from('gw_calendars')
        .update({ is_visible: !calendar.is_visible })
        .eq('id', calendar.id);

      if (error) throw error;
      toast.success(`Calendar ${calendar.is_visible ? 'hidden' : 'shown'}`);
      fetchCalendars();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error("Failed to update calendar visibility");
    }
  };

  const deleteCalendar = async (calendar: Calendar) => {
    if (calendar.is_default) {
      toast.error("Cannot delete the default calendar");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${calendar.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Check if calendar has events
      const { data: events } = await supabase
        .from('gw_events')
        .select('id')
        .eq('calendar_id', calendar.id)
        .limit(1);

      if (events && events.length > 0) {
        toast.error("Cannot delete calendar with existing events. Move events to another calendar first.");
        return;
      }

      const { error } = await supabase
        .from('gw_calendars')
        .delete()
        .eq('id', calendar.id);

      if (error) throw error;
      toast.success("Calendar deleted successfully");
      fetchCalendars();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast.error("Failed to delete calendar");
    }
  };

  const openEditDialog = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setFormData({
      name: calendar.name,
      description: calendar.description || "",
      color: calendar.color
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCalendar(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading calendars...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Management</h2>
          <p className="text-muted-foreground">
            Create and manage calendars to organize your events
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Calendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCalendar ? 'Edit Calendar' : 'Create New Calendar'}
              </DialogTitle>
              <DialogDescription>
                {editingCalendar 
                  ? 'Update the calendar details below.'
                  : 'Create a new calendar to organize your events.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Calendar Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter calendar name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter calendar description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCalendar ? 'Update Calendar' : 'Create Calendar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {calendars.map((calendar) => (
          <Card key={calendar.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <CardTitle className="text-lg">{calendar.name}</CardTitle>
                  {calendar.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleVisibility(calendar)}
                  >
                    {calendar.is_visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(calendar)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!calendar.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCalendar(calendar)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {calendar.description && (
                <CardDescription className="text-sm">
                  {calendar.description}
                </CardDescription>
              )}
              <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                <span>{calendar.is_visible ? 'Visible' : 'Hidden'}</span>
                <span>Created {new Date(calendar.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};