import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Send, Eye, Calendar, Repeat, CalendarClock } from "lucide-react";
import { useAnnouncements, CreateAnnouncementData } from "@/hooks/useAnnouncements";
import { useToast } from "@/hooks/use-toast";

export const AnnouncementManagement = () => {
  const { announcements, loading, createAnnouncement, publishAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<any | null>(null);
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: '',
    content: '',
    announcement_type: 'general',
    target_audience: 'all',
    expire_date: '',
    is_featured: false,
    is_recurring: false,
    recurrence_type: null,
    recurrence_start_date: '',
    recurrence_end_date: '',
  });
  const [recurrenceDate, setRecurrenceDate] = useState('');
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');
  const [recurrenceEndDateOnly, setRecurrenceEndDateOnly] = useState('');

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      announcement_type: 'general',
      target_audience: 'all',
      expire_date: '',
      is_featured: false,
      is_recurring: false,
      recurrence_type: null,
      recurrence_start_date: '',
      recurrence_end_date: '',
    });
    setRecurrenceDate('');
    setRecurrenceTime('09:00');
    setRecurrenceEndDateOnly('');
    setEditingAnnouncement(null);
  };

  // Combine date and time into ISO string - treat input as EST and convert to UTC
  const combineDateTime = (date: string, time: string) => {
    if (!date) return '';
    const timeStr = time || '09:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    
    // Create UTC date, adding 5 hours to convert EST to UTC
    // EST is UTC-5, so 9am EST = 2pm UTC (14:00)
    const utcHours = hours + 5;
    const utcDate = new Date(Date.UTC(year, month - 1, day, utcHours, minutes, 0));
    return utcDate.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.is_recurring && !formData.recurrence_type) {
      toast({
        title: "Error",
        description: "Please select a recurrence frequency",
        variant: "destructive",
      });
      return;
    }

    // Build submission data with combined date/time
    const submitData: CreateAnnouncementData = {
      ...formData,
      recurrence_start_date: formData.is_recurring ? combineDateTime(recurrenceDate, recurrenceTime) : '',
      recurrence_end_date: formData.is_recurring && recurrenceEndDateOnly ? combineDateTime(recurrenceEndDateOnly, '23:59') : '',
    };

    const success = editingAnnouncement 
      ? await updateAnnouncement(editingAnnouncement, submitData)
      : await createAnnouncement(submitData);

    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  // Parse UTC datetime to EST date and time
  const parseDateTime = (isoString: string) => {
    if (!isoString) return { date: '', time: '09:00' };
    const utcDate = new Date(isoString);
    // Get UTC hours and subtract 5 to get EST
    const estHours = utcDate.getUTCHours() - 5;
    const estMinutes = utcDate.getUTCMinutes();
    
    // Handle day rollover if hours go negative
    let estDate = new Date(utcDate);
    if (estHours < 0) {
      estDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000);
    }
    
    const date = `${estDate.getUTCFullYear()}-${String(estDate.getUTCMonth() + 1).padStart(2, '0')}-${String(estDate.getUTCDate()).padStart(2, '0')}`;
    const adjustedHours = estHours < 0 ? estHours + 24 : estHours;
    const time = `${String(adjustedHours).padStart(2, '0')}:${String(estMinutes).padStart(2, '0')}`;
    return { date, time };
  };

  const handleEdit = (announcement: any) => {
    // Parse existing dates to separate date and time
    const startParsed = parseDateTime(announcement.recurrence_start_date);
    const endParsed = parseDateTime(announcement.recurrence_end_date);
    
    setFormData({
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcement_type || 'general',
      target_audience: announcement.target_audience || 'all',
      expire_date: announcement.expire_date || '',
      is_featured: announcement.is_featured || false,
      is_recurring: announcement.is_recurring || false,
      recurrence_type: announcement.recurrence_type || null,
      recurrence_start_date: announcement.recurrence_start_date || '',
      recurrence_end_date: announcement.recurrence_end_date || '',
    });
    setRecurrenceDate(startParsed.date);
    setRecurrenceTime(startParsed.time);
    setRecurrenceEndDateOnly(endParsed.date);
    setEditingAnnouncement(announcement.id);
    setIsDialogOpen(true);
  };

  const handlePublish = async (id: string) => {
    await publishAnnouncement(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
    }
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'rehearsal': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-purple-100 text-purple-800';
      case 'tour': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecurrenceLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Announcement Management</CardTitle>
          <CardDescription>Create and manage announcements for the Glee Club</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Announcement Management</CardTitle>
            <CardDescription>Create and manage announcements for the Glee Club</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </DialogTitle>
                <DialogDescription>
                  Fill out the details below to create a new announcement.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Announcement title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={formData.announcement_type} 
                      onValueChange={(value) => setFormData({ ...formData, announcement_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="rehearsal">Rehearsal</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="tour">Tour</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Announcement content"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Select 
                      value={formData.target_audience} 
                      onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="members">Current Members</SelectItem>
                        <SelectItem value="alumnae">Alumnae</SelectItem>
                        <SelectItem value="executives">Executive Board</SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expireDate">Expire Date (Optional)</Label>
                    <Input
                      id="expireDate"
                      type="datetime-local"
                      value={formData.expire_date}
                      onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="featured">Featured Announcement</Label>
                </div>

                {/* Recurring Announcement Section */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        is_recurring: checked,
                        recurrence_type: checked ? 'daily' : null
                      })}
                    />
                    <Label htmlFor="recurring" className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Auto-Recurring Announcement
                    </Label>
                  </div>

                  {formData.is_recurring && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Recurrence Frequency</Label>
                        <Select 
                          value={formData.recurrence_type || ''} 
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            recurrence_type: value as 'daily' | 'weekly' | 'monthly' 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurrenceDate">Start Date</Label>
                          <Input
                            id="recurrenceDate"
                            type="date"
                            value={recurrenceDate}
                            onChange={(e) => setRecurrenceDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recurrenceTime">Time (EST)</Label>
                          <Input
                            id="recurrenceTime"
                            type="time"
                            value={recurrenceTime}
                            onChange={(e) => setRecurrenceTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recurrenceEndDate">End Date (Optional)</Label>
                          <Input
                            id="recurrenceEndDate"
                            type="date"
                            value={recurrenceEndDateOnly}
                            onChange={(e) => setRecurrenceEndDateOnly(e.target.value)}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        This announcement will appear {formData.recurrence_type} at {recurrenceTime || '9:00 AM'} EST until the end date (or indefinitely if no end date is set).
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAnnouncement ? 'Update' : 'Create'} Announcement
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No announcements yet. Create your first one!</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <Card key={announcement.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          {announcement.is_featured && (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          )}
                          {announcement.is_recurring && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/10">
                              <Repeat className="h-3 w-3" />
                              {getRecurrenceLabel(announcement.recurrence_type || '')}
                            </Badge>
                          )}
                          {announcement.announcement_type && (
                            <Badge 
                              className={`${getAnnouncementTypeColor(announcement.announcement_type)} text-xs`}
                              variant="secondary"
                            >
                              {announcement.announcement_type}
                            </Badge>
                          )}
                          {!announcement.publish_date && (
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>Audience: {announcement.target_audience || 'all'}</span>
                          {announcement.expire_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {new Date(announcement.expire_date).toLocaleDateString()}
                            </span>
                          )}
                          {announcement.is_recurring && announcement.recurrence_end_date && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              Until: {new Date(announcement.recurrence_end_date).toLocaleDateString()}
                            </span>
                          )}
                          {announcement.created_at && (
                            <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!announcement.publish_date && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(announcement.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {announcement.publish_date && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewAnnouncement(announcement)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(announcement)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(announcement.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewAnnouncement} onOpenChange={(open) => !open && setPreviewAnnouncement(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAnnouncement?.title}
              {previewAnnouncement?.is_featured && (
                <Badge variant="secondary" className="text-xs">Featured</Badge>
              )}
              {previewAnnouncement?.is_recurring && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {getRecurrenceLabel(previewAnnouncement.recurrence_type || '')}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Published {previewAnnouncement?.publish_date && new Date(previewAnnouncement.publish_date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {previewAnnouncement?.announcement_type && (
                <Badge className={`${getAnnouncementTypeColor(previewAnnouncement.announcement_type)} text-xs`}>
                  {previewAnnouncement.announcement_type}
                </Badge>
              )}
              <Badge variant="outline">Audience: {previewAnnouncement?.target_audience || 'all'}</Badge>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{previewAnnouncement?.content}</p>
            </div>
            {previewAnnouncement?.expire_date && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Expires: {new Date(previewAnnouncement.expire_date).toLocaleString()}
              </p>
            )}
            {previewAnnouncement?.is_recurring && (
              <div className="text-sm text-muted-foreground border-t pt-2">
                <p className="flex items-center gap-1">
                  <Repeat className="h-4 w-4" />
                  Recurring: {getRecurrenceLabel(previewAnnouncement.recurrence_type)}
                </p>
                {previewAnnouncement.recurrence_start_date && (
                  <p>Started: {new Date(previewAnnouncement.recurrence_start_date).toLocaleDateString()}</p>
                )}
                {previewAnnouncement.recurrence_end_date && (
                  <p>Ends: {new Date(previewAnnouncement.recurrence_end_date).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
