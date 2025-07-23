import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Upload, X, Image as ImageIcon } from "lucide-react";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
}

interface StoryImage {
  id: string;
  file: File;
  preview: string;
}

export const AddStoryDialog = ({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [images, setImages] = useState<StoryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        setImages(prev => [...prev, { id, file, preview }]);
      }
    });
    // Reset input
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const uploadImages = async (storyId: string) => {
    if (images.length === 0) return;

    setUploadingImages(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const uploadPromises = images.map(async (image, index) => {
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${user.id}/${storyId}/image-${index + 1}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('story-images')
          .upload(fileName, image.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('story-images')
          .getPublicUrl(fileName);

        // Save image metadata to story_images table
        const { error: insertError } = await supabase
          .from('story_images')
          .insert({
            story_id: storyId,
            image_url: publicUrl,
            image_name: image.file.name,
            file_size: image.file.size,
            display_order: index,
            created_by: user.id
          });

        if (insertError) throw insertError;

        return publicUrl;
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add a story");
        return;
      }

      const { data: newStory, error } = await supabase
        .from("alumnae_stories")
        .insert({
          title,
          content,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          user_id: user.id,
          is_approved: false, // Stories need admin approval
        })
        .select('id')
        .single();

      if (error) throw error;

      // Upload images if any were selected
      if (images.length > 0 && newStory) {
        await uploadImages(newStory.id);
      }

      toast.success("Your story has been submitted for review!");
      setTitle("");
      setContent("");
      setGraduationYear("");
      setImages([]);
      // Clean up image previews
      images.forEach(img => URL.revokeObjectURL(img.preview));
      onOpenChange(false);
      onStoryAdded();
    } catch (error) {
      console.error("Error adding story:", error);
      toast.error("Failed to submit your story. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Share Your Story
          </DialogTitle>
          <DialogDescription>
            Share your Spelman Glee Club experience with future generations. Stories are reviewed before being published.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your story a meaningful title..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="graduation-year">Graduation Year (Optional)</Label>
              <Input
                id="graduation-year"
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g., 2020"
                min="1881"
                max={new Date().getFullYear() + 10}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Your Story</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell us about your time in the Glee Club, memorable performances, friendships made, or how the experience shaped you..."
                className="min-h-[120px]"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Images (Optional)</Label>
              <div className="space-y-3">
                {/* Image Upload Button */}
                <div className="flex items-center gap-2">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImages}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Images
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {images.length} image{images.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                
                {/* Image Preview Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-square rounded-md overflow-hidden border border-border">
                          <img
                            src={image.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {image.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Story"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};