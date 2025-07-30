import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Trash2, Save, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AuditionTimeBlock {
  id: string;
  start_date: string;
  end_date: string;
  appointment_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export const AuditionScheduleManager = () => {
  const [timeBlocks, setTimeBlocks] = useState<AuditionTimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AuditionTimeBlock | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    appointment_duration_minutes: 30
  });

  const fetchTimeBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('audition_time_blocks')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTimeBlocks(data || []);
    } catch (error) {
      console.error('Error fetching time blocks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audition time blocks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeBlocks();
  }, []);

  const resetForm = () => {
    setFormData({
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      appointment_duration_minutes: 30
    });
    setEditingBlock(null);
  };

  const openEditDialog = (block: AuditionTimeBlock) => {
    const startDate = new Date(block.start_date);
    const endDate = new Date(block.end_date);
    
    setFormData({
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: format(endDate, 'HH:mm'),
      appointment_duration_minutes: block.appointment_duration_minutes
    });
    setEditingBlock(block);
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      if (startDateTime >= endDateTime) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return;
      }

      const blockData = {
        start_date: formatISO(startDateTime),
        end_date: formatISO(endDateTime),
        appointment_duration_minutes: formData.appointment_duration_minutes,
        is_active: true
      };

      if (editingBlock) {
        const { error } = await supabase
          .from('audition_time_blocks')
          .update(blockData)
          .eq('id', editingBlock.id);

        if (error) throw error;
        toast({ title: "Success", description: "Audition time block updated successfully" });
      } else {
        const { error } = await supabase
          .from('audition_time_blocks')
          .insert([blockData]);

        if (error) throw error;
        toast({ title: "Success", description: "Audition time block created successfully" });
      }

      await fetchTimeBlocks();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving time block:', error);
      toast({
        title: "Error",
        description: "Failed to save audition time block",
        variant: "destructive"
      });
    }
  };

  const toggleBlockStatus = async (block: AuditionTimeBlock) => {
    try {
      const { error } = await supabase
        .from('audition_time_blocks')
        .update({ is_active: !block.is_active })
        .eq('id', block.id);

      if (error) throw error;
      
      await fetchTimeBlocks();
      toast({ 
        title: "Success", 
        description: `Audition time block ${block.is_active ? 'deactivated' : 'activated'}` 
      });
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast({
        title: "Error",
        description: "Failed to update time block status",
        variant: "destructive"
      });
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('audition_time_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
      
      await fetchTimeBlocks();
      toast({ title: "Success", description: "Audition time block deleted successfully" });
    } catch (error) {
      console.error('Error deleting time block:', error);
      toast({
        title: "Error",
        description: "Failed to delete time block",
        variant: "destructive"
      });
    }
  };

  const activeBlocks = timeBlocks.filter(block => block.is_active);
  const inactiveBlocks = timeBlocks.filter(block => !block.is_active);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Audition Schedule Manager
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Block
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingBlock ? 'Edit Time Block' : 'Create Time Block'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Appointment Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="120"
                      value={formData.appointment_duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointment_duration_minutes: parseInt(e.target.value) || 30 }))}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingBlock ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active Time Blocks ({activeBlocks.length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive Time Blocks ({inactiveBlocks.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active audition time blocks</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeBlocks.map((block) => (
                    <Card key={block.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">
                                {format(new Date(block.start_date), 'MMM d, yyyy h:mm a')} - 
                                {format(new Date(block.end_date), 'MMM d, yyyy h:mm a')}
                              </span>
                              <Badge variant="default">Active</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Duration: {block.appointment_duration_minutes} minutes per appointment
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(block)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBlockStatus(block)}
                            >
                              Deactivate
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteBlock(block.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inactive" className="space-y-4">
              {inactiveBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No inactive audition time blocks</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {inactiveBlocks.map((block) => (
                    <Card key={block.id} className="hover:shadow-md transition-shadow opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">
                                {format(new Date(block.start_date), 'MMM d, yyyy h:mm a')} - 
                                {format(new Date(block.end_date), 'MMM d, yyyy h:mm a')}
                              </span>
                              <Badge variant="secondary">Inactive</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Duration: {block.appointment_duration_minutes} minutes per appointment
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(block)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => toggleBlockStatus(block)}
                            >
                              Activate
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteBlock(block.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};