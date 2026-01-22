import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2, Edit, GripVertical, Image, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CourseBadge {
  id: string;
  course_code: string;
  course_title: string;
  badge_image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const AcademySliderManager = () => {
  const [badges, setBadges] = useState<CourseBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    course_code: "",
    course_title: "",
    badge_image_url: "",
    link_url: "",
    display_order: 0,
    is_active: true,
  });

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academy_course_badges")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
      toast({
        title: "Error",
        description: "Failed to load course badges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `academy-badge-${Date.now()}.${fileExt}`;
      const filePath = `academy-badges/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-files")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, badge_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Badge image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.course_code || !formData.course_title) {
      toast({
        title: "Error",
        description: "Course code and title are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from("academy_course_badges")
          .update({
            course_code: formData.course_code,
            course_title: formData.course_title,
            badge_image_url: formData.badge_image_url,
            link_url: formData.link_url || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Badge updated successfully" });
      } else {
        const { error } = await supabase.from("academy_course_badges").insert({
          course_code: formData.course_code,
          course_title: formData.course_title,
          badge_image_url: formData.badge_image_url,
          link_url: formData.link_url || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Badge created successfully" });
      }

      resetForm();
      fetchBadges();
    } catch (error) {
      console.error("Error saving badge:", error);
      toast({
        title: "Error",
        description: "Failed to save badge",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (badge: CourseBadge) => {
    setEditingId(badge.id);
    setFormData({
      course_code: badge.course_code,
      course_title: badge.course_title,
      badge_image_url: badge.badge_image_url,
      link_url: badge.link_url || "",
      display_order: badge.display_order,
      is_active: badge.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;

    try {
      const { error } = await supabase
        .from("academy_course_badges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Badge deleted successfully" });
      fetchBadges();
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast({
        title: "Error",
        description: "Failed to delete badge",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      course_code: "",
      course_title: "",
      badge_image_url: "",
      link_url: "",
      display_order: badges.length,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Academy Slider Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="course_code">Course Code</Label>
              <Input
                id="course_code"
                value={formData.course_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, course_code: e.target.value }))}
                placeholder="e.g., MUS 070"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_title">Course Title</Label>
              <Input
                id="course_title"
                value={formData.course_title}
                onChange={(e) => setFormData((prev) => ({ ...prev, course_title: e.target.value }))}
                placeholder="e.g., Glee Club"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_url">Link URL (optional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, link_url: e.target.value }))}
                placeholder="/glee-academy/mus-070"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Badge Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="flex-1"
                />
                {formData.badge_image_url && (
                  <img
                    src={formData.badge_image_url}
                    alt="Badge preview"
                    className="h-16 w-auto object-contain rounded border"
                  />
                )}
              </div>
              <Input
                value={formData.badge_image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, badge_image_url: e.target.value }))}
                placeholder="Or paste image URL directly"
                className="mt-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
            <div className="flex gap-2 justify-end md:col-span-2">
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Update" : "Add"} Badge
              </Button>
            </div>
          </div>

          {/* Badges List */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Current Badges ({badges.length})</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No badges configured yet. Add your first badge above.
              </p>
            ) : (
              <div className="space-y-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      badge.is_active ? "bg-background" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    {badge.badge_image_url ? (
                      <img
                        src={badge.badge_image_url}
                        alt={badge.course_code}
                        className="h-16 w-auto object-contain rounded"
                      />
                    ) : (
                      <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{badge.course_code}</p>
                      <p className="text-sm text-muted-foreground truncate">{badge.course_title}</p>
                      {badge.link_url && (
                        <p className="text-xs text-primary truncate">{badge.link_url}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{badge.display_order}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(badge)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(badge.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
