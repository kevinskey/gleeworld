import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MoveUp, MoveDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Announcement {
  id: string;
  newsletter_id: string | null;
  title: string;
  content: string;
  display_order: number;
}

export const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement>>({
    title: "",
    content: "",
    newsletter_id: null,
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchNewsletters();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("alumnae_newsletter_announcements")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to fetch announcements");
      return;
    }

    setAnnouncements(data || []);
  };

  const fetchNewsletters = async () => {
    const { data } = await supabase
      .from("alumnae_newsletters")
      .select("id, title, month, year")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    setNewsletters(data || []);
  };

  const handleSave = async () => {
    if (!editingAnnouncement.title || !editingAnnouncement.content) {
      toast.error("Please fill in title and content");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("alumnae_newsletter_announcements")
      .insert({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        newsletter_id: editingAnnouncement.newsletter_id,
        display_order: announcements.length,
      });

    if (error) {
      toast.error("Failed to save announcement");
    } else {
      toast.success("Announcement saved successfully");
      setEditingAnnouncement({
        title: "",
        content: "",
        newsletter_id: null,
      });
      fetchAnnouncements();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase
      .from("alumnae_newsletter_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete announcement");
    } else {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    }
  };

  const moveAnnouncement = async (id: string, direction: "up" | "down") => {
    const currentIndex = announcements.findIndex((a) => a.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === announcements.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const updatedAnnouncements = [...announcements];
    [updatedAnnouncements[currentIndex], updatedAnnouncements[newIndex]] = [
      updatedAnnouncements[newIndex],
      updatedAnnouncements[currentIndex],
    ];

    // Update display_order for both announcements
    await Promise.all([
      supabase
        .from("alumnae_newsletter_announcements")
        .update({ display_order: newIndex })
        .eq("id", updatedAnnouncements[newIndex].id),
      supabase
        .from("alumnae_newsletter_announcements")
        .update({ display_order: currentIndex })
        .eq("id", updatedAnnouncements[currentIndex].id),
    ]);

    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      {/* Add New Announcement Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editingAnnouncement.title}
                onChange={(e) =>
                  setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                }
                placeholder="e.g., Upcoming Reunion Event"
              />
            </div>

            <div className="space-y-2">
              <Label>Associated Newsletter (Optional)</Label>
              <Select
                value={editingAnnouncement.newsletter_id || "none"}
                onValueChange={(value) =>
                  setEditingAnnouncement({
                    ...editingAnnouncement,
                    newsletter_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select newsletter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {newsletters.map((newsletter) => (
                    <SelectItem key={newsletter.id} value={newsletter.id}>
                      {newsletter.title} ({newsletter.month}/{newsletter.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={editingAnnouncement.content}
              onChange={(e) =>
                setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
              }
              placeholder="Announcement details..."
              rows={5}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Announcement
          </Button>
        </CardContent>
      </Card>

      {/* Existing Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Current Announcements ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No announcements yet. Add one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement, index) => (
                <div
                  key={announcement.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{announcement.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {announcement.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveAnnouncement(announcement.id, "up")}
                      disabled={index === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveAnnouncement(announcement.id, "down")}
                      disabled={index === announcements.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
