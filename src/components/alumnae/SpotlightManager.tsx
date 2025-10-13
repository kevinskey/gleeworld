import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Spotlight {
  id: string;
  newsletter_id: string | null;
  spotlight_type: string;
  name: string;
  title: string | null;
  description: string | null;
  photo_url: string | null;
  display_order: number;
}

export const SpotlightManager = () => {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSpotlight, setEditingSpotlight] = useState<Partial<Spotlight>>({
    name: "",
    title: "",
    description: "",
    photo_url: "",
    spotlight_type: "alumnae",
    newsletter_id: null,
  });

  useEffect(() => {
    fetchSpotlights();
    fetchNewsletters();
  }, []);

  const fetchSpotlights = async () => {
    const { data, error } = await supabase
      .from("alumnae_newsletter_spotlights")
      .select("*")
      .order("spotlight_type")
      .order("display_order");

    if (error) {
      toast.error("Failed to fetch spotlights");
      return;
    }

    setSpotlights(data || []);
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
    if (!editingSpotlight.name || !editingSpotlight.spotlight_type) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("alumnae_newsletter_spotlights")
      .insert({
        name: editingSpotlight.name,
        title: editingSpotlight.title,
        description: editingSpotlight.description,
        photo_url: editingSpotlight.photo_url,
        spotlight_type: editingSpotlight.spotlight_type,
        newsletter_id: editingSpotlight.newsletter_id,
        display_order: spotlights.filter(
          (s) => s.spotlight_type === editingSpotlight.spotlight_type
        ).length,
      });

    if (error) {
      toast.error("Failed to save spotlight");
    } else {
      toast.success("Spotlight saved successfully");
      setEditingSpotlight({
        name: "",
        title: "",
        description: "",
        photo_url: "",
        spotlight_type: "alumnae",
        newsletter_id: null,
      });
      fetchSpotlights();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spotlight?")) return;

    const { error } = await supabase
      .from("alumnae_newsletter_spotlights")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete spotlight");
    } else {
      toast.success("Spotlight deleted");
      fetchSpotlights();
    }
  };

  const groupedSpotlights = spotlights.reduce((acc, spotlight) => {
    const type = spotlight.spotlight_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(spotlight);
    return acc;
  }, {} as Record<string, Spotlight[]>);

  return (
    <div className="space-y-6">
      {/* Add New Spotlight Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Spotlight
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Spotlight Type *</Label>
              <Select
                value={editingSpotlight.spotlight_type}
                onValueChange={(value) =>
                  setEditingSpotlight({ ...editingSpotlight, spotlight_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumnae">Alumnae Spotlight</SelectItem>
                  <SelectItem value="student">Student Spotlight</SelectItem>
                  <SelectItem value="faculty">Faculty Spotlight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Associated Newsletter (Optional)</Label>
              <Select
                value={editingSpotlight.newsletter_id || "none"}
                onValueChange={(value) =>
                  setEditingSpotlight({
                    ...editingSpotlight,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editingSpotlight.name}
                onChange={(e) =>
                  setEditingSpotlight({ ...editingSpotlight, name: e.target.value })
                }
                placeholder="e.g., Dr. Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label>Title/Position</Label>
              <Input
                value={editingSpotlight.title || ""}
                onChange={(e) =>
                  setEditingSpotlight({ ...editingSpotlight, title: e.target.value })
                }
                placeholder="e.g., Class of 2015, Opera Singer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Photo URL</Label>
            <Input
              value={editingSpotlight.photo_url || ""}
              onChange={(e) =>
                setEditingSpotlight({ ...editingSpotlight, photo_url: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={editingSpotlight.description || ""}
              onChange={(e) =>
                setEditingSpotlight({ ...editingSpotlight, description: e.target.value })
              }
              placeholder="Brief description of their achievements or story"
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Spotlight
          </Button>
        </CardContent>
      </Card>

      {/* Existing Spotlights by Type */}
      {Object.entries(groupedSpotlights).map(([type, typeSpotlights]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="capitalize">
              {type} Spotlights ({typeSpotlights.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeSpotlights.map((spotlight) => (
                <div
                  key={spotlight.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  {spotlight.photo_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={spotlight.photo_url}
                        alt={spotlight.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{spotlight.name}</h4>
                    {spotlight.title && (
                      <p className="text-sm text-muted-foreground">{spotlight.title}</p>
                    )}
                    {spotlight.description && (
                      <p className="text-sm mt-2">{spotlight.description}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(spotlight.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {spotlights.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <p>No spotlights yet. Add one above!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
