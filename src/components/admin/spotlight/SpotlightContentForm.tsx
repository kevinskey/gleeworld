import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSpotlightContent, SpotlightContent } from "@/hooks/useSpotlightContent";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpotlightContentFormProps {
  content?: SpotlightContent | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
}

export const SpotlightContentForm = ({ content, onSuccess, onCancel }: SpotlightContentFormProps) => {
  const { createSpotlight, updateSpotlight } = useSpotlightContent();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    spotlight_type: 'news',
    featured_person_id: '',
    featured_event_id: '',
    image_url: '',
    external_link: '',
    is_active: true,
    is_featured: false,
    display_order: 0,
    publish_date: new Date()
  });

  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const spotlightTypes = [
    { value: 'member', label: 'Member Spotlight' },
    { value: 'event', label: 'Event Highlight' },
    { value: 'achievement', label: 'Achievement' },
    { value: 'news', label: 'News & Updates' },
    { value: 'alumni', label: 'Alumni Feature' },
    { value: 'performance', label: 'Performance' }
  ];

  useEffect(() => {
    // Load users and events for selection
    loadUsers();
    loadEvents();

    if (content) {
      setFormData({
        title: content.title,
        description: content.description || '',
        content: content.content || '',
        spotlight_type: content.spotlight_type,
        featured_person_id: content.featured_person_id || '',
        featured_event_id: content.featured_event_id || '',
        image_url: content.image_url || '',
        external_link: content.external_link || '',
        is_active: content.is_active,
        is_featured: content.is_featured,
        display_order: content.display_order,
        publish_date: new Date(content.publish_date)
      });
    }
  }, [content]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data?.map(u => ({ id: u.user_id, full_name: u.full_name, email: u.email })) || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date')
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Error loading events:', err);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `spotlight-${Math.random()}.${fileExt}`;
      const filePath = `spotlight-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (err: any) {
      console.error('Error uploading image:', err);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        publish_date: format(formData.publish_date, 'yyyy-MM-dd'),
        created_by: user.id,
        featured_person_id: formData.featured_person_id || null,
        featured_event_id: formData.featured_event_id || null,
        image_url: formData.image_url || null,
        external_link: formData.external_link || null
      };

      if (content) {
        await updateSpotlight(content.id, submitData);
      } else {
        await createSpotlight(submitData);
      }

      onSuccess();
    } catch (err: any) {
      // Error handling done in the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter the main details for this spotlight content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter spotlight title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spotlight_type">Type *</Label>
              <Select
                value={formData.spotlight_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, spotlight_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spotlight type" />
                </SelectTrigger>
                <SelectContent>
                  {spotlightTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description or subtitle"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Full content or article text"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured Associations</CardTitle>
          <CardDescription>
            Link this spotlight to specific people or events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="featured_person">Featured Person</Label>
              <Select
                value={formData.featured_person_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, featured_person_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured_event">Featured Event</Label>
              <Select
                value={formData.featured_event_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, featured_event_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} ({format(new Date(event.start_date), 'MMM d, yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media & Links</CardTitle>
          <CardDescription>
            Add images and external links to enhance the spotlight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            </div>
            {formData.image_url && (
              <div className="mt-2 relative inline-block">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded border"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_link">External Link</Label>
            <Input
              id="external_link"
              type="url"
              value={formData.external_link}
              onChange={(e) => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing Settings</CardTitle>
          <CardDescription>
            Control when and how this content appears
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publish_date">Publish Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.publish_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.publish_date ? (
                      format(formData.publish_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.publish_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, publish_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : content ? 'Update Spotlight' : 'Create Spotlight'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};