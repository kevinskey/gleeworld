import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MoveUp, MoveDown, Image as ImageIcon, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFileUpload } from "@/integrations/supabase/hooks/useFileUpload";

interface HeroSlide {
  id: string;
  newsletter_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
}

export const HeroManager = () => {
  const { uploadFile, uploading } = useFileUpload();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingSlide, setEditingSlide] = useState<Partial<HeroSlide>>({
    title: "",
    description: "",
    image_url: "",
    newsletter_id: null,
    display_order: 0,
  });

  useEffect(() => {
    fetchSlides();
    fetchNewsletters();
  }, []);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("alumnae_newsletter_hero_slides")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to fetch hero slides");
      return;
    }

    setSlides(data || []);
  };

  const fetchNewsletters = async () => {
    const { data } = await supabase
      .from("alumnae_newsletters")
      .select("id, title, month, year")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    setNewsletters(data || []);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setImageFile(file);
    toast.success(`${file.name} ready to upload`);
  };

  const handleSave = async () => {
    if (!imageFile && !editingSlide.image_url) {
      toast.error("Please upload an image");
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = editingSlide.image_url;

      // Upload image if one was selected
      if (imageFile) {
        const imagePath = `hero-slides/${Date.now()}-${imageFile.name}`;
        const uploadedUrl = await uploadFile(imageFile, 'alumnae-newsletters', imagePath);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          toast.success("Image uploaded successfully");
        } else {
          throw new Error("Failed to upload image");
        }
      }

      const { error } = await supabase
        .from("alumnae_newsletter_hero_slides")
        .insert({
          title: editingSlide.title || "",
          description: editingSlide.description,
          image_url: finalImageUrl,
          newsletter_id: editingSlide.newsletter_id,
          display_order: slides.length,
        });

      if (error) throw error;

      toast.success("Hero slide saved successfully");
      setEditingSlide({
        title: "",
        description: "",
        image_url: "",
        newsletter_id: null,
        display_order: 0,
      });
      setImageFile(null);
      fetchSlides();
    } catch (error: any) {
      console.error('Error saving hero slide:', error);
      toast.error(error.message || "Failed to save hero slide");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return;

    const { error } = await supabase
      .from("alumnae_newsletter_hero_slides")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete hero slide");
    } else {
      toast.success("Hero slide deleted");
      fetchSlides();
    }
  };

  const moveSlide = async (id: string, direction: "up" | "down") => {
    const currentIndex = slides.findIndex((s) => s.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === slides.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const updatedSlides = [...slides];
    [updatedSlides[currentIndex], updatedSlides[newIndex]] = [
      updatedSlides[newIndex],
      updatedSlides[currentIndex],
    ];

    // Update display_order for both slides
    await Promise.all([
      supabase
        .from("alumnae_newsletter_hero_slides")
        .update({ display_order: newIndex })
        .eq("id", updatedSlides[newIndex].id),
      supabase
        .from("alumnae_newsletter_hero_slides")
        .update({ display_order: currentIndex })
        .eq("id", updatedSlides[currentIndex].id),
    ]);

    fetchSlides();
  };

  return (
    <div className="space-y-6">
      {/* Add New Slide Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Hero Slide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Image *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="heroImageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              {imageFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageFile(null)}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {imageFile && (
              <p className="text-sm text-muted-foreground">
                Ready to upload: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {editingSlide.image_url && !imageFile && (
              <p className="text-sm text-muted-foreground">
                Current: <a href={editingSlide.image_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Image</a>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (Optional)</Label>
              <Input
                value={editingSlide.title}
                onChange={(e) =>
                  setEditingSlide({ ...editingSlide, title: e.target.value })
                }
                placeholder="e.g., Spring Concert Highlights"
              />
            </div>

            <div className="space-y-2">
              <Label>Associated Newsletter (Optional)</Label>
              <Select
                value={editingSlide.newsletter_id || "none"}
                onValueChange={(value) =>
                  setEditingSlide({
                    ...editingSlide,
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
            <Label>Call to Action / Description (Optional)</Label>
            <Textarea
              value={editingSlide.description || ""}
              onChange={(e) =>
                setEditingSlide({ ...editingSlide, description: e.target.value })
              }
              placeholder="e.g., Join us for our upcoming spring concert..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={loading || uploading} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            {loading || uploading ? "Uploading..." : "Add Hero Slide"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Slides */}
      <Card>
        <CardHeader>
          <CardTitle>Current Hero Slides ({slides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hero slides yet. Add one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="w-32 h-20 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{slide.title}</h4>
                    {slide.description && (
                      <p className="text-sm text-muted-foreground">
                        {slide.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveSlide(slide.id, "up")}
                      disabled={index === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveSlide(slide.id, "down")}
                      disabled={index === slides.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(slide.id)}
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
