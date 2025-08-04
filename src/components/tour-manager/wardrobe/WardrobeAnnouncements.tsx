import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MessageSquare, Send, Calendar, AlertCircle, Users, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: string;
  target_audience: string;
  target_user_ids?: string[];
  voice_sections?: string[];
  scheduled_send_date?: string;
  sent_at?: string;
  is_urgent: boolean;
  auto_remind: boolean;
  created_at: string;
  image_url?: string;
}

const announcementTypes = {
  general: 'General',
  return_reminder: 'Return Reminder',
  new_inventory: 'New Inventory',
  maintenance: 'Maintenance'
};

const voiceSections = [
  'Soprano I',
  'Soprano II', 
  'Alto I',
  'Alto II'
];

export const WardrobeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    announcement_type: 'general',
    target_audience: 'all_members',
    target_emails: '',
    voice_sections: [] as string[],
    scheduled_send_date: '',
    is_urgent: false,
    auto_remind: false
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_wardrobe_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('wardrobe-announcements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe-announcements')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      // Convert target emails to user IDs if needed
      let targetUserIds = null;
      if (announcementForm.target_audience === 'specific_checkout' && announcementForm.target_emails) {
        const emails = announcementForm.target_emails.split(',').map(email => email.trim());
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .in('email', emails);
        
        targetUserIds = profiles?.map(p => p.user_id) || [];
      }

      const { error } = await supabase
        .from('gw_wardrobe_announcements')
        .insert({
          title: announcementForm.title,
          message: announcementForm.message,
          announcement_type: announcementForm.announcement_type,
          target_audience: announcementForm.target_audience,
          target_user_ids: targetUserIds,
          voice_sections: announcementForm.voice_sections.length > 0 ? announcementForm.voice_sections : null,
          scheduled_send_date: announcementForm.scheduled_send_date || null,
          is_urgent: announcementForm.is_urgent,
          auto_remind: announcementForm.auto_remind,
          created_by: user.id,
          image_url: imageUrl
        });

      if (error) throw error;

      toast.success('Announcement created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setUploading(false);
    }
  };

  const handleSendAnnouncement = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('gw_wardrobe_announcements')
        .update({
          sent_at: new Date().toISOString()
        })
        .eq('id', announcementId);

      if (error) throw error;

      toast.success('Announcement sent');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    }
  };

  const resetForm = () => {
    setAnnouncementForm({
      title: '',
      message: '',
      announcement_type: 'general',
      target_audience: 'all_members',
      target_emails: '',
      voice_sections: [],
      scheduled_send_date: '',
      is_urgent: false,
      auto_remind: false
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleVoiceSectionChange = (section: string, checked: boolean) => {
    if (checked) {
      setAnnouncementForm({
        ...announcementForm,
        voice_sections: [...announcementForm.voice_sections, section]
      });
    } else {
      setAnnouncementForm({
        ...announcementForm,
        voice_sections: announcementForm.voice_sections.filter(s => s !== section)
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading announcements...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Wardrobe Communications</h3>
          <p className="text-sm text-muted-foreground">
            Send announcements and reminders to members
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  placeholder="Announcement title..."
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
                  placeholder="Your announcement message..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Image (optional)</Label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-4">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <Label 
                          htmlFor="image-upload" 
                          className="cursor-pointer text-sm text-primary hover:underline"
                        >
                          Click to upload an image
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    </div>
                  )}
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Announcement Type</Label>
                  <Select 
                    value={announcementForm.announcement_type} 
                    onValueChange={(value) => setAnnouncementForm({...announcementForm, announcement_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(announcementTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Target Audience</Label>
                  <Select 
                    value={announcementForm.target_audience} 
                    onValueChange={(value) => setAnnouncementForm({...announcementForm, target_audience: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_members">All Members</SelectItem>
                      <SelectItem value="specific_checkout">Specific Members</SelectItem>
                      <SelectItem value="voice_sections">Voice Sections</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {announcementForm.target_audience === 'specific_checkout' && (
                <div>
                  <Label>Target Member Emails (comma-separated)</Label>
                  <Textarea
                    value={announcementForm.target_emails}
                    onChange={(e) => setAnnouncementForm({...announcementForm, target_emails: e.target.value})}
                    placeholder="email1@example.com, email2@example.com"
                    rows={2}
                  />
                </div>
              )}

              {announcementForm.target_audience === 'voice_sections' && (
                <div>
                  <Label>Voice Sections</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {voiceSections.map(section => (
                      <div key={section} className="flex items-center space-x-2">
                        <Checkbox
                          id={section}
                          checked={announcementForm.voice_sections.includes(section)}
                          onCheckedChange={(checked) => handleVoiceSectionChange(section, !!checked)}
                        />
                        <Label htmlFor={section} className="text-sm">{section}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Scheduled Send Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={announcementForm.scheduled_send_date}
                  onChange={(e) => setAnnouncementForm({...announcementForm, scheduled_send_date: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to send immediately
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="urgent"
                    checked={announcementForm.is_urgent}
                    onCheckedChange={(checked) => setAnnouncementForm({...announcementForm, is_urgent: !!checked})}
                  />
                  <Label htmlFor="urgent">Mark as urgent</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-remind"
                    checked={announcementForm.auto_remind}
                    onCheckedChange={(checked) => setAnnouncementForm({...announcementForm, auto_remind: !!checked})}
                  />
                  <Label htmlFor="auto-remind">Enable automatic reminders</Label>
                </div>
              </div>

              <Button onClick={handleCreateAnnouncement} className="w-full" disabled={uploading}>
                {uploading ? "Creating..." : "Create Announcement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map(announcement => (
          <Card key={announcement.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {announcement.title}
                    {announcement.is_urgent && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Urgent
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">
                      {announcementTypes[announcement.announcement_type as keyof typeof announcementTypes]}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {announcement.target_audience.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {announcement.sent_at ? (
                    <Badge className="bg-green-100 text-green-800">
                      Sent {new Date(announcement.sent_at).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendAnnouncement(announcement.id)}
                      className="flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Send Now
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm">{announcement.message}</p>
                
                {announcement.image_url && (
                  <div className="mt-3">
                    <img 
                      src={announcement.image_url} 
                      alt="Announcement" 
                      className="w-full max-w-md h-48 object-cover rounded-md border"
                    />
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {announcement.scheduled_send_date && !announcement.sent_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Scheduled: {new Date(announcement.scheduled_send_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {announcement.voice_sections && announcement.voice_sections.length > 0 && (
                    <div>
                      <span className="font-medium">Target Sections: </span>
                      {announcement.voice_sections.join(', ')}
                    </div>
                  )}
                  
                  {announcement.auto_remind && (
                    <div className="text-blue-600">
                      Auto-reminders enabled
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first announcement to communicate with members
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};